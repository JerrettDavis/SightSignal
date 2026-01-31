# SignalFeed Admin Panel Setup Guide

## Quick Start

### 1. Generate Admin Password Hash

```bash
node scripts/generate-admin-hash.mjs "YourPassword123!"
```

This will output something like:

```
✓ Password hashed successfully!

Hashed password:
$2b$10$3ucZ/lmCdbbQNyxmXgDv2uBIXueZcUdtKpJVYkd5NvVdZyZVyRl3C
```

### 2. Configure Environment Variables

Create or update your `.env` file:

```bash
# Enable admin authentication
ADMIN_AUTH_ENABLED=true

# JWT secret (minimum 32 characters)
ADMIN_JWT_SECRET=your-secret-min-32-chars-change-in-production

# Admin users - IMPORTANT: Escape $ symbols with backslash!
ADMIN_USERS="admin:\$2b\$10\$3ucZ/lmCdbbQNyxmXgDv2uBIXueZcUdtKpJVYkd5NvVdZyZVyRl3C"
```

**⚠️ CRITICAL: Bcrypt hashes contain `$` symbols which must be escaped!**

❌ Wrong:

```bash
ADMIN_USERS=admin:$2b$10$abc123...
```

✅ Correct:

```bash
ADMIN_USERS="admin:\$2b\$10\$abc123..."
```

### 3. Restart Development Server

```bash
npm run dev
```

### 4. Access Admin Panel

1. Navigate to `http://localhost:3000`
2. Look for the "Admin" button in the top navigation (appears after verification)
3. Or go directly to `http://localhost:3000/admin`
4. Login with your username and password

## Configuration Options

### Disable Authentication (Local Development)

To access the admin panel without login:

```bash
ADMIN_AUTH_ENABLED=false
```

### Multiple Admin Users

Separate multiple users with commas:

```bash
ADMIN_USERS="admin:\$2b\$10\$hash1,admin2:\$2b\$10\$hash2"
```

## Admin Panel Features

### Dashboard (`/admin`)

- Total sightings, active, resolved, critical
- Geofence counts (total and public)
- Subscription count
- Quick statistics with percentages

### Sightings Management (`/admin/sightings`)

- View all sightings in table format
- Search by description
- Edit (description, status, importance)
- Delete individual or bulk delete multiple
- Color-coded importance badges

### Geofences Management (`/admin/geofences`)

- View all geofences
- Search by name
- Edit (name, visibility)
- Delete individual or bulk operations
- Public/private visibility badges

### Subscriptions Management (`/admin/subscriptions`)

- View all email subscriptions
- Search by email
- Edit (email, trust level)
- Delete individual or bulk operations
- Trust level indicators

## Security Best Practices

### 1. Strong JWT Secret

```bash
# Generate a secure random secret:
openssl rand -base64 32
```

### 2. Strong Passwords

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Use a password manager

### 3. Never Commit Secrets

- `.env` file is git-ignored by default
- Never commit real passwords or secrets
- Use different secrets for dev/staging/prod

### 4. Production Checklist

- [ ] Set `ADMIN_AUTH_ENABLED=true`
- [ ] Use strong, unique `ADMIN_JWT_SECRET`
- [ ] Use strong admin passwords
- [ ] Hashes properly escaped in environment
- [ ] HTTPS enabled (`NODE_ENV=production`)
- [ ] Cookies set to `secure: true` (automatic in production)

## Troubleshooting

### "Invalid username or password" error

**Check 1: Environment variables loaded?**

```bash
# Restart your dev server completely
npm run dev
```

**Check 2: Hash escaped correctly?**

Your `.env` should have:

```bash
ADMIN_USERS="admin:\$2b\$10\$..."
```

NOT:

```bash
ADMIN_USERS=admin:$2b$10$...
```

**Check 3: Verify hash matches password**

Create `test-hash.mjs`:

```javascript
import bcrypt from "bcrypt";

const password = "YourPassword";
const hash = "$2b$10$...your-hash...";

const result = await bcrypt.compare(password, hash);
console.log("Match:", result);
```

Run:

```bash
node test-hash.mjs
```

### Admin button not appearing in main app

1. Login to admin panel first
2. The verify endpoint must return 200 OK
3. Check browser console for errors

### Session expires too quickly

Default is 24 hours. To change, edit `src/app/api/admin/auth/login/route.ts`:

```typescript
maxAge: 60 * 60 * 24 * 7; // 7 days
```

## Development

### Run E2E Tests

```bash
npx playwright test tests/e2e/admin-login.spec.ts
```

### Test Password Hash

```bash
node scripts/generate-admin-hash.mjs "TestPassword"
```

## Architecture

The admin system follows Clean Architecture:

```
domain/auth/          - Admin user entity
ports/auth.ts         - JWT, password, repository interfaces
adapters/auth/        - JWT service, password service, env repository
application/use-cases/auth/ - Login use case
app/api/admin/        - Protected API endpoints
app/admin/            - Admin UI pages
middleware.ts         - Route protection
```

All admin API endpoints are protected with `requireAuth()` from `@/shared/auth-helpers`.

## Support

For issues or questions:

1. Check this documentation
2. Review `.env.example` for correct format
3. Check server logs for detailed errors
4. Verify environment variables with debug endpoint (dev only)
