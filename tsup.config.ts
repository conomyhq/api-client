import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'domains/accounts/index': 'src/domains/accounts/index.ts',
    'domains/customers/index': 'src/domains/customers/index.ts',
    'domains/geo-distribution/index': 'src/domains/geo-distribution/index.ts',
    'domains/identities/index': 'src/domains/identities/index.ts',
    'domains/payments/index': 'src/domains/payments/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['@conomyhq/core'],
});
