import { jsonOk, jsonUnauthorized } from "@/shared/http";
import { cookies } from "next/headers";

export const runtime = "nodejs";

// GET /api/auth/me
export const GET = async () => {
  const cookieStore = await cookies();
  const sessionData = cookieStore.get("session_data");

  console.log("[Auth Check] Cookie present:", !!sessionData);

  if (!sessionData) {
    console.log("[Auth Check] No session cookie found");
    return jsonUnauthorized("Not authenticated");
  }

  try {
    const session = JSON.parse(sessionData.value);
    console.log("[Auth Check] Session parsed:", {
      userId: session.userId,
      expiresAt: session.expiresAt,
      now: new Date().toISOString(),
    });

    // Check if session expired
    if (new Date(session.expiresAt) < new Date()) {
      console.log("[Auth Check] Session expired");
      return jsonUnauthorized("Session expired");
    }

    console.log("[Auth Check] Session valid, user authenticated");
    return jsonOk({
      data: {
        user: {
          id: session.userId,
          email: session.email,
          username: session.username,
          role: session.role,
        },
      },
    });
  } catch (error) {
    console.error("[Auth Check] Failed to parse session:", error);
    return jsonUnauthorized("Invalid session");
  }
};
