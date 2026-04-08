// Runs before test files load (see jest.config.ts setupFiles).
// auth.ts requires NEXTAUTH_SECRET at module evaluation time.
process.env.NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET || 'jest-test-only-secret-do-not-use-in-production-32chars';
