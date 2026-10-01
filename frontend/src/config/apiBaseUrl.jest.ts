// Jest-only stand-in for apiBaseUrl.ts (see jest.config.cjs moduleNameMapper) — avoids
// parsing `import.meta.env`, which ts-jest's CommonJS target cannot handle.
export const API_BASE_URL = 'http://localhost:3000';
