/**
 * Authentication helper for Playwright tests
 * This helps bypass Google OAuth for testing by creating authenticated sessions
 */

import { BrowserContext, Page } from '@playwright/test';

/**
 * Creates an authenticated session for testing
 * Works around Google OAuth by setting up a valid Next.js session
 */
export async function setupAuthenticatedSession(
  context: BrowserContext,
  page: Page,
  options?: {
    userId?: string;
    email?: string;
    name?: string;
  }
) {
  const userId = options?.userId || 'test-user-123';
  const email = options?.email || 'systest@livingvectors.test';
  const name = options?.name || 'System Tester';

  // Try to set up a valid session by navigating and checking for auth mechanisms
  // Since we can't easily mock OAuth, we'll use a different approach:
  // 1. Try to access a protected page
  // 2. If redirected to login, we know auth is required
  // 3. For CI/E2E testing, you should set up a test user account directly

  // Add session data that might be used locally
  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: 'test-session-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Navigate to a page that requires auth
  await page.goto('/dashboard/interview', { waitUntil: 'networkidle' });

  // Check if we were redirected to login
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    // Auth didn't work with just the cookie
    // We'll need to handle this differently
    console.log(
      'Session cookie not sufficient. For full testing, implement one of: 1. Direct database user creation (preferred for E2E) 2. Mock NextAuth provider'
    );
    return false;
  }

  return true;
}

/**
 * Alternative: Use environment-based auth for CI/CD
 * Set NEXTAUTH_SECRET and other required variables in GitHub Actions
 */
export function getAuthEnvironmentVariables() {
  return {
    NEXTAUTH_URL: process.env.BASE_URL || 'http://localhost:3045',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'test-secret-do-not-use-in-production',
    // Google OAuth would still be needed unless you disable it for tests
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  };
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const currentUrl = page.url();
  // If redirected to login, we're not authenticated
  if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
    return false;
  }
  return true;
}
