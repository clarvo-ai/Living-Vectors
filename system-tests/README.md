# Living Vectors System Tests (E2E)

This directory contains end-to-end system tests for the Living Vectors application using Playwright.

## Overview

System tests validate critical user flows across the entire application stack:

- Interview completion and job recommendation flow
- User profile management (edit name, phone number)

These tests run against local development environment or CI/CD pipeline.
The default `npm run test` and `npm run test:headed` commands run Chromium only, and test workers are pinned to `1` by default to reduce auth/data races.

## Setup

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps
```

## Running Tests

### Local Development

```bash
# Run all tests in Chromium
npm run test

# Run with UI mode (interactive dashboard)
npm run test:ui

# Run in headed mode (see Chromium browser)
npm run test:headed

# Seed the user and run the interview flow
npm run test:interview

# Seed the user and run the interview flow in headed Chromium
npm run test:interview:headed

# Seed the user and run the profile flow
npm run test:profile

# Seed the user and run the profile flow in headed Chromium
npm run test:profile:headed

# Run single test file
npm run test:single -- interview-and-recommendations

# Debug mode (step through tests)
npm run test:debug
```

### Against Existing Dev Environment

If you already have the app running:

```bash
# Skip automatic server startup
SKIP_SERVER_START=true npm run test
```

### With Custom Base URL

```bash
# Test against staging environment
BASE_URL=https://staging.livingvectors.com npm run test
```

## Test Files

### `tests/interview-and-recommendations.spec.ts`

Tests the main user journey:

1. Start interview questionnaire
2. Answer career-related questions
3. Receive job recommendations
4. Open the first recommended job and verify the Apply Now action is available

**Key scenarios:**

- Happy path: Complete the interview with Gemini-generated replies, then reach the opportunities page
- Opportunities flow: Reload the opportunities page until jobs appear, then open the first job card

### `tests/profile-management.spec.ts`

Tests user profile editing:

1. Update name and phone number
2. Save changes successfully
3. Verify the saved data persists after refresh and in the profile API response

**Key scenarios:**

- Update both fields
- Persistence after save and page refresh

## Authentication in E2E

System tests do not run through Google OAuth UI. They use a seeded NextAuth session.

### How it works

1. Seed a test user and session in the database:

```bash
npm run seed:test-user
```

2. Tests inject the same session token as a `next-auth.session-token` cookie.

3. Protected routes (for example, dashboard pages) are then accessed as an authenticated user.

### Required environment variables

```bash
TEST_USER_EMAIL=systest@livingvectors.test
TEST_SESSION_TOKEN=lv-e2e-session-token
```

`TEST_SESSION_TOKEN` must match both:

- The session seeded by `scripts/create-test-user.cjs`
- The cookie value used in test files

## Test Data

Test data is defined in `tests/data/test-data.ts`:

- **PROFILE_DATA**: Profile update test cases

The interview and opportunities tests now rely on the seeded test user created by `npm run seed:test-user` rather than a large shared export set.

## Configuration

### `playwright.config.ts`

Key settings:

- **baseURL**: http://localhost:3045 (configurable via BASE_URL env var)
- **testDir**: `./tests`
- **timeout**: 30 seconds per test
- **retries**: Enabled in CI, disabled locally
- **workers**: 1 by default to keep authenticated flows deterministic
- **reporters**: HTML, JSON, JUnit XML
- **browsers**: Chromium, Firefox, WebKit

Default script behavior:

- `npm run test` runs Chromium only
- `npm run test:headed` runs headed Chromium only
- `npm run test:interview` and `npm run test:profile` seed the test user before running the relevant spec

### Artifacts

- **playwright-report/**: HTML test report
- **test-results/**: JSON and XML results

## Reports

### View Test Report

```bash
npm run test:report
```

## Debugging

### Debug Mode

```bash
npm run test:debug
```

### Screenshots

- Screenshots: Automatically captured for failed tests
- Location: `test-results/` directory
