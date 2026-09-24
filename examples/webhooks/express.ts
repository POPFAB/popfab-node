import express from 'express';
import Popfab from 'popfab';

const app = express();
const popfab = new Popfab({ apiKey: process.env.POPFAB_SECRET_KEY! });

app.post('/webhooks/popfab', express.raw({ type: 'application/json' }), (req, res) => {
  const event = popfab.webhooks.constructEvent({
    payload: req.body,
    signature: req.header('X-POPFAB-Signature') ?? undefined,
    timestamp: req.header('X-POPFAB-Timestamp') ?? undefined,
    webhookSecret: process.env.POPFAB_WEBHOOK_SECRET!,
  });
  // Store event.id before applying business effects; delivery is at least once.
  console.log(event.type);
  res.sendStatus(200);
});
