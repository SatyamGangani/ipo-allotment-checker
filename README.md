# IPO Check — Minimal Multi-PAN IPO Allotment Checker

A clean, modern, zero-login web application that allows users to configure their family members' PAN numbers once and check IPO allotment status for all of them together in a single click.

## Features

- **One-Time Family Profile Setup**: Save family member names/nicknames and PAN numbers once in browser `localStorage`.
- **Privacy First (Zero Server Storage)**: No database, no user accounts, no login, and zero PAN persistence on any server. PAN numbers are never sent to analytics or logged.
- **PAN Masking & Validation**: Standard Indian PAN validation (`[A-Z]{5}[0-9]{4}[A-Z]{1}`), uppercase normalization, duplicate PAN prevention, and safe masking (`ABC•••234F`) in the UI.
- **Searchable IPO Selector**: Search and filter live IPO issues from registrars and exchanges.
- **Automated Multi-PAN Lookups**: Concurrent, rate-limit friendly checks for all family PANs with real-time progress indicators ("Checking 2 of 4").
- **Clear, Normalized Allotment Statuses**:
  - `Allotted`: Confirmed allotment with lot count and allotted share quantity.
  - `Not Allotted`: Confirmed application was placed, but 0 shares allotted.
  - `Not Applied`: Registrar confirms no application was submitted for this PAN.
  - `Not Yet Available`: Allotment results have not yet been published by the registrar.
  - `Check Manually`: Interactive verification required (CAPTCHA challenge, bot protection, or registered investor login).
  - `Could Not Check`: Upstream network timeout or server error with individual retry action.
- **Zero False "Not Allotted" Results**: Network errors, timeouts, CAPTCHAs, and unexpected responses are never falsely interpreted as "Not Allotted".

---

## Registrar Integration Status

| Registrar / Exchange | Integration Type | Status | Technical Details & Limitations |
| :--- | :--- | :--- | :--- |
| **Link Intime India** | Automated | **Active & Functional** | XML API via `SearchOnPan` endpoint. Returns application status, applied shares, and allotted shares. |
| **Alankit Assignments** | Automated | **Active & Functional** | JSON API via `GetQueryResult` endpoint. Returns application status and allotted quantity. |
| **KFin Technologies** | Manual Check | **Manual Portal Fallback** | Official portal enforces image CAPTCHA challenges on submissions. Application provides direct portal deep link with 1-click PAN copy. |
| **Bigshare Services** | Manual Check | **Manual Portal Fallback** | Enforces dynamic session CAPTCHA (`Captcha.ashx`). Direct link provided with 1-click PAN copy. |
| **BSE India (Exchange)** | Manual Check | **Manual Portal Fallback** | Protected by Akamai Bot Manager (WAF) blocking automated server/script requests with HTTP 403. Direct official link provided. |
| **NSE India (Exchange)** | Manual Check | **Manual Portal Fallback** | Requires reCAPTCHA v3 token and registered investor login credentials. |
| **Skyline Financial** | Manual Check | **Manual Portal Fallback** | Multi-step interactive CSRF session form. |
| **Purva Sharegistry** | Manual Check | **Manual Portal Fallback** | Interactive query form. |

---

## Architecture

```
ipo-web-app-allotment/
├── src/
│   ├── types/
│   │   ├── ipo.ts                # IPO & registrar metadata & support types
│   │   ├── profile.ts            # Profile schema, PAN validation & masking
│   │   └── allotment.ts          # Normalized allotment status & UI badge styles
│   ├── services/
│   │   ├── storage.ts            # localStorage persistence layer
│   │   ├── ipoDiscovery.ts       # Live IPO discovery with TTL caching & fallbacks
│   │   ├── allotmentService.ts   # Concurrency-controlled batch checking & retry
│   │   └── registrars/
│   │       ├── types.ts          # RegistrarAdapter interface & params
│   │       ├── linkIntimeAdapter.ts
│   │       ├── alankitAdapter.ts
│   │       ├── manualAdapters.ts # Graceful fallback for CAPTCHA/WAF registrars
│   │       └── registry.ts       # Adapter resolution registry
│   ├── components/
│   │   ├── Header.tsx            # App header with local storage privacy disclosure
│   │   ├── IpoSelector.tsx       # Searchable dropdown with registrar badges
│   │   ├── ProfileManager.tsx    # Saved PAN profile list, edit & delete actions
│   │   ├── ProfileModal.tsx      # Add/edit modal with live validation & masking
│   │   ├── CheckAction.tsx       # Prominent "Check All PANs" action with progress bar
│   │   ├── ResultsSummary.tsx    # Status count cards (Allotted, Not Allotted, etc.)
│   │   ├── ResultCard.tsx        # Individual profile result card with retry action
│   │   └── ResultsSection.tsx    # Results container
│   ├── App.tsx                   # Main single-page workflow coordinator
│   ├── main.tsx
│   └── index.css                 # Tailwind CSS directives & typography
├── server/
│   ├── registrarProxy.ts         # Secure, zero-PAN logging registrar proxy
│   ├── middleware.ts             # Connect middleware for Vite dev & preview
│   └── standalone.mjs            # Production HTTP server runner
├── tests/
│   ├── panProfile.test.ts        # Unit tests for PAN validation & localStorage
│   ├── normalizedStatus.test.ts  # Registrar status mapping & error isolation tests
│   ├── allotmentService.test.ts  # Batch check & retry tests
│   └── App.test.tsx              # React integration & UI workflow tests
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Running Locally

### Development Server
```bash
npm run dev
```
Starts the Vite server on `http://localhost:5173/` with embedded API proxy middleware.

### Run Automated Tests
```bash
npm test
```
Runs the full Vitest suite covering validation, persistence, adapter isolation, error handling, and end-to-end user workflows.

### Production Build & Standalone Server
```bash
npm run build
npm start
```
Compiles the TypeScript code, bundles the production assets into `dist/`, and launches the lightweight standalone server on `http://localhost:3000/`.
