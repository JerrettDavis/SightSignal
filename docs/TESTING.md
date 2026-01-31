# SignalFeed Testing Guide

This document describes the comprehensive testing infrastructure for SignalFeed, including unit tests, E2E tests, and CI/CD workflows.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Running Tests Locally](#running-tests-locally)
- [E2E Test Structure](#e2e-test-structure)
- [CI/CD Pipeline](#cicd-pipeline)
- [Test Data Management](#test-data-management)
- [Writing New Tests](#writing-new-tests)
- [Troubleshooting](#troubleshooting)

## Overview

SignalFeed uses a multi-layered testing approach:

1. **Unit Tests** - Test individual functions and components in isolation (Vitest)
2. **E2E Tests** - Test complete user workflows with real browser automation (Playwright)
3. **Type Checking** - TypeScript static analysis
4. **Linting** - ESLint for code quality

All tests run automatically in CI/CD via GitHub Actions.

## Test Types

### Unit Tests

Unit tests use **Vitest** and test individual functions, components, and use cases.

```bash
# Run all unit tests
npm test

# Watch mode for development
npm run test:watch
```

### E2E Tests (File Storage)

E2E tests with file-based storage - fastest for local development.

```bash
# Run E2E tests with file storage
npm run e2e

# Interactive UI mode
npm run e2e:ui
```

### E2E Tests (PostgreSQL)

E2E tests with PostgreSQL - matches production environment.

```bash
# Start test database
npm run test:db:up

# Setup test database schema and seed data
npm run test:db:setup

# Run E2E tests with PostgreSQL
npm run e2e:postgres

# Stop test database
npm run test:db:down

# Or run everything in one command
npm run test:e2e:full
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Running Tests Locally

### Prerequisites

1. **Node.js 20+** installed
2. **Docker** installed (for PostgreSQL tests)
3. **Dependencies** installed: `npm install`
4. **Playwright browsers** installed: `npx playwright install`

### Quick Start

```bash
# Install everything
npm install
npx playwright install

# Run all test types
npm run typecheck
npm run lint
npm test
npm run e2e

# Run PostgreSQL E2E tests
npm run test:e2e:full
```

## E2E Test Structure

E2E tests are organized by feature area:

```
tests/e2e/
├── admin-crud.spec.ts           # Admin CRUD operations
├── admin-login.spec.ts          # Admin authentication
├── explore-sidebar.spec.ts      # Explore/sightings browser
├── geofences-sidebar.spec.ts    # Geofence creation
├── home.spec.ts                 # Home page basics
├── integration-workflow.spec.ts # Complete user workflows
├── reaction-flow.spec.ts        # Sighting reactions
├── report-sidebar.spec.ts       # Sighting reporting
├── sidebar-navigation.spec.ts   # UI navigation
├── signal-broadcasting.spec.ts  # Signal delivery infrastructure
├── signals-integration.spec.ts  # Signal workflows
├── signals-sidebar.spec.ts      # Signal browser
├── theme-and-ui.spec.ts         # Theme switching
└── visibility.spec.ts           # Public/private visibility
```

### Test Coverage

Our E2E tests cover:

✅ **User Registration & Authentication**

- Admin login/logout
- Session management
- Permission checks

✅ **Sighting Operations**

- Create sightings with all fields
- Filter and search sightings
- Update sighting status
- Delete sightings (single and bulk)
- Custom fields support
- Reactions (upvote, downvote, confirm, dispute, spam)

✅ **Geofence Management**

- Create public/private geofences
- Polygon drawing and validation
- Visibility controls
- Update geofence properties
- Delete geofences
- Geofence highlighting on map

✅ **Signal System**

- Signal creation and configuration
- Trigger types (new_sighting, confirmed, etc.)
- Condition filtering
- Target types (global, geofence, polygon)
- Active/inactive status
- Signal subscription structure

✅ **Admin Functions**

- Dashboard metrics
- Full CRUD operations on all entities
- Bulk delete operations
- Search and filtering
- Data validation

✅ **Public/Private Visibility**

- Public geofences appear in lists
- Private geofences hidden from public
- Visibility toggle functionality
- API filtering by visibility

✅ **Signal Broadcasting Infrastructure**

- Email delivery configuration (mock)
- Webhook delivery configuration
- Push notification structure
- Delivery preferences
- Metrics tracking

✅ **General Workflows**

- Complete user journeys (explore → filter → report → verify)
- Multi-step workflows (create geofence → subscribe)
- Error handling and recovery
- Theme persistence
- State management across views

## CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline runs on:

- Push to `main` or `develop` branches
- Pull requests to these branches

### Pipeline Stages

1. **Lint & Type Check** - Code quality validation
2. **Unit Tests** - Vitest tests
3. **E2E Tests (File)** - Fast E2E tests with file storage
4. **E2E Tests (PostgreSQL)** - Production-like E2E tests
5. **Build** - Next.js production build
6. **Security Audit** - npm audit for vulnerabilities
7. **Test Summary** - Aggregate results

### Viewing Results

- Test results are uploaded as artifacts
- Playwright reports available for 30 days
- Build artifacts available for 7 days

## Test Data Management

### File Storage Tests

- Data stored in `.local/e2e/` directory
- Automatically cleaned before each test run
- Fast and isolated

### PostgreSQL Tests

- Uses separate test database on port 5433
- Schema created from migrations
- Test seed data from `scripts/test-db-setup.mjs`
- Database cleaned between test runs

### Seed Data

Test database includes:

- 3 categories (Nature, Public Safety, Community)
- 3 subcategories
- 2 sighting types
- 2 test users (admin, regular user)
- 2 test geofences (public and private)
- 2 test signals (active and inactive)

## Writing New Tests

### Creating a New E2E Test

1. Create a new file in `tests/e2e/`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should do something", async ({ page }) => {
    // Navigate to page
    await page.goto("/");

    // Interact with elements
    await page.click('button:has-text("Click Me")');

    // Make assertions
    await expect(page.getByText("Success")).toBeVisible();
  });
});
```

2. Use data-testid attributes for reliable selectors:

```typescript
// In component:
<button data-testid="submit-button">Submit</button>

// In test:
await page.getByTestId("submit-button").click();
```

3. Wait for network requests when needed:

```typescript
const responsePromise = page.waitForResponse(
  (response) =>
    response.url().includes("/api/sightings") &&
    response.request().method() === "POST"
);

await page.click('button[type="submit"]');
await responsePromise;
```

### Best Practices

1. **Use descriptive test names** that explain what is being tested
2. **Keep tests independent** - each test should work in isolation
3. **Use page.waitForLoadState()** instead of arbitrary timeouts
4. **Test user workflows** not implementation details
5. **Use data-testid** for elements that need stable selectors
6. **Clean up after tests** - the test database resets automatically
7. **Test error cases** not just happy paths

### Admin Test Helper

For tests that need admin access:

```typescript
const adminLogin = async (page: any) => {
  await page.goto("/admin/login");
  await page.fill('input[name="username"]', "admin");
  await page.fill('input[name="password"]', "Password!");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/admin");
};

test("admin test", async ({ page }) => {
  await adminLogin(page);
  // ... rest of test
});
```

## Troubleshooting

### Tests Failing Locally

1. **Clear test data**:

   ```bash
   rm -rf .local/e2e
   npm run test:db:down
   ```

2. **Reinstall Playwright browsers**:

   ```bash
   npx playwright install --force
   ```

3. **Check Node version**:
   ```bash
   node --version  # Should be 20.x or higher
   ```

### PostgreSQL Connection Issues

1. **Check if database is running**:

   ```bash
   docker ps | grep postgres
   ```

2. **Restart test database**:

   ```bash
   npm run test:db:down
   npm run test:db:up
   ```

3. **Verify connection**:
   ```bash
   docker exec -it SignalFeed-db-test psql -U SignalFeed_test -d SignalFeed_test -c "SELECT version();"
   ```

### Tests Timing Out

1. **Increase timeout** in `playwright.config.ts`:

   ```typescript
   timeout: 60_000, // 60 seconds
   ```

2. **Use explicit waits** instead of `waitForTimeout`:
   ```typescript
   await page.waitForLoadState("networkidle");
   await page.waitForSelector('text="Expected Text"');
   ```

### Flaky Tests

1. **Add proper waits** for dynamic content
2. **Check for race conditions** in the application
3. **Use retry logic** for unavoidable flakiness:
   ```typescript
   test("flaky test", async ({ page }) => {
     // Test code
   }).retries(2);
   ```

### CI/CD Issues

1. **Check GitHub Actions logs** for detailed error messages
2. **Reproduce locally** using CI environment variables:

   ```bash
   CI=true npm run e2e
   ```

3. **View artifacts** for Playwright reports and screenshots

## Performance Tips

1. **Run tests in parallel** when possible (default: 1 worker)
2. **Use file storage** for faster local development
3. **Use PostgreSQL tests** when testing database-specific features
4. **Skip tests during development** with `.only()`:
   ```typescript
   test.only("focus on this test", async ({ page }) => {
     // ...
   });
   ```

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Support

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/your-org/SignalFeed/issues)
2. Review Playwright traces: `npx playwright show-trace trace.zip`
3. Run tests in debug mode: `npx playwright test --debug`
