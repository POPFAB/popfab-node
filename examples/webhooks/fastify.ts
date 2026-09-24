import Fastify from 'fastify';
import Popfab from 'popfab';

const app = Fastify();
const popfab = new Popfab({ apiKey: process.env.POPFAB_SECRET_KEY! });

app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_request, body, done) => done(null, body));
app.post('/webhooks/popfab', async (request) => {
  const event = popfab.webhooks.constructEvent({
    payload: request.body as Buffer,
    signature: request.headers['x-popfab-signature'],
    timestamp: request.headers['x-popfab-timestamp'],
    webhookSecret: process.env.POPFAB_WEBHOOK_SECRET!,
  });
  return { received: event.id };
});
