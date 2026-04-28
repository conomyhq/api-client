import type { GeoDistributionResponse } from '@conomyhq/core';
import type { Transport } from '../transport';

export interface GetGeoDistributionOptions {
  country: string;
  level1?: string;
  level2?: string;
}

export class GeoDistributionModule {
  constructor(private readonly transport: Transport) {}

  get(opts: GetGeoDistributionOptions): Promise<GeoDistributionResponse> {
    return this.transport.request<GeoDistributionResponse>('/utility/geoDistribution', {
      query: opts as unknown as Record<string, string | number | boolean | string[] | null | undefined>,
    });
  }
}
