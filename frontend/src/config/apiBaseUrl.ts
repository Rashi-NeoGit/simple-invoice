// Isolated in its own module because `import.meta.env` (Vite's env access) can't be
// parsed by ts-jest's CommonJS target. jest.config.cjs maps this module to
// apiBaseUrl.jest.ts for tests, so this file is only ever evaluated by Vite itself.
export const API_BASE_URL: string = import.meta.env.VITE_API_URL;
