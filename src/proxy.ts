import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const isAuthEnabled = (): boolean => {
  return process.env.ADMIN_AUTH_ENABLED !== "false";
};

const getSecret = (): Uint8Array | null => {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
};

/**
 * Check if an email is in the admin accounts list
 */
const isAdminEmail = (email: string): boolean => {
  const adminAccounts = process.env.ADMIN_ACCOUNTS || "";
  if (!adminAccounts) {
    return false;
  }

  const adminEmails = adminAccounts
    .split(";")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  return adminEmails.includes(email.toLowerCase());
};

/**
 * Check if request has admin access via token OR session email
 */
const hasAdminAccess = async (request: NextRequest): Promise<boolean> => {
  // Check for admin token (credential-based login)
  const token = request.cookies.get("admin-token")?.value;
  if (token) {
    const secret = getSecret();
    if (secret) {
      try {
        await jwtVerify(token, secret);
        return true;
      } catch {
        // Token invalid, continue to check session
      }
    }
  }

  // Check for user session with admin email
  const sessionData = request.cookies.get("session_data")?.value;
  if (sessionData) {
    try {
      const session = JSON.parse(sessionData);

      // Check if session expired
      if (new Date(session.expiresAt) < new Date()) {
        return false;
      }

      // Check if user's email is in admin list
      if (session.email && isAdminEmail(session.email)) {
        return true;
      }
    } catch {
      // Session parsing failed
    }
  }

  return false;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Skip protection if auth is disabled
  if (!isAuthEnabled()) {
    return NextResponse.next();
  }

  // Allow access to login page
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Check for admin access (token OR session email)
  const hasAccess = await hasAdminAccess(request);

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
