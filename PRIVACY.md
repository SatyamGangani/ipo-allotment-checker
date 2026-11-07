# Privacy and data handling

This document describes the data flows visible in the current repository implementation. It is not a guarantee about the behavior of hosting providers, browsers, network operators, registrar services, or third-party data sources.

## Information handled by the application

The application can handle:

- Family profile names or nicknames.
- Permanent Account Number (PAN) values.
- IPO selections and allotment lookup results.
- Profile data encoded for QR export/import.
- Browser camera input when a user chooses to scan a QR code.

PAN is sensitive personal information. Use the application only on a device and browser profile you control.

## Where profile data is stored

Saved profiles are persisted in the browser using `localStorage` under the application's profile storage key.

- This is browser-local persistence, not a remote account database.
- `localStorage` is not encrypted by this application.
- Anyone with access to the same browser profile or device may be able to inspect stored data.
- Clearing browser site data or using another browser/device may remove or make the profiles unavailable.

The application does not provide user accounts or a server-side profile database in the current implementation.

## Allotment checks and registrar requests

When a user checks an IPO, the browser sends the selected PAN and registrar/IPO parameters to this application's API endpoint. The API handler then makes a request to the relevant registrar service where an automated adapter is supported.

This means PAN is transmitted outside the browser for an automated lookup. It is not accurate to describe the entire lookup flow as browser-only or to imply that PAN never leaves the device.

Some registrars require CAPTCHA, bot checks, interactive sessions, or investor authentication. For these, the application provides a manual portal path instead of treating a blocked or failed request as a confirmed non-allotment.

## QR profile transfer

The QR synchronization feature encodes selected profile data for transfer. The QR payload includes profile names and PAN values for the profiles selected for export.

- Treat the QR image and any copied/exported QR payload as sensitive.
- Share it only with a trusted recipient through a channel you control.
- Anyone who obtains the QR image or payload may be able to decode the included profile information.
- Delete exported images or messages when they are no longer needed.

Camera access is used only when the user chooses the QR scanning flow and grants browser permission.

## Logs, hosting, and third parties

The repository includes API handlers and is configured for Vercel deployment. A request passes through hosting and network infrastructure before reaching an external registrar. Those providers may process connection metadata and request information under their own policies and retention practices.

The source code includes log-safe handling in some API paths, but source inspection alone cannot prove that PAN values are never captured by every runtime, hosting log, error monitor, browser extension, or third-party service. Do not enter real PAN values into public bug reports or support requests.

IPO discovery and GMP/listing information are obtained from external services. Those services have their own terms, availability, privacy practices, and data accuracy limitations.

## Recommended precautions

1. Use a trusted, updated device and browser.
2. Avoid shared/public computers and browser profiles.
3. Do not share QR exports publicly.
4. Remove saved profiles when no longer needed and clear site data on devices you no longer control.
5. Never commit real PANs, screenshots containing PANs, access tokens, cookies, or registrar credentials.
6. Use dummy PAN-shaped values in automated tests and examples.
7. Verify allotment information with the official registrar or exchange before making financial decisions.

## Changes to this document

This document should be reviewed whenever profile storage, QR synchronization, analytics, logging, hosting, or registrar integrations change.
