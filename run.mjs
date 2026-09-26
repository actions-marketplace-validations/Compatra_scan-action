// The composite action's own step. action.yml has installed the published `compatra` package
// (at the exact version this release was tested with) and points COMPATRA_DIST at its dist/. This
// file uses that package's modules directly rather than its command line, so it runs one scan,
// prints the human report to the log and writes a markdown summary: one scan, not two, so a
// project with several vendors isn't fetching each vendor's spec twice over the network for the
// sake of two output formats.
//
// With `verify: true` it then runs the project's own tests with each flagged endpoint simulated
// as gone, reusing this scan's endpoints rather than scanning again.
//
// The modules it imports are internals of `compatra`, not a public API, which is why action.yml
// pins one exact version. Move that pin, and run the self-test, together with this file.
import { appendFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const dist = process.env.COMPATRA_DIST;
if (!dist) {
  console.error("COMPATRA_DIST is not set: the install step of action.yml did not run.");
  process.exit(1);
}
const load = (file) => import(pathToFileURL(path.join(dist, file)).href);
const { scanProject } = await load("scan.js");
const { formatReport, formatVerifyReport, makePaint } = await load("report.js");
const { uniqueEndpoints, verifyProject } = await load("verify.js");

const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
const target = path.resolve(workspace, process.env.INPUT_PATH || ".");
const failOnFinding = (process.env.INPUT_FAIL_ON_FINDING ?? "true") !== "false";
const verifyEnabled = process.env.INPUT_VERIFY === "true";
const failOnBroken = (process.env.INPUT_FAIL_ON_BROKEN ?? "true") !== "false";
const testCommand = process.env.INPUT_TEST_COMMAND || "npm test";
const anyHost = process.env.INPUT_ANY_HOST === "true";
const timeoutSeconds = Number(process.env.INPUT_VERIFY_TIMEOUT || 600);
const summaryFile = process.env.GITHUB_STEP_SUMMARY;

let result;
try {
  result = await scanProject(target);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const hint = message.includes("package.json")
    ? `No package.json found in ${target}. Set the "path" input if your project isn't at the repo root.`
    : message;
  console.error(`\n  ${hint}\n`);
  process.exitCode = 1;
  process.exit();
}

console.log(formatReport(result, makePaint(false)));

let verification = null;
if (verifyEnabled && result.hits.length > 0) {
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
    console.error(`\n  verify-timeout must be a number of seconds, got "${process.env.INPUT_VERIFY_TIMEOUT}".\n`);
    process.exitCode = 1;
    process.exit();
  }
  verification = await verifyProject({
    root: target,
    testCommand,
    endpoints: uniqueEndpoints(result.hits),
    anyHost,
    timeoutMs: timeoutSeconds * 1000,
  });
  console.log(formatVerifyReport(verification, makePaint(false)));
}

const VERDICT_ICON = { broken: "❌", handled: "✅", unexercised: "➖", inconclusive: "❔" };

if (summaryFile) {
  const lines = ["### Compatra scan", ""];
  if (result.dependencies.length === 0) {
    lines.push("No supported vendor SDKs found (Stripe, OpenAI, GitHub, Twilio, Shopify).");
  } else if (result.hits.length > 0) {
    lines.push(`⚠️ **${result.hits.length} call site(s) may use a deprecated endpoint**`, "", "| File | Call | Endpoint |", "|---|---|---|");
    for (const h of result.hits) {
      lines.push(`| \`${h.filePath}:${h.line}\` | \`${h.snippet}\` | \`${h.endpoint}\` (${h.vendor}) |`);
    }
    lines.push("", "_Worth a look, not proof — matching is by SDK method name against the endpoint's path._");
  } else if (result.checked.length > 0) {
    lines.push(`✅ No call site uses an endpoint deprecated by ${result.checked.map((c) => c.vendor).join(", ")}.`);
  } else {
    lines.push("Nothing could be call-checked in this project yet.");
  }
  if (result.unsupported.length > 0) {
    lines.push("", `_Not call-checked: ${result.unsupported.join(", ")}._`);
  }
  if (result.specError) {
    lines.push("", `⚠️ _Could not reach every vendor spec, so this result is incomplete: ${result.specError}_`);
  }

  if (verification) {
    lines.push("", "### Do your tests notice? (`" + testCommand + "`)", "");
    if (verification.baseline && !verification.baseline.passed) {
      lines.push(
        verification.baseline.timedOut
          ? "Your tests timed out before any failure was simulated."
          : "Your tests fail as they are, so nothing was simulated. Fix the suite first; a failing run proves nothing.",
      );
    } else {
      lines.push("| Endpoint | Result | What it means |", "|---|---|---|");
      for (const v of verification.verdicts) {
        lines.push(`| \`${v.endpoint}\` (${v.vendor}) | ${VERDICT_ICON[v.verdict]} ${v.verdict} | ${v.reason} |`);
      }
      for (const s of verification.skipped) {
        lines.push(`| \`${s.endpoint}\` (${s.vendor}) | ➖ skipped | no HTTP model for this vendor yet |`);
      }
      lines.push("", "_The simulated failure is an HTTP 404 on that one endpoint. It shows whether your suite would notice; it does not prove your code is correct._");
    }
  }
  await appendFile(summaryFile, lines.join("\n") + "\n");
}

const broken = verification ? verification.verdicts.filter((v) => v.verdict === "broken").length : 0;
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `findings=${result.hits.length}\nbroken=${broken}\n`);
}

if (failOnFinding && result.hits.length > 0) process.exitCode = 1;
if (failOnBroken && broken > 0) process.exitCode = 1;
// A suite that is red or times out before we can simulate anything leaves no verdict; say so loudly.
if (failOnBroken && verification?.baseline && !verification.baseline.passed) process.exitCode = 1;
