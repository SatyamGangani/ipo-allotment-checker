# Contributing

Thank you for taking an interest in improving IPO Check.

## Before you start

- Read the [README](README.md) to understand the application.
- Read [PRIVACY.md](PRIVACY.md). Never use real PANs or other personal information in issues, commits, fixtures, screenshots, or test output.
- Read the [Code of Conduct](CODE_OF_CONDUCT.md).
- Review [LICENSING.md](LICENSING.md). This repository currently has no license, and its upstream provenance is still being clarified. Do not assume that public visibility grants reuse rights.

## Report a bug or propose a feature

1. Search existing issues to avoid duplicates.
2. Use the relevant GitHub issue form.
3. Include reproducible steps, expected behavior, and actual behavior.
4. Include browser/OS and relevant error messages, after removing secrets and personal information.
5. For registrar failures, include the registrar name, IPO name, approximate time, and a redacted response/error. Never include a PAN.

## Development setup

Requirements: Node.js 24 and npm.

```bash
git clone https://github.com/SatyamGangani/ipo-allotment-checker.git
cd ipo-allotment-checker
npm ci
npm run dev
```

## Checks before submitting

Run the same checks used by continuous integration:

```bash
npm run lint
npm test
npm run build
```

If a check fails, include the failure details in your pull request and explain why it is unrelated or what remains to be fixed.

## Pull request guidance

- Keep each pull request focused on one change.
- Explain the user problem and the chosen solution.
- Include before/after screenshots for meaningful UI changes, with all personal data redacted.
- Add or update tests when behavior changes.
- Update documentation when setup, privacy/data flows, registrar support, or user-visible behavior changes.
- Avoid unrelated formatting or refactoring.
- Do not add credentials, API keys, cookies, real PANs, or private registrar responses.
- Do not claim a registrar integration works unless it has been verified against an appropriate test or official flow.

## Adding or changing a registrar adapter

- Follow the existing adapter interface and registry pattern.
- Normalize results into the application's shared allotment status model.
- Treat network failures, CAPTCHA, bot protection, and unexpected responses as errors/manual checks, never as confirmed `Not Allotted`.
- Use request timeouts and avoid aggressive concurrency.
- Document the official source and any limitations.
- Add tests for successful responses, empty responses, malformed responses, timeouts, and error mapping.

## Review process

Maintainers may request changes, tests, or clarification before merging. A pull request is not considered accepted until it is merged by a maintainer.
