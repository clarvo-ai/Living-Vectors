# E2E Testing with Authentication - Setup Guide

## Current Status

✅ **Smoke tests are passing** - 30/30 tests across Chromium, Firefox, and WebKit

These tests verify:

- App loads without crashing
- Auth redirects are working
- Public pages are accessible
- Session mechanisms are in place

## Authentication Challenge

Your app uses **Google OAuth via NextAuth.js**, which requires one of the following approaches for E2E testing:

### Option 1: Create Test User in Database (Recommended) ⭐

This is the best approach for E2E tests. Create a test user directly in your database that you can use for testing.

**Steps:**

1. **Create test user in database:**

   ```bash
   # Using Prisma Studio
   npm run prisma:studio

   # Or via SQL directly
   # INSERT INTO User (email, name, emailVerified) VALUES ('systest@livingvectors.test', 'System Test User', NOW());
   ```

2. **Update your NextAuth config** to allow a test provider:

   ```typescript
   // packages/ts-shared/lib/auth/auth.ts

   import CredentialsProvider from 'next-auth/providers/credentials';

   // Add to providers array (only for development/testing)
   if (process.env.NEXTAUTH_ALLOW_TEST_CREDENTIALS === 'true') {
     providers.push(
       CredentialsProvider({
         name: 'Test Credentials',
         credentials: {
           email: { label: 'Email', type: 'text' },
           password: { label: 'Password', type: 'password' },
         },
         async authorize(credentials) {
           // Look up user by email
           const user = await prisma.user.findUnique({
             where: { email: credentials?.email },
           });

           if (user && credentials?.password === process.env.TEST_USER_PASSWORD) {
             return { id: user.id, email: user.email, name: user.name };
           }
           return null;
         },
       })
     );
   }
   ```

3. **Set environment variables:**

   ```bash
   # .env.local
   NEXTAUTH_ALLOW_TEST_CREDENTIALS=true
   TEST_USER_PASSWORD=TestPassword123!
   ```

4. **Update test helper:**

   ```typescript
   // tests/fixtures/auth-helper.ts
   export async function authenticateAsTestUser(page: Page) {
     await page.goto('/auth/login');

     // Fill in test credentials
     await page.fill('input[type="email"]', 'systest@livingvectors.test');
     await page.fill('input[type="password"]', 'TestPassword123!');
     await page.click('button:has-text("Sign in")');

     // Wait for redirect
     await page.waitForURL('/dashboard/**', { timeout: 10000 });
   }
   ```

### Option 2: Mock NextAuth Session (Faster but Less Realistic)

Use a Next.js middleware or test setup to mock the session object.

```typescript
// tests/fixtures/mock-auth.ts
import { Session } from 'next-auth';

export const mockSession: Session = {
  user: {
    id: 'test-user-123',
    email: 'systest@livingvectors.test',
    name: 'System Tester',
    image: null,
    role: 'USER',
  },
};

// In tests:
import { useSession } from 'next-auth/react';
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: mockSession, status: 'authenticated' })),
}));
```

### Option 3: Use GitHub Actions with Real Google OAuth (CI Only)

Set up real Google OAuth credentials in GitHub Actions for CI testing.

```yaml
# .github/workflows/system-tests.yml
env:
  GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
  GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
  NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
```

## Recommended Implementation Path

1. **Start with Option 1** (Test User in DB) - Most realistic
   - Create `TEST_USER_PASSWORD` in `.env.local`
   - Create test user via Prisma Studio
   - Update auth config to support credentials provider for testing
   - Tests will run exactly like production

2. **For CI/CD** - Use real Google OAuth credentials
   - Store in GitHub Secrets
   - Tests run against real oauth flow (slower but complete)

3. **Alternative** - Mock session for rapid development
   - Faster test execution
   - Less realistic
   - Good for TDD during development

## Running Tests with Authentication

### After setting up test user:

```bash
# Run all tests including authenticated ones
npm run test

# Run in headed mode to debug
npm run test:headed

# Run specific test file
npm run test -- tests/interview-and-recommendations.spec.ts
```

## Files to Update

### 1. Create Test User

Use Prisma Studio:

```bash
npm run prisma:studio
```

Or SQL:

```sql
INSERT INTO "User" (email, name)
VALUES ('systest@livingvectors.test', 'System Tester');
```

### 2. Update Auth Config

File: `packages/ts-shared/lib/auth/auth.ts`

Add test credentials provider (see Option 1 above)

### 3. Update Test Helper

File: `tests/fixtures/auth-helper.ts`

Implement `authenticateAsTestUser()` function

### 4. Update Test Files

UseAuthenticateAsTestUser() in:

- `tests/interview-and-recommendations.spec.ts`
- `tests/profile-management.spec.ts`

### 5. Add Environment Variables

`.env.local`:

```
NEXTAUTH_ALLOW_TEST_CREDENTIALS=true
TEST_USER_PASSWORD=TestPassword123!
```

## Troubleshooting

### Tests timeout on auth page

- Check if test user exists in database
- Verify credentials in env vars
- Check NextAuth config is updated

### Session not persisting

- Ensure NEXTAUTH_SECRET is set
- Check session storage (database vs JWT)
- Verify cookies are being set

### Google OAuth appearing in tests

- If you don't want real OAuth in tests, use Option 1 or 2
- Or disable it with environment variable

## Next Steps

1. Choose an authentication approach (Option 1 recommended)
2. Follow the setup steps above
3. Create the test user
4. Update the auth configuration
5. Run tests: `npm run test`

All smoke tests are already passing, so once auth is set up, the full E2E tests should work!

See [README.md](./README.md) for general testing documentation.
