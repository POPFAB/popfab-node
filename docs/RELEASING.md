# Sandbox testing and releases

## Sandbox integration tests

The integration suite only makes read-only sandbox calls: bank listing, payment listing, and transfer listing. It does not create a payment or transfer.

Run locally:

```bash
POPFAB_SANDBOX_SECRET_KEY=sk_test_... npm run test:integration
```

Use `POPFAB_BASE_URL` only when testing against a non-default Popfab API gateway.

For GitHub Actions, add a repository secret named `POPFAB_SANDBOX_SECRET_KEY`. Optionally add a repository variable named `POPFAB_BASE_URL`. The workflow intentionally skips the actual network assertions when the secret is absent, so forks and early CI remain safe.

## npm Trusted Publishing

The publish workflow uses npm Trusted Publishing (OIDC), not a long-lived `NPM_TOKEN`.

Before the first release, an npm organization/package administrator must configure a trusted publisher for this package with:

| Setting | Value |
| --- | --- |
| Package | `popfab` |
| GitHub owner | `POPFAB` |
| Repository | `popfab-node` |
| Workflow file | `.github/workflows/publish.yml` |
| Environment | `npm-publish` |

Create the protected GitHub environment `npm-publish` and require an authorized reviewer if release approval is desired. Ensure the npm package name is available to the Popfab npm organization before tagging a release.

After the trusted publisher is configured, publish a release by updating `package.json` to the intended semantic version, merging to `main`, and pushing a matching tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow runs checks, tests, build, package inspection, then `npm publish --access public --provenance`.

## Pre-release checklist

1. Pull the latest `main`; confirm license text and the `license` package field are correct.
2. Confirm the package name `popfab` is owned/available in npm.
3. Confirm the sandbox integration workflow is green.
4. Review `npm pack --dry-run` output for unintended files.
5. Update version and changelog.
6. Tag exactly the same version as `package.json` with a `v` prefix.
