# Contributing to SignalFeed

Thank you for your interest in contributing to SignalFeed! We welcome contributions from the community and are grateful for any help you can provide.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Code Style](#code-style)
- [Project Structure](#project-structure)

## Getting Started

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/signalfeed.git
   cd signalfeed
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/your-org/signalfeed.git
   ```
4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Sync Your Fork

Before starting work, sync your fork with upstream:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

## Development Setup

### Prerequisites

- **Node.js**: 20.x or higher
- **npm**: 10.x or higher
- **Docker**: (optional) for PostgreSQL database
- **Git**: Latest stable version

### Quick Start

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start development server** (with file-based storage):

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

3. **Start with PostgreSQL** (recommended):
   ```bash
   npm run dev:stack
   ```
   This starts PostgreSQL in Docker and the Next.js dev server.

### Environment Configuration

Create a `.env.local` file for local configuration:

```env
# Data storage: 'file', 'memory', or 'postgres'
SIGNALFEED_DATA_STORE=file

# Directory for file-based storage (default: .local)
SIGNALFEED_DATA_DIR=.local

# PostgreSQL connection (when using postgres storage)
SIGNALFEED_DATABASE_URL=postgresql://signalfeed:local@localhost:5432/signalfeed

# MapLibre style URL
NEXT_PUBLIC_MAP_STYLE_URL=/map-style.json
```

### Docker Development

For a fully containerized environment:

```bash
npm run dev:compose
```

To stop:

```bash
npm run dev:compose:down
```

To reset (removes volumes):

```bash
npm run dev:compose:reset
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification for clear and structured commit messages.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (formatting, whitespace)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Changes to build process or auxiliary tools

### Examples

```
feat(map): add clustering for dense sighting areas

Implemented marker clustering to improve map performance
when displaying large numbers of sightings in a small area.

Closes #123
```

```
fix(api): handle missing geofence coordinates

Added validation to ensure coordinates array is not empty
before creating a geofence.

Fixes #456
```

```
docs: update API documentation for subscriptions

Added examples for POST /api/subscriptions endpoint
and clarified required fields.
```

### Best Practices

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Limit first line to 72 characters
- Reference issues and PRs in the footer
- Explain _what_ and _why_ in the body, not _how_

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**:

   ```bash
   npm run test          # Unit tests
   npm run e2e           # End-to-end tests
   npm run typecheck     # TypeScript checks
   npm run lint          # Linting
   ```

2. **Update documentation** if you've changed APIs or functionality

3. **Add tests** for new features or bug fixes

4. **Follow code style** guidelines (see below)

### Pull Request Checklist

- [ ] My code follows the project's code style
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

### Pull Request Guidelines

1. **Keep PRs focused**: One feature or fix per PR
2. **Provide context**: Explain what, why, and how in the PR description
3. **Link issues**: Reference related issues using "Closes #123" or "Fixes #456"
4. **Respond to feedback**: Be open to suggestions and iterate on your code
5. **Keep commits clean**: Consider squashing commits before merging

### PR Description Template

A template is provided at `.github/PULL_REQUEST_TEMPLATE.md`. Please fill it out completely.

## Testing

### Unit Tests

We use [Vitest](https://vitest.dev/) for unit testing:

```bash
# Run tests once
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test -- --coverage
```

### End-to-End Tests

We use [Playwright](https://playwright.dev/) for E2E testing:

```bash
# Run E2E tests
npm run e2e

# Run E2E tests with UI
npm run e2e:ui

# Run E2E tests with PostgreSQL
npm run e2e:postgres
```

### Writing Tests

- Place unit tests next to the code they test: `component.test.ts`
- Place E2E tests in the `tests/` directory
- Follow existing test patterns and conventions
- Aim for meaningful test names that describe what is being tested
- Test both happy paths and error cases

Example unit test:

```typescript
import { describe, it, expect } from "vitest";
import { calculateDistance } from "./distance";

describe("calculateDistance", () => {
  it("should calculate distance between two points", () => {
    const result = calculateDistance({ lat: 0, lng: 0 }, { lat: 1, lng: 1 });
    expect(result).toBeGreaterThan(0);
  });

  it("should return 0 for same point", () => {
    const result = calculateDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 0 });
    expect(result).toBe(0);
  });
});
```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode in `tsconfig.json`
- Define explicit types for function parameters and return values
- Use interfaces for object shapes, types for unions/intersections
- Avoid `any` type; use `unknown` when type is truly unknown

### ESLint and Prettier

We use ESLint and Prettier for code formatting and linting:

```bash
# Run linter
npm run lint

# Format code (if configured)
npm run format
```

Configuration files:

- `.eslintrc.json` or `eslint.config.mjs` for ESLint
- `.prettierrc` for Prettier

### Naming Conventions

- **Files**: Use kebab-case for file names (`user-service.ts`)
- **Components**: Use PascalCase for React components (`MapView.tsx`)
- **Functions**: Use camelCase for functions (`getUserById`)
- **Constants**: Use UPPER_SNAKE_CASE for constants (`MAX_RETRIES`)
- **Types/Interfaces**: Use PascalCase (`UserProfile`, `SightingData`)

### Code Organization

Follow clean architecture principles:

```
src/
├── domain/          # Business entities and domain logic
├── application/     # Use cases and application services
├── ports/           # Interface definitions (repositories, providers)
├── adapters/        # Concrete implementations of ports
├── contracts/       # Runtime validation schemas (Zod)
├── components/      # React components
├── app/             # Next.js App Router pages and API routes
└── shared/          # Shared utilities and helpers
```

## Project Structure

### Architecture Overview

SignalFeed follows **Clean Architecture** principles:

1. **Domain Layer** (`src/domain/`): Core business entities and rules
   - No external dependencies
   - Pure TypeScript types and business logic

2. **Application Layer** (`src/application/`): Use cases
   - Orchestrates domain entities
   - Defines port interfaces

3. **Ports** (`src/ports/`): Interface definitions
   - Repository interfaces
   - Provider interfaces
   - Abstractions for external services

4. **Adapters** (`src/adapters/`): Concrete implementations
   - File-based storage
   - PostgreSQL repository
   - External service integrations

5. **Contracts** (`src/contracts/`): Runtime validation
   - Zod schemas for API validation
   - Input/output validation

### Key Technologies

- **Next.js 16**: App Router, Server Components, API Routes
- **React 19**: Latest React features
- **TypeScript 5**: Type safety and developer experience
- **Tailwind CSS 4**: Utility-first styling
- **MapLibre GL**: Interactive maps
- **PostgreSQL**: Primary database (with alternatives)
- **Zod**: Runtime type validation
- **Vitest**: Unit testing
- **Playwright**: E2E testing

### Adding New Features

When adding a new feature:

1. Start with **domain entities** if needed
2. Define **port interfaces** for external dependencies
3. Implement **use cases** in the application layer
4. Create **adapters** for concrete implementations
5. Add **API routes** in `src/app/api/`
6. Build **UI components** in `src/components/`
7. Create **pages** in `src/app/`
8. Add **tests** at each layer
9. Update **documentation**

## Questions?

- Open an issue for bugs or feature requests
- Join discussions in existing issues
- Review our [documentation](docs/)
- Check out the [architecture guide](docs/architecture.md)

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms. Be respectful, inclusive, and constructive in all interactions.

## License

By contributing to SignalFeed, you agree that your contributions will be licensed under the MIT License.
