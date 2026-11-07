# IPO Check

A browser-first Indian IPO allotment checker for managing multiple family profiles and checking allotment results across supported registrars. The app also includes IPO discovery, live GMP information, a listing gain calculator, and QR-based profile transfer.

> **Project status:** This repository is publicly visible, but it is not currently licensed for reuse. See [LICENSING.md](LICENSING.md) before copying, modifying, or redistributing any part of the project.

## Features

- **Family profiles:** Save names and PAN profiles in the browser for repeat checks.
- **PAN validation:** Normalize and validate PAN format, prevent duplicates, and mask PANs in the interface.
- **Multi-profile checks:** Check configured profiles with bounded concurrency and per-profile progress.
- **Explicit result states:** Distinguish allotted, not allotted, not applied, not yet available, manual verification, and lookup errors.
- **IPO discovery:** Load current and historical IPO records from supported data sources.
- **Registrar adapters:** Use automated checks where implemented and direct manual portal fallbacks where CAPTCHA, bot protection, or interactive verification prevents automation.
- **GMP and listing information:** Display market snapshot information and listing performance where data is available.
- **QR profile transfer:** Export and import selected profiles between browsers/devices.

Registrar availability and external endpoints can change without notice. An automated result is only as reliable as the response returned by the relevant registrar.

## Registrar support

The current implementation documents the following integration state:

| Registrar / source | Current mode | Notes |
|---|---|---|
| MUFG Intime (Link Intime) | Automated | Uses the registrar's PAN lookup endpoint |
| Alankit | Automated | Uses the registrar's JSON lookup endpoint |
| KFin Technologies | Manual fallback | Portal uses CAPTCHA-protected verification |
| Bigshare Services | Manual fallback | Portal uses session/CAPTCHA verification |
| BSE India | Manual fallback | Automated requests are blocked by bot protection |
| NSE India | Manual fallback | Requires additional verification / investor login |
| Skyline Financial | Manual fallback | Interactive session form |
| Purva Sharegistry | Manual fallback | Interactive query form |

This table describes the code's documented integration status, not a guarantee that a registrar endpoint is currently online.

## Tech stack

- React 19 and TypeScript
- Vite
- Tailwind CSS
- Node.js API handlers for registrar/data-source requests
- Vitest and Testing Library
- Vercel deployment configuration

## Getting started

### Requirements

- Node.js 24 (recommended for the current toolchain)
- npm

### Install dependencies

```bash
npm ci
```

### Start the development server

```bash
npm run dev
```

Vite starts the application locally (normally at `http://localhost:5173`). The development middleware also exposes the API handlers.

### Run checks

```bash
npm run lint
npm test
npm run build
```

### Run the standalone server

```bash
npm run build
npm start
```

The standalone server listens on port 3000 by default. See `server/standalone.mjs` for its runtime configuration.

## Project structure

```text
api/                 Serverless API handlers for IPOs, allotment checks, and GMP
server/              Development middleware and standalone server
src/components/      React UI components
src/services/        Browser services and registrar adapters
src/types/           Shared TypeScript models and validation
tests/               Unit and component tests
.github/             Contribution templates and CI workflow
```

## Privacy and sensitive data

PAN is sensitive personal information. Read [PRIVACY.md](PRIVACY.md) before using the application.

Important points:

- Saved profiles are persisted in the browser's `localStorage`; this is not encrypted storage.
- When you run an allotment check, the selected PAN is sent to this project's API endpoint and forwarded to the relevant registrar lookup service.
- QR profile export contains the selected profile data, including PAN values. Anyone who obtains the QR payload may be able to read that information.
- The project does not intentionally maintain a user account database for PAN profiles. This does not mean that browsers, hosting providers, network infrastructure, or registrar services cannot process request data.
- Do not use the app on a shared or untrusted device, and do not publish real PAN values in issues, pull requests, screenshots, logs, or test fixtures.

## Contributing

Bug reports, thoughtful feature proposals, and code contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

For security concerns, follow [SECURITY.md](SECURITY.md). Please do not disclose real PANs or other personal information in public issues.

## License and reuse

No license is currently included. The project was developed from an existing public IPO allotment project whose repository does not declare a license. Public visibility on GitHub does not grant permission to relicense or redistribute upstream code. See [LICENSING.md](LICENSING.md) for the current status. Do not assume that this repository is MIT-licensed or otherwise open source until the rights have been clarified and a license file is added.
