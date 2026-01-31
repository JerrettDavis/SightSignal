import { getPasskeyRepository } from "@/adapters/repositories/repository-factory";
import { jsonOk, jsonUnauthorized, jsonNotFound } from "@/shared/http";
import { cookies } from "next/headers";
import type { PasskeyId } from "@/domain/auth/passkey";

export const runtime = "nodejs";

export const DELETE = async (
  request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params;
    const cookieStore = await cookies();
    const sessionData = cookieStore.get("session_data");

    if (!sessionData) {
      return jsonUnauthorized("Not authenticated");
    }

    const session = JSON.parse(sessionData.value);

    if (new Date(session.expiresAt) < new Date()) {
      return jsonUnauthorized("Session expired");
    }

    const passkeyId = params.id as PasskeyId;
    const passkeyRepo = getPasskeyRepository();

    const passkey = await passkeyRepo.getById(passkeyId);

    if (!passkey) {
      return jsonNotFound("Passkey not found");
    }

    if (passkey.userId !== session.userId) {
      return jsonUnauthorized("Not authorized");
    }

    await passkeyRepo.delete(passkeyId);

    return jsonOk({ data: { message: "Passkey deleted" } });
  } catch (error) {
    console.error("Error deleting passkey:", error);
    return jsonUnauthorized("Failed to delete passkey");
  }
};
