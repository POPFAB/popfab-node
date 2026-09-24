import Popfab from 'popfab';

const popfab = new Popfab({ apiKey: process.env.POPFAB_SECRET_KEY! });

export async function POST(request: Request): Promise<Response> {
  const event = popfab.webhooks.constructEvent({
    payload: await request.text(),
    signature: request.headers.get('X-POPFAB-Signature') ?? undefined,
    timestamp: request.headers.get('X-POPFAB-Timestamp') ?? undefined,
    webhookSecret: process.env.POPFAB_WEBHOOK_SECRET!,
  });
  return Response.json({ received: event.id });
}
