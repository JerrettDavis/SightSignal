import { getAdminAccess } from "@/shared/auth-helpers";
import { jsonOk, jsonUnauthorized } from "@/shared/http";

export const runtime = "nodejs";

export const GET = async () => {
  console.log("[Admin Auth Verify] Checking admin access...");
  const access = await getAdminAccess();

  console.log("[Admin Auth Verify] Access result:", {
    isAdmin: access.isAdmin,
    username: access.username,
    email: access.email,
  });

  if (!access.isAdmin) {
    console.log("[Admin Auth Verify] Not admin, returning 401");
    return jsonUnauthorized("Not authenticated.");
  }

  console.log("[Admin Auth Verify] Admin access granted");
  return jsonOk({
    authenticated: true,
    username: access.username,
    ...(access.email && { email: access.email }),
  });
};
