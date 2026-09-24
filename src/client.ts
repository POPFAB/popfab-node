import { PaymentsResource } from './resources/payments.js';
import { TransfersResource } from './resources/transfers.js';
import { Transport } from './transport.js';
import { WebhooksResource } from './webhooks.js';
import type { PopfabConfig, PopfabEnvironment } from './types.js';

export default class Popfab {
  readonly payments: PaymentsResource;
  readonly transfers: TransfersResource;
  readonly webhooks: WebhooksResource;
  readonly environment: PopfabEnvironment;

  constructor(config: PopfabConfig) {
    const transport = new Transport(config);
    this.environment = transport.environment;
    this.payments = new PaymentsResource(transport);
    this.transfers = new TransfersResource(transport);
    this.webhooks = new WebhooksResource();
  }
}
