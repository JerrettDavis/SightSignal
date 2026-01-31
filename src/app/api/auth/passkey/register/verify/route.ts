import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getPasskeyRepository } from "@/adapters/repositories/repository-factory";
import {
  jsonOk,
  jsonBadRequest,
  jsonUnauthorized,
  jsonServerError,
} from "@/shared/http";
import { cookies } from "next/headers";
import type { PasskeyId } from "@/domain/auth/passkey";
import type { UserId } from "@/domain/users/user";

export const runtime = "nodejs";

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || "localhost";
const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN || "http://localhost:3000";

// POST /api/auth/passkey/register/verify
export const POST = async (request: Request) => {
  try {
    const cookieStore = await cookies();
    const sessionData = cookieStore.get("session_data");
    const challengeCookie = cookieStore.get("passkey_challenge");

    if (!sessionData) {
      return jsonUnauthorized("Must be logged in");
    }

    if (!challengeCookie) {
      return jsonBadRequest("No challenge found");
    }

    const session = JSON.parse(sessionData.value);

    if (new Date(session.expiresAt) < new Date()) {
      return jsonUnauthorized("Session expired");
    }

    const body = await request.json();
    const { credential, passkeyName } = body;

    if (!credential) {
      return jsonBadRequest("Missing credential");
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challengeCookie.value,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return jsonBadRequest("Verification failed");
    }

    const {
      credential: registeredCredential,
      credentialDeviceType,
      credentialBackedUp,
    } = verification.registrationInfo;

    const passkeyRepo = getPasskeyRepository();
    await passkeyRepo.create({
      id: registeredCredential.id as PasskeyId,
      userId: session.userId as UserId,
      credentialPublicKey: registeredCredential.publicKey,
      counter: registeredCredential.counter,
      transports: registeredCredential.transports || [],
      backupEligible: credentialBackedUp,
      backupState: credentialBackedUp,
      name: passkeyName || `Passkey (${credentialDeviceType || "Unknown"})`,
    });

    const response = jsonOk({ data: { message: "Passkey registered" } });
    response.cookies.delete("passkey_challenge");

    return response;
  } catch (error) {
    console.error("Error verifying passkey:", error);
    return jsonServerError("Failed to verify passkey");
  }
};
