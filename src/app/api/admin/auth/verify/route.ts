import { getAdminAccess } from "@/shared/auth-helpers";
import { jsonOk, jsonUnauthorized } from "@/shared/http";

export const runtime = "nodejs";

export const GET = async () => {
  const access = await getAdminAccess();

  if (!access.isAdmin) {
    return jsonUnauthorized("Not authenticated.");
  }

  return jsonOk({
    authenticated: true,
    username: access.username,
    ...(access.email && { email: access.email }),
  });
};
