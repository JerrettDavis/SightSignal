# Release Process Guide

This document describes the release process for SignalFeed, including versioning strategy, release automation, and best practices.

## Table of Contents

- [Overview](#overview)
- [Semantic Versioning](#semantic-versioning)
- [Conventional Commits](#conventional-commits)
- [Release Process](#release-process)
- [Release Scripts](#release-scripts)
- [Emergency Releases](#emergency-releases)
- [Pre-release Versions](#pre-release-versions)
- [Troubleshooting](#troubleshooting)

## Overview

SignalFeed uses [standard-version](https://github.com/conventional-changelog/standard-version) for automated semantic versioning and changelog generation. The release process is semi-automated:

1. **Automated**: Version bumping and changelog generation based on conventional commits
2. **Manual**: Creating and pushing release tags triggers the GitHub Actions release workflow
3. **Automated**: Building, testing, and publishing releases on GitHub

## Semantic Versioning

We follow [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes that require user action
- **MINOR** (0.1.0): New features that are backwards-compatible
- **PATCH** (0.0.1): Backwards-compatible bug fixes

### Version Format

```
MAJOR.MINOR.PATCH[-PRERELEASE]

Examples:
- 1.0.0 (stable release)
- 1.0.0-alpha.1 (pre-release)
- 1.0.0-beta.2 (pre-release)
- 1.0.0-rc.1 (release candidate)
```

## Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages. This enables automatic changelog generation and version bumping.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type       | Description              | Version Bump | Appears in Changelog   |
| ---------- | ------------------------ | ------------ | ---------------------- |
| `feat`     | New feature              | MINOR        | Yes (Features)         |
| `fix`      | Bug fix                  | PATCH        | Yes (Bug Fixes)        |
| `docs`     | Documentation changes    | PATCH        | Yes (Documentation)    |
| `refactor` | Code refactoring         | PATCH        | Yes (Code Refactoring) |
| `perf`     | Performance improvements | PATCH        | Yes (Performance)      |
| `test`     | Test changes             | PATCH        | No                     |
| `chore`    | Build/tooling changes    | PATCH        | No                     |
| `style`    | Code style changes       | PATCH        | No                     |
| `ci`       | CI/CD changes            | PATCH        | No                     |

### Breaking Changes

To indicate a breaking change, add `BREAKING CHANGE:` in the footer or append `!` after the type:

```
feat!: redesign authentication API

BREAKING CHANGE: The authentication endpoint has changed from /api/auth/login to /api/v2/auth/login
```

This will trigger a MAJOR version bump.

### Examples

```bash
# Feature addition (minor bump)
git commit -m "feat: add export functionality for sightings"

# Bug fix (patch bump)
git commit -m "fix: correct map marker positioning on mobile"

# Documentation update
git commit -m "docs: update API endpoint documentation"

# Breaking change (major bump)
git commit -m "feat!: migrate to new database schema"
```

## Release Process

### Standard Release

Follow these steps for a standard release:

1. **Ensure clean working directory**

   ```bash
   git status
   # Commit or stash any changes
   ```

2. **Pull latest changes**

   ```bash
   git checkout main
   git pull origin main
   ```

3. **Run quality checks**

   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run e2e
   ```

4. **Run release script** (automatically determines version bump)

   ```bash
   npm run release
   ```

   This will:
   - Analyze commits since last tag
   - Bump version in `package.json`
   - Update `CHANGELOG.md`
   - Create a git commit with the changes
   - Create a git tag (e.g., `v1.2.3`)

5. **Review the changes**

   ```bash
   git log -1
   git show HEAD
   ```

6. **Push to GitHub**

   ```bash
   git push --follow-tags origin main
   ```

7. **Monitor the release workflow**
   - Go to GitHub Actions tab
   - Watch the release workflow execute
   - Verify the release appears in GitHub Releases

### Specific Version Release

To create a specific type of release:

```bash
# Patch release (0.0.x) - bug fixes only
npm run release:patch

# Minor release (0.x.0) - new features
npm run release:minor

# Major release (x.0.0) - breaking changes
npm run release:major
```

### First Release

For the first release of the project:

```bash
# Create initial release at 1.0.0
npm run release -- --first-release

# Or specify a different version
npm run release -- --first-release --release-as 0.1.0
```

## Release Scripts

The following scripts are available in `package.json`:

| Script                  | Description                             |
| ----------------------- | --------------------------------------- |
| `npm run release`       | Automatic version bump based on commits |
| `npm run release:patch` | Force patch version bump (0.0.x)        |
| `npm run release:minor` | Force minor version bump (0.x.0)        |
| `npm run release:major` | Force major version bump (x.0.0)        |

### Additional Options

```bash
# Dry run (see what would happen)
npm run release -- --dry-run

# Skip changelog generation
npm run release -- --skip.changelog

# Skip git commit
npm run release -- --skip.commit

# Skip git tag
npm run release -- --skip.tag

# Custom prerelease identifier
npm run release -- --prerelease alpha
```

## Emergency Releases

For critical bug fixes that need immediate release:

1. **Create hotfix branch from the tag**

   ```bash
   git checkout -b hotfix/critical-bug v1.2.3
   ```

2. **Make the fix and commit**

   ```bash
   git commit -m "fix: critical security vulnerability in authentication"
   ```

3. **Create patch release**

   ```bash
   npm run release:patch
   ```

4. **Push to repository**

   ```bash
   git push origin hotfix/critical-bug --follow-tags
   ```

5. **Create pull request to main**
   - Merge the hotfix back to main
   - Delete the hotfix branch

## Pre-release Versions

For testing releases before making them generally available:

### Alpha Release

```bash
npm run release -- --prerelease alpha
# Creates: 1.2.3-alpha.0

npm run release -- --prerelease alpha
# Creates: 1.2.3-alpha.1
```

### Beta Release

```bash
npm run release -- --prerelease beta
# Creates: 1.2.3-beta.0
```

### Release Candidate

```bash
npm run release -- --prerelease rc
# Creates: 1.2.3-rc.0
```

### Promoting to Stable

```bash
# From 1.2.3-rc.1 to 1.2.3
npm run release:patch
```

## GitHub Release Workflow

The automated release workflow (`.github/workflows/release.yml`) performs:

1. **Build Verification**
   - Type checking
   - Linting
   - Unit tests
   - Application build

2. **SBOM Generation**
   - Creates Software Bill of Materials using CycloneDX
   - Tracks all dependencies for security compliance

3. **Release Creation**
   - Extracts release notes from CHANGELOG.md
   - Creates GitHub Release
   - Marks pre-releases appropriately

4. **Artifact Upload**
   - Build artifacts (.tar.gz)
   - SBOM (sbom.json)
   - Source code (automatic)

### Workflow Triggers

The workflow is triggered by pushing a tag:

```bash
git push --tags origin main
```

Tag format must be: `v*.*.*` (e.g., `v1.2.3`, `v0.1.0-beta.1`)

## Troubleshooting

### Problem: "No commits since last tag"

**Solution**: You haven't made any commits since the last release. Make changes and commit them first.

### Problem: Version bump is wrong

**Solution**: Check your commit messages follow conventional commits format. Use explicit version with `--release-as`:

```bash
npm run release -- --release-as 1.2.3
```

### Problem: Wrong tag was created

**Solution**: Delete the tag locally and remotely:

```bash
git tag -d v1.2.3
git push origin :refs/tags/v1.2.3
```

Then recreate it:

```bash
npm run release
git push --follow-tags origin main
```

### Problem: Release workflow failed

**Solution**:

1. Check the Actions tab in GitHub for error details
2. Fix the issue
3. Delete the release and tag in GitHub
4. Delete the tag locally: `git tag -d v1.2.3`
5. Rerun the release process

### Problem: CHANGELOG has wrong information

**Solution**: Edit `CHANGELOG.md` manually before pushing tags:

```bash
# After running npm run release but before pushing
nano CHANGELOG.md
git add CHANGELOG.md
git commit --amend --no-edit
git tag -d v1.2.3
git tag v1.2.3
git push --follow-tags origin main
```

## Best Practices

1. **Always run tests before releasing**

   ```bash
   npm run typecheck && npm run lint && npm run test && npm run e2e
   ```

2. **Use conventional commits consistently** throughout development

3. **Review the generated CHANGELOG** before pushing tags

4. **Don't manually edit version numbers** in package.json - let standard-version handle it

5. **Tag format matters** - always use `v` prefix (e.g., `v1.2.3` not `1.2.3`)

6. **Coordinate releases** with the team - communicate before creating releases

7. **Test pre-releases** thoroughly before promoting to stable

8. **Document breaking changes** clearly in commit messages and CHANGELOG

## Release Checklist

Before creating a release:

- [ ] All tests passing (unit + e2e)
- [ ] No linting errors
- [ ] Type checking passes
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Security vulnerabilities addressed
- [ ] Dependencies up to date
- [ ] CHANGELOG reviewed (after running release script)
- [ ] Version number appropriate

After creating a release:

- [ ] GitHub workflow completed successfully
- [ ] Release notes accurate in GitHub
- [ ] Artifacts uploaded correctly
- [ ] SBOM generated
- [ ] Tag visible in repository
- [ ] Notify team/users of release

## Additional Resources

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [standard-version](https://github.com/conventional-changelog/standard-version)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [CycloneDX SBOM](https://cyclonedx.org/)
