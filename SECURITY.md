# Security policy

## Reporting a vulnerability

Please report security problems privately, not in a public issue or pull request.

Open the repository's **Security** tab and choose **Report a vulnerability**. If that option is not
available to you, open an issue that says only "I have a security report" and no details, and a
private channel will be arranged from there.

Include what you found, how to reproduce it, and what you think the impact is.

## What to expect

This is a small project with one maintainer. The aim is to acknowledge a report within 5 business
days, say whether it is accepted, and fix confirmed issues in order of severity. Please allow a
reasonable time to fix before disclosing publicly. Credit is given if you want it. Good-faith
research is welcome; please do not access data that is not yours or test against other people's
repositories.

## Scope

- This action: how it handles its inputs, what it runs, and what it installs. It installs the
  published `compatra` package at one exact version and skips install scripts; it runs your own test
  command only when you turn `verify` on.
- The `compatra` command-line tool it uses, published on npm.

The action analyses your code on your runner and sends nothing to Compatra. The only network use is
each vendor's public API specification and the npm install.

## Supported versions

The latest `v1` release.
