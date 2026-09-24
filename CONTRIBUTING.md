# Contributing

Thank you for contributing to `popfab`.

## Local checks

```bash
npm install
npm run check
npm test
npm run build
npm pack --dry-run
```

## Contribution rules

- Keep public API changes backwards compatible unless making a documented major-version change.
- Add or update contract tests for every API request/response mapping change.
- Never add API keys, webhook secrets, raw customer data, or production URLs to fixtures.
- Money-moving methods must not gain automatic retries without an idempotency and provider-outcome review.
- Use clear, scoped commit messages such as `feat:`, `fix:`, `docs:`, and `test:`.

Open an issue before substantial API-surface changes so the platform and SDK contracts can be reviewed together.
