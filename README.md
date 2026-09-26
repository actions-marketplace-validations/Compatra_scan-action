# Compatra scan

A GitHub Action that finds third-party API calls in your code that use an endpoint the vendor has
already deprecated, and can check whether your own tests would notice if one of them disappeared.

It runs on your runner. Your code is never uploaded. The only network use is downloading each
vendor's public API specification and installing the [`compatra`](https://www.npmjs.com/package/compatra)
package from npm.

Supports Stripe, OpenAI, GitHub, Twilio and Shopify SDKs in JavaScript and TypeScript projects.

## Usage

```yaml
- uses: actions/checkout@v4
- uses: Compatra/scan-action@v1
  with:
    path: .                    # optional, defaults to the repo root
    fail-on-finding: "true"    # optional, "false" warns without failing the build
```

Pin to a commit SHA if you want the run to be immune to a moved tag:

```yaml
- uses: Compatra/scan-action@<full commit sha>   # v1.0.0
```

## Verify: does your test suite notice?

```yaml
- uses: actions/checkout@v4
- run: npm ci                  # your tests need their dependencies installed first
- uses: Compatra/scan-action@v1
  with:
    verify: "true"
    test-command: npm test     # optional, this is the default
```

With `verify: "true"`, when the scan finds a deprecated call the action also runs **your own test
command**, once as it is and once per flagged endpoint with that endpoint answering `404`, and
reports what each run shows: `broken`, `handled`, `unexercised` or `inconclusive`. Your tests run on
your runner and nothing is uploaded.

The step fails when a simulated failure breaks your tests, or when your tests do not pass to begin
with (a failing run proves nothing). Set `fail-on-broken: "false"` to report without failing.

What it does **not** show: that your code is correct. It shows whether your suite would notice a
removal. It sees requests made through `http`, `https` or `fetch`, so a test that mocks the SDK
itself reports `unexercised`.

**Node version.** The action installs Node (`node-version`, default 22) with `actions/setup-node`,
which stays in effect for the rest of the job, and your tests run under it. Verification needs Node
22 or newer. If your project targets an older Node, run this step last and expect the tests to use
22, or leave `verify` off.

## Inputs

| Input | Default | Meaning |
|---|---|---|
| `path` | `.` | Path to scan, relative to your checkout. |
| `fail-on-finding` | `true` | Fail the step when a deprecated endpoint is in use. |
| `node-version` | `22` | Node.js version to run the scan with (verify needs 22+). Stays in effect for later steps. |
| `verify` | `false` | Also run your tests with each flagged endpoint simulated as gone. |
| `test-command` | `npm test` | Your test command, run from `path`. |
| `fail-on-broken` | `true` | With verify: fail when a simulated failure breaks your tests, or your tests are red to begin with. |
| `any-host` | `false` | With verify: match the endpoint on any host, for tests that point an SDK at stripe-mock or a local proxy. |
| `verify-timeout` | `600` | Seconds allowed for each run of your tests. |

## Outputs

| Output | Meaning |
|---|---|
| `findings` | Number of call sites that may use a deprecated endpoint. |
| `broken` | With verify: how many flagged endpoints broke your tests when simulated as gone. |

## What it does

1. Installs Node, then the `compatra` package from npm at the exact version this release was tested
   with. Install scripts are skipped.
2. Runs one scan against `path` in your checkout. Your checkout is not modified.
3. Prints the report to the job log and a table to the job summary.
4. Sets `findings` and, unless `fail-on-finding` is `"false"`, fails the step when it is not zero.
5. With `verify`, runs your tests as described above and sets `broken`.

A hit is worth a look, not proof: calls are matched to endpoints by SDK method name. The action
never claims an all-clear for a vendor it could not actually check (an unsupported vendor, or a spec
that could not be downloaded); the report says so instead.

## Versions

`v1` is a moving tag that follows the latest `v1.x.y` release. Each release pins one exact version
of `compatra`, so a release behaves the same every time it runs. Releases are listed on the
[Releases](../../releases) page.

## Self-test

`.github/workflows/self-test.yml` runs this action under the real Actions runtime against four
fixtures in `fixtures/`: a project with a real, currently deprecated Stripe call (the step must fail
with `findings=1`), a clean one (must pass with `findings=0`), and two whose tests genuinely reach
the flagged endpoint over HTTP (one must report `broken=1`, one `broken=0`). It runs on every change
and weekly.

## Security

See [SECURITY.md](SECURITY.md) to report a vulnerability.

## License

MIT
