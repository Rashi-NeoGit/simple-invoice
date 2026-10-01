import '@testing-library/jest-dom';

// Prevent a token written to localStorage by one test (e.g. a successful login)
// from leaking into the next test in the same file, which otherwise causes
// AuthProvider to attempt a real "who am I" call on mount using a stale token.
afterEach(() => {
  window.localStorage.clear();
});
