# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

**Note**: As we are currently in early development (pre-1.0), we recommend always using the latest version from the `master` branch for the most up-to-date security patches.

## Reporting a Vulnerability

We take the security of SightSignal seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do NOT:

- **Open a public issue** - Security vulnerabilities should never be discussed publicly until they have been addressed
- **Share the vulnerability** on social media, forums, or other public channels
- **Exploit the vulnerability** in any way that could harm users or the service

### Please DO:

1. **Email us directly** at [security@sightsignal.example.com](mailto:security@sightsignal.example.com)
   - Use "SECURITY VULNERABILITY" in the subject line
   - Include detailed information about the vulnerability
   - Provide steps to reproduce if possible

2. **Include the following information** (if applicable):
   - Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)
   - Full paths of source file(s) related to the vulnerability
   - Location of the affected source code (tag/branch/commit or direct URL)
   - Any special configuration required to reproduce the issue
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue, including how an attacker might exploit it

3. **Allow reasonable time for a fix** before public disclosure
   - We aim to respond within 48 hours
   - We will work with you to understand and address the issue
   - We will keep you informed of our progress

## Response Timeline

When you report a vulnerability, we commit to the following timeline:

- **Within 48 hours**: Acknowledge receipt of your vulnerability report
- **Within 7 days**: Provide an initial assessment and expected timeline for a fix
- **Ongoing**: Keep you updated on our progress toward a fix
- **Upon fix**: Coordinate with you on timing for public disclosure
- **After fix**: Credit you in the security advisory (if you wish)

## Security Update Process

When we release a security update:

1. We will release a patch as quickly as possible
2. We will publish a security advisory on GitHub
3. We will notify users through:
   - GitHub security advisories
   - Release notes
   - README updates
4. We will credit researchers who responsibly disclosed the vulnerability (unless they prefer to remain anonymous)

## Security Best Practices for Users

### For Development

- **Never commit sensitive data** to the repository (API keys, passwords, connection strings)
- **Use environment variables** for all configuration and secrets
- **Keep dependencies up to date** - run `npm audit` regularly
- **Review security warnings** from npm/GitHub Dependabot

### For Deployment

- **Use HTTPS** in production environments
- **Set strong passwords** for database and admin accounts
- **Restrict database access** to only necessary services
- **Enable PostgreSQL SSL** in production
- **Use environment variables** for all sensitive configuration
- **Keep Docker images updated** if using containerization
- **Implement rate limiting** on API endpoints
- **Use proper CORS settings** to restrict API access
- **Enable authentication** for admin features
- **Regular backups** of your data

### Environment Security

Create a `.env.local` file (never commit this) with:

```env
# Database
SIGHTSIGNAL_DATABASE_URL=postgresql://user:STRONG_PASSWORD@host:5432/db

# Session secrets (generate strong random strings)
SESSION_SECRET=generate-a-long-random-secret-here

# API keys (never commit these)
MAPBOX_API_KEY=your_api_key_here
```

**Generate strong secrets**:
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

## Vulnerability Disclosure Policy

We believe in responsible disclosure. Once we have addressed a reported vulnerability:

1. **Embargo period**: We request a 90-day embargo from initial report to public disclosure
2. **Coordinated disclosure**: We will work with you to coordinate disclosure timing
3. **Public advisory**: We will publish a security advisory with:
   - Description of the vulnerability
   - Affected versions
   - Fixed versions
   - Workarounds (if any)
   - Credit to the reporter (with permission)

## Security Features

SightSignal implements the following security measures:

### Authentication & Authorization
- Password hashing using bcrypt
- JWT-based session management
- Role-based access control for admin features

### Data Protection
- Input validation using Zod schemas
- SQL injection prevention through parameterized queries
- XSS prevention through React's built-in escaping

### API Security
- CORS configuration
- Request validation
- Error handling that doesn't leak sensitive information

### Infrastructure
- Docker containerization
- Environment-based configuration
- Separation of development and production settings

## Known Security Limitations

As an early-stage project, please be aware of these current limitations:

- Authentication system is basic and intended for initial development
- Rate limiting is not yet implemented
- Full security audit has not been performed
- Production deployment guide is still in development

We are actively working on addressing these limitations. Contributions are welcome!

## Security-Related Configuration

### Database Security

When using PostgreSQL:

```sql
-- Create restricted user for the application
CREATE USER sightsignal_app WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE sightsignal TO sightsignal_app;
GRANT USAGE ON SCHEMA public TO sightsignal_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sightsignal_app;
```

### Docker Security

When deploying with Docker:

```yaml
# Use non-root user
user: node

# Read-only root filesystem where possible
read_only: true

# Drop unnecessary capabilities
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE
```

## Third-Party Dependencies

We monitor our dependencies for security vulnerabilities using:

- **npm audit**: Regular checks of npm packages
- **Dependabot**: Automated security updates on GitHub
- **Manual review**: Regular review of dependency changes

To check for vulnerabilities in your installation:

```bash
npm audit
npm audit fix  # Apply automatic fixes
```

## Questions?

If you have questions about security that don't involve reporting a vulnerability:

- Review our [documentation](docs/)
- Check existing [security advisories](https://github.com/your-org/sightsignal/security/advisories)
- Open a [discussion](https://github.com/your-org/sightsignal/discussions) (for general security questions)

## Bug Bounty Program

We do not currently have a bug bounty program. However, we deeply appreciate security researchers who help us keep SightSignal secure and will:

- Acknowledge your contribution publicly (with your permission)
- Credit you in our security advisories
- Feature you in our contributors list

Thank you for helping keep SightSignal and our users safe!
