import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import Popfab from 'popfab';

const popfab = new Popfab({ apiKey: process.env.POPFAB_SECRET_KEY! });

// Enable Nest's raw-body support: NestFactory.create(AppModule, { rawBody: true }).
@Controller('webhooks')
export class PopfabWebhookController {
  @Post('popfab')
  receive(@Req() request: Request & { rawBody?: Buffer }, @Headers('x-popfab-signature') signature?: string, @Headers('x-popfab-timestamp') timestamp?: string) {
    return popfab.webhooks.constructEvent({
      payload: request.rawBody ?? Buffer.from(JSON.stringify(request.body)),
      signature,
      timestamp,
      webhookSecret: process.env.POPFAB_WEBHOOK_SECRET!,
    });
  }
}
