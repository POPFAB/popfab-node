# Security policy

## Reporting a vulnerability

Do not open a public issue for a suspected security vulnerability. Report it privately to the Popfab security/contact channel supplied by your organization, including reproduction steps, impact, and affected versions.

## Supported versions

Until the first stable release, only the latest `0.x` version receives security fixes.

## Key handling

- Keep `sk_live_` keys and webhook secrets in a server-side secret manager.
- Never publish them in source control, browser bundles, error reports, or test fixtures.
- Rotate a key or webhook secret immediately if exposure is suspected.
