# Vercel Deployment Guide

## Current Status

✅ **Local Build**: Passes successfully
✅ **Production Deployment**: Now working (https://sight-signal.vercel.app)
⚠️ **Preview Deployments (GitHub)**: Intermittent failures - see known issues below

## Build Issues Identified

### 1. Missing Environment Variables (CRITICAL)

The application requires these environment variables to build:

```env
# Admin Authentication (Required)
ADMIN_AUTH_ENABLED=true
ADMIN_JWT_SECRET=<your-32-char-secret>
ADMIN_USERS=<admin:bcrypt-hash>

# Data Store Configuration
SIGHTSIGNAL_DATA_STORE=file
SIGHTSIGNAL_DATA_DIR=.local

# Optional PostgreSQL (if using postgres store)
# SIGHTSIGNAL_DATABASE_URL=postgresql://...
```

### 2. Missing npm Script (FIXED)

**Issue**: CI workflow expected `npm run test:coverage` which was missing.
**Fix**: Added `"test:coverage": "vitest run --coverage"` to package.json

### 3. Environment Variable Corruption (CRITICAL - FIXED)

**Issue**: Environment variables contained literal `\n` characters at the end of values.
**Root Cause**: Using `printf "value\n"` when adding environment variables via Vercel CLI stored the literal string `"true\n"` instead of just `"true"`.
**Impact**: Builds failed because the middleware couldn't parse the corrupted JWT secret.

**How to Detect**:

```bash
# Pull environment variables and check for \n characters
vercel env pull .env.verify
cat .env.verify

# If you see values like this, they're corrupted:
# ADMIN_AUTH_ENABLED="true\n"
# ADMIN_JWT_SECRET="secret-value\n"
```

**Fix Applied**:

1. Removed all corrupted environment variables: `vercel env rm VAR_NAME environment`
2. Re-added using `echo -n` (no newline):
   ```bash
   echo -n "true" | vercel env add ADMIN_AUTH_ENABLED production
   echo -n "your-secret" | vercel env add ADMIN_JWT_SECRET production
   ```
3. Verified values are clean: `vercel env pull .env.verify`

**Current Status**: Fixed for Production, Preview, and Development environments

## How to Fix Vercel Deployments

### Step 1: Configure Environment Variables in Vercel

1. Go to https://vercel.com/jerrettdavis-projects/sight-signal/settings/environment-variables

2. Add the following environment variables for **All Environments** (Production, Preview, Development):

   ```
   ADMIN_AUTH_ENABLED = true
   ADMIN_JWT_SECRET = <generate with: openssl rand -base64 32>
   ADMIN_USERS = <generate with: node scripts/generate-admin-hash.mjs YourPassword>
   SIGHTSIGNAL_DATA_STORE = file
   SIGHTSIGNAL_DATA_DIR = .local
   ```

3. **Important**: For `ADMIN_USERS`, the format is:

   ```
   username:$2b$10$hashedPasswordHere
   ```

   Generate the hash locally:

   ```bash
   node scripts/generate-admin-hash.mjs YourSecurePassword
   ```

### Step 2: Redeploy

After adding environment variables:

1. Go to Deployments tab
2. Click on a failed deployment
3. Click "Redeploy" button

OR trigger a new deployment:

```bash
git commit --allow-empty -m "chore: trigger Vercel rebuild"
git push origin main
```

## Known Issues

### GitHub-Triggered Preview Deployments

**Symptom**: Preview deployments from GitHub pushes fail after 23-24 seconds with "Error" status.
**Verified Working**: Direct deployments via `vercel deploy` succeed with same environment variables.

**Possible Causes**:

1. **GitHub Integration Caching**: Vercel's GitHub integration may be caching old build settings
2. **Webhook Timing**: Environment variable updates may not propagate immediately to GitHub-triggered builds
3. **Build Context Differences**: GitHub-triggered builds may use different build context than CLI deployments

**Temporary Workaround**:

```bash
# Deploy directly using Vercel CLI instead of GitHub push
vercel deploy --prod  # For production
vercel deploy        # For preview
```

**Monitoring**:

- CLI deployments: ✅ Working (50s build time, all routes compiled)
- GitHub deployments: ⚠️ Failing (23s build time, early exit)

**Investigation Needed**:

- Check Vercel project settings for GitHub integration configuration
- Verify webhook configuration
- Consider clearing Vercel build cache
- Test with fresh PR to see if issue persists

## Successful Deployment Checklist

- [x] All required environment variables added to Vercel
- [x] Environment variables set for Production, Preview, AND Development environments
- [x] Environment variables verified clean (no `\n` characters)
- [x] `test:coverage` script added to package.json
- [x] Build passes locally (`npm run build`)
- [x] Production deployment succeeds via Vercel CLI
- [ ] Preview deployments from GitHub working (currently using CLI workaround)

## Verifying Environment Variables

Before deploying, verify environment variables are clean:

```bash
# Pull environment variables for each environment
vercel env pull --environment=production .env.prod.verify
vercel env pull --environment=preview .env.preview.verify
vercel env pull --environment=development .env.dev.verify

# Check for corrupted values (should NOT see \n at end of lines)
cat .env.prod.verify

# Good (clean):
ADMIN_AUTH_ENABLED="true"
ADMIN_JWT_SECRET="bttXaiu7jSj8NtS4vSUs0Rb8qTg98n/xTJ65shoR+6E="

# Bad (corrupted):
ADMIN_AUTH_ENABLED="true\n"
ADMIN_JWT_SECRET="bttXaiu7jSj8NtS4vSUs0Rb8qTg98n/xTJ65shoR+6E=\n"
```

## Verifying Build Success

After deployment completes:

1. Check build logs in Vercel dashboard
2. Should see "Compiled successfully" message
3. Should see route list with all 42 API endpoints
4. Build should take 30-50 seconds (not 20-25 seconds for failures)
5. Deployment status should be "Ready" (not "Error")

**Production Deployment URL**: https://sight-signal.vercel.app

## Common Errors

### Error: "Build failed"

- **Cause**: Missing environment variables
- **Fix**: Add all required vars in Vercel settings

### Error: "npm run test:coverage not found"

- **Cause**: Missing script in package.json
- **Fix**: Already fixed in this commit

### Error: Authentication required

- **Cause**: Deployment protection enabled for preview branches
- **Fix**: This is normal for preview deployments, not an error

## Summary of Fixes Applied

1. ✅ Added missing `test:coverage` script to package.json
2. ✅ Configured environment variables in all Vercel environments (Production, Preview, Development)
3. ✅ Fixed environment variable corruption (removed literal `\n` characters)
4. ✅ Verified environment variables are clean across all environments
5. ✅ Production deployment now working via Vercel CLI
6. ⚠️ GitHub-triggered Preview deployments still having issues (use CLI workaround)

## Next Steps for Full Resolution

1. **Investigate GitHub Integration**:
   - Check Vercel dashboard for GitHub webhook configuration
   - Verify GitHub App permissions
   - Consider disconnecting and reconnecting GitHub integration

2. **Clear Build Cache**:

   ```bash
   # If GitHub deployments continue failing, try:
   vercel env pull  # Verify vars are clean
   # Then delete .vercel directory and reconnect
   ```

3. **Alternative Solution**:
   - Continue using `vercel deploy` via CLI for deployments
   - Set up GitHub Actions to run `vercel deploy` on push
   - This gives more control over deployment process
