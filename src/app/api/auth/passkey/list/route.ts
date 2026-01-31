import { getPasskeyRepository } from "@/adapters/repositories/repository-factory";
import { jsonOk, jsonUnauthorized } from "@/shared/http";
import { cookies } from "next/headers";

export const runtime = "nodejs";

// GET /api/auth/passkey/list
export const GET = async () => {
  try {
    const cookieStore = await cookies();
    const sessionData = cookieStore.get("session_data");

    console.log("[Passkey List] Session check:", {
      hasSessionData: !!sessionData,
      sessionValue: sessionData?.value ? "present" : "missing",
    });

    if (!sessionData) {
      console.error("[Passkey List] No session data found");
      return jsonUnauthorized("Not authenticated");
    }

    const session = JSON.parse(sessionData.value);

    console.log("[Passkey List] Session parsed:", {
      userId: session.userId,
      email: session.email,
      expiresAt: session.expiresAt,
      isExpired: new Date(session.expiresAt) < new Date(),
    });

    if (new Date(session.expiresAt) < new Date()) {
      console.error("[Passkey List] Session expired");
      return jsonUnauthorized("Session expired");
    }

    const passkeyRepo = getPasskeyRepository();
    const passkeys = await passkeyRepo.listByUserId(session.userId);

    console.log("[Passkey List] Found passkeys:", passkeys.length);

    // Don't send sensitive data to client
    const safePasskeys = passkeys.map((pk) => ({
      id: pk.id,
      name: pk.name,
      createdAt: pk.createdAt,
      lastUsedAt: pk.lastUsedAt,
      transports: pk.transports,
    }));

    return jsonOk({ data: { passkeys: safePasskeys } });
  } catch (error) {
    console.error("[Passkey List] Error:", error);
    return jsonUnauthorized("Failed to list passkeys");
  }
};
