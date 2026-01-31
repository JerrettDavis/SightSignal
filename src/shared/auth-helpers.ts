import { cookies } from "next/headers";
import { jwtService } from "@/adapters/auth/jwt-service";
import type { TokenPayload } from "@/ports/auth";
import type { AdminUserId } from "@/domain/auth/admin-user";

export const isAuthEnabled = (): boolean => {
  return process.env.ADMIN_AUTH_ENABLED !== "false";
};

export const getAuthToken = async (): Promise<TokenPayload | null> => {
  if (!isAuthEnabled()) {
    return {
      userId: "no-auth" as AdminUserId,
      username: "system",
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("admin-token")?.value;

  if (!token) return null;

  const service = jwtService();
  return service.verify(token);
};

export const requireAuth = async (): Promise<TokenPayload> => {
  const payload = await getAuthToken();

  if (!payload) {
    throw new Error("Unauthorized");
  }

  return payload;
};

/**
 * Check if an email is in the admin accounts list
 */
export const isAdminEmail = (email: string): boolean => {
  const adminAccounts = process.env.ADMIN_ACCOUNTS || "";
  console.log("[isAdminEmail] Checking email:", email);
  console.log("[isAdminEmail] ADMIN_ACCOUNTS env:", adminAccounts);

  if (!adminAccounts) {
    console.log("[isAdminEmail] No ADMIN_ACCOUNTS configured");
    return false;
  }

  const adminEmails = adminAccounts
    .split(";")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  console.log("[isAdminEmail] Admin emails list:", adminEmails);
  const isAdmin = adminEmails.includes(email.toLowerCase());
  console.log("[isAdminEmail] Is admin?", isAdmin);

  return isAdmin;
};

/**
 * Check if the current user session has admin access
 * Either via admin token OR via email-based admin access
 */
export const getAdminAccess = async (): Promise<{
  isAdmin: boolean;
  username: string | null;
  email?: string;
}> => {
  console.log("[getAdminAccess] Starting admin access check...");

  // First, check for admin token (credential-based login)
  const adminToken = await getAuthToken();
  if (adminToken) {
    console.log("[getAdminAccess] Admin token found:", adminToken.username);
    return {
      isAdmin: true,
      username: adminToken.username,
    };
  }

  console.log("[getAdminAccess] No admin token, checking user session...");

  // Second, check for regular user session with admin email
  const cookieStore = await cookies();
  const sessionData = cookieStore.get("session_data");

  if (!sessionData) {
    console.log("[getAdminAccess] No session data found");
    return { isAdmin: false, username: null };
  }

  try {
    const session = JSON.parse(sessionData.value);
    console.log("[getAdminAccess] Session found:", {
      email: session.email,
      expiresAt: session.expiresAt,
    });

    // Check if session expired
    if (new Date(session.expiresAt) < new Date()) {
      console.log("[getAdminAccess] Session expired");
      return { isAdmin: false, username: null };
    }

    // Check if user's email is in admin list
    if (session.email && isAdminEmail(session.email)) {
      console.log("[getAdminAccess] Email is in admin list:", session.email);
      return {
        isAdmin: true,
        username: session.username || session.email,
        email: session.email,
      };
    }

    console.log("[getAdminAccess] Email not in admin list:", session.email);
    return { isAdmin: false, username: null };
  } catch (error) {
    console.log("[getAdminAccess] Error parsing session:", error);
    return { isAdmin: false, username: null };
  }
};
