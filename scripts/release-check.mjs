import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

if (!process.env.POPFAB_SANDBOX_SECRET_KEY?.startsWith('sk_test_')) {
  throw new Error('POPFAB_SANDBOX_SECRET_KEY must contain a Popfab sk_test_ key before publishing.');
}

if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== `v${pkg.version}`) {
  throw new Error(`Release tag ${process.env.GITHUB_REF_NAME} must match package version v${pkg.version}.`);
}

console.log(`Release checks configured for popfab@${pkg.version}.`);
