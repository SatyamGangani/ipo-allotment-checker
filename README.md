# IPO Check

<p align="center">
  <strong>A simpler way to track Indian IPO allotment results across family profiles.</strong>
  <br />
  Discover IPOs, check supported registrar results, review GMP snapshots and estimate listing gains — in one place.
  <br /><br />
  <a href="https://ipo.satyamgangani.in"><strong>Open IPO Check →</strong></a>
  ·
  <a href="https://github.com/SatyamGangani/ipo-allotment-checker/issues">Report a bug</a>
  ·
  <a href="https://github.com/SatyamGangani/ipo-allotment-checker/issues">Request a feature</a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" />
  <img alt="Tests" src="https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white" />
  <a href="https://github.com/SatyamGangani/ipo-allotment-checker/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/SatyamGangani/ipo-allotment-checker/actions/workflows/ci.yml/badge.svg" /></a>
</p>

> **Licensing status:** This repository does not currently include a reuse license. Please read [LICENSING.md](LICENSING.md) before copying, modifying, or redistributing code. Public visibility does not automatically grant reuse rights.

## What is IPO Check?

IPO Check is a browser-first Indian IPO companion built to make checking allotment status across multiple family applications less repetitive. It combines family profiles with IPO discovery and useful listing-day reference tools.

## Highlights

| Feature | What it does |
| --- | --- |
| Family profiles | Save multiple applicant profiles in your browser for repeat checks |
| PAN validation | Normalize and validate PAN format, prevent duplicates and mask PANs in the interface |
| Multi-profile checking | Run checks for configured profiles with bounded concurrency and per-profile progress |
| Clear result states | Distinguish allotted, not allotted, not applied, pending, manual verification and lookup errors |
| IPO discovery | Browse current and historical IPO records from supported data sources |
| Registrar adapters | Automate supported lookups and provide manual portal fallbacks where interactive verification is required |
| GMP and listing information | View available grey-market snapshots and listing performance information |
| Listing gain calculator | Estimate potential listing value and gain using your inputs |
| QR profile transfer | Move selected profiles between browsers/devices using a QR payload |

## Registrar integration status

The table below reflects the integration state documented in the current codebase. It is not a guarantee that an external registrar endpoint is available at this moment.

| Registrar / source | Integration mode |
| --- | --- |
| MUFG Intime (Link Intime) | Automated lookup |
| Alankit | Automated lookup |
| KFin Technologies | Manual portal fallback |
| Bigshare Services | Manual portal fallback |
| BSE India | Manual portal fallback |
| NSE India | Manual portal fallback |
| Skyline Financial | Manual portal fallback |
| Purva Sharegistry | Manual portal fallback |

Registrar websites and anti-bot protections can change. Always verify important results on the official registrar or exchange website.

## Tech stack

- React 19, TypeScript and Vite
- Tailwind CSS
- Node.js API handlers for registrar and data-source requests
- Vitest and Testing Library
- Vercel deployment configuration

## Run locally

### Requirements

- Node.js 24 (recommended for the current toolchain)
- npm

### Setup

```bash
git clone https://github.com/SatyamGangani/ipo-allotment-checker.git
cd ipo-allotment-checker
npm ci
npm run dev
```

Vite normally serves the app at [http://localhost:5173](http://localhost:5173). The development middleware also exposes the API handlers.

### Quality checks

```bash
npm run lint
npm test
npm run build
```

### Standalone server

```bash
npm run build
npm start
```

The standalone server listens on port 3000 by default. See `server/standalone.mjs` for runtime configuration.

## Repository layout

```text
api/                 Serverless API handlers for IPOs, allotment checks and GMP
server/              Development middleware and standalone server
src/components/      React UI components
src/services/        Browser services and registrar adapters
src/types/           Shared TypeScript models and validation
tests/               Unit and component tests
.github/             CI workflow and contribution templates
```

## Privacy and PAN safety

PAN is sensitive personal information. Read [PRIVACY.md](PRIVACY.md) before using the app.

- Saved profiles are stored in browser `localStorage`, which is not encrypted storage.
- During an allotment check, the selected PAN is sent to this project's API and forwarded to the relevant registrar lookup service.
- QR profile exports include the selected profile data, including PAN values. Treat the QR code as sensitive.
- Do not use the app on a shared or untrusted device.
- Never post real PAN values in issues, pull requests, screenshots, logs or test fixtures.

## Contributing

Contributions, bug reports and practical feature suggestions are welcome.

1. Read [CONTRIBUTING.md](CONTRIBUTING.md).
2. Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
3. Check the [project roadmap](ROADMAP.md) and existing issues before starting larger work.
4. For security concerns, follow [SECURITY.md](SECURITY.md). Do not disclose personal information in public reports.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned improvements and priorities. You can suggest or discuss an idea through [GitHub Issues](https://github.com/SatyamGangani/ipo-allotment-checker/issues).

## License and reuse

No license is currently included. The project was developed from an existing public IPO allotment project whose repository does not declare a license. The rights to upstream code have not been established, so this repository does not claim an MIT or other open-source license. Read [LICENSING.md](LICENSING.md) for details.
