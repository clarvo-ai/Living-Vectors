# Living Vectors System Tests (E2E)

This directory contains end-to-end system tests for the Living Vectors application using Playwright.

## Overview

System tests validate critical user flows across the entire application stack:

- Interview completion and job recommendation flow
- User profile management (edit name, phone number)

These tests run against local development environment or CI/CD pipeline.

## Setup

### Prerequisites

- Node.js 20+
- npm or yarn
- Running instance of lv-web (Next.js frontend)
- Running instance of lv-pyapi (FastAPI backend)
- PostgreSQL database

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
# Run all tests (automatically starts dev server)
npm run test

# Run with UI mode (interactive dashboard)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

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
4. Check top 3 recommended jobs

**Key scenarios:**

- Happy path: Complete interview → get recommendations → apply
- Edge cases: Interview timeout

### `tests/profile-management.spec.ts`

Tests user profile editing:

1. Display profile information
2. Update name and phone number
3. Save changes and verify persistence
4. Validate phone number format
5. Handle errors gracefully

**Key scenarios:**

- Update both fields
- Partial updates (name only)
- Invalid input validation
- Save/cancel operations

## Test Data

Test data is defined in `tests/data/test-data.ts`:

- **TEST_USERS**: Test user accounts with credentials
- **INTERVIEW_RESPONSES**: Predefined answers for different career paths
- **PROFILE_DATA**: Profile update test cases
- **JOB_RECOMMENDATION_VALIDATIONS**: Expected job card structure

## Configuration

### `playwright.config.ts`

Key settings:

- **baseURL**: http://localhost:3045 (configurable via BASE_URL env var)
- **testDir**: `./tests`
- **timeout**: 30 seconds per test
- **retries**: Enabled in CI, disabled locally
- **reporters**: HTML, JSON, JUnit XML
- **browsers**: Chromium, Firefox, WebKit

### Environment Variables

```bash
# Frontend URL
BASE_URL=http://localhost:3045

# Skip automatic server startup
SKIP_SERVER_START=true

# Run in CI mode
CI=true  # Enables retries, disables headed mode
```

## Writing New Tests

### Best Practices

1. **Use data-testid attributes**: Add `data-testid` to important elements in the UI
2. **Use test.step()**: Organize tests into logical steps for better reporting
3. **Wait for elements**: Use `.toBeVisible()`, `.waitForURL()` instead of hardcoded timeouts
4. **Predefined test data**: Use data from `tests/data/test-data.ts`
5. **Describe scenarios**: Use descriptive test names that explain the user flow

### Selectors

Prefer in order:

1. `data-testid` attributes
2. Accessible names (aria-label, button text)
3. Placeholder text
4. Input names
5. Last resort: CSS selectors

## CI/CD Integration

### GitHub Actions

Tests run automatically on:

- Push to `main` and `dev` branches

### Workflow File

See `.github/workflows/system-tests.yml` for full configuration.

**Workflow steps:**

1. Checkout code
2. Setup Node.js and Python
3. Install dependencies
4. Install Playwright browsers
5. Run database migrations
6. Start backend and frontend services
7. Run Playwright tests

### Artifacts

- **playwright-report/**: HTML test report
- **test-results/**: JSON and JUnit XML results (30-day retention)

## Reports

### View Test Report

```bash
npm run test:report
```

This opens the HTML report in your default browser showing:

- Test status (passed/failed)
- Detailed failure information
- Screenshots and videos for failed tests
- Execution times

## Debugging

### Debug Mode

```bash
npm run test:debug
```

Interactive debugger with:

- Step through tests line by line
- Inspect page state
- Run commands in browser console
- Take screenshots

### Screenshots and Videos

- Screenshots: Automatically captured for failed tests
- Videos: Recorded for failed tests in headed mode
- Location: `test-results/` directory

### View Logs

```bash
# Verbose output
DEBUG=playwright npm run test

# Save logs to file
DEBUG=pw:api npm run test > test.log 2>&1
```

## Troubleshooting

### Tests timeout

- Increase `timeout` in playwright.config.ts
- Check if frontend/backend are running
- Verify network connectivity

### Element not found

- Add `data-testid` to elements in the UI
- Verify selectors match current URL/page state
- Check browser console for errors

### Tests pass locally but fail in CI

- Ensure all environment variables are set in GitHub Actions
- Check that test data is properly seeded
- Verify database is properly initialized
- Check for timing issues (use longer waits)

### Port already in use

```bash
# Kill processes on specific port
lsof -ti:3045 | xargs kill -9  # Frontend
lsof -ti:8000 | xargs kill -9  # Backend
```

## Contributing

When adding new system tests:

1. Create test file in `tests/` directory: `feature-name.spec.ts`
2. Use descriptive test names and step descriptions
3. Add test data to `tests/data/test-data.ts` if needed
4. Add `data-testid` attributes to UI components being tested
5. Run tests locally before pushing: `npm run test`
6. Ensure tests pass in both headed and headless modes
