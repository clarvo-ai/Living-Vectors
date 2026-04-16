# Living Vectors System Tests (E2E)

This directory contains end-to-end system tests for the application using Playwright.

These tests are intended for local development only.
The default `npm run test` and `npm run test:headed` commands run Chromium only, and test workers are pinned to `1` by default.

## Prerequisites

**The system must be running before you start tests.**

```bash
docker compose --profile lv-web up -d --build
```

## Setup

Navigate to the `system-tests` directory to run the following commands.

```bash
cd system-tests
```

Create a local environment file based on the example, you only need to set Gemini API key

```bash
cp .env.example .env.local
```

### Installation

```bash
npm install

# Install Playwright browsers
npx playwright install --with-deps
```

## Running Tests

### Local Development

To bypass authentication and seed a test user, run:

```bash
npm run seed:test-user
```

```bash
# Run all tests in Chromium
npm run test

# Run with UI mode (interactive dashboard)
npm run test:ui

# Run in headed mode
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

### With Custom Base URL

```bash
# Test against staging environment
BASE_URL="" npm run test
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

1. Update profile fields
2. Save changes successfully
3. Verify the saved data persists after refresh

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

## Test Data

Test data is defined in `tests/data/test-data.ts`:

- **PROFILE_DATA**: Profile update test cases

## Interview Candidate Test Prompts

The interview E2E test uses Gemini AI to generate realistic candidate responses. You can create custom interview candidate personas by adding prompt files to the `test_prompts/` folder.

### Creating a Custom Candidate Prompt

1. Create a new markdown file in `test_prompts/`
2. Define the candidate persona and conversation rules

3. Update the interview test to use your new prompt instead of the default `interview-candidate-0.md` if needed.

## Configuration

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

### Screenshots and Videos

- Screenshots: Automatically captured for failed tests
- Videos: Recorded for tests run in headed mode
- Location: `test-results/` directory
