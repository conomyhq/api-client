import type { FxRatesDto } from '@conomyhq/core';
import type { Transport } from '../transport';

export class FxModule {
  constructor(private readonly transport: Transport) {}

  getRates(base: string): Promise<FxRatesDto> {
    return this.transport.request<FxRatesDto>('/fx/rates', {
      query: { base },
    });
  }
}
