# popfab

Official Node.js SDK for the Popfab API. This package is currently in active development.

```ts
import Popfab from 'popfab';

const popfab = new Popfab({ apiKey: process.env.POPFAB_SECRET_KEY! });
```

Use `sk_test_...` keys for sandbox and `sk_live_...` keys for live API access. Money-moving methods require a caller-supplied idempotency key.
# popfab-node
