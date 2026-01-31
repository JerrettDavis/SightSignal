import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import {
  getPasskeyRepository,
  getUserRepository,
} from "@/adapters/repositories/repository-factory";
import { createSession, generateSessionToken } from "@/domain/auth/auth";
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

// POST /api/auth/passkey/login/verify
export const POST = async (request: Request) => {
  try {
    const cookieStore = await cookies();
    const challengeCookie = cookieStore.get("passkey_auth_challenge");
    const userIdCookie = cookieStore.get("passkey_auth_user_id");

    if (!challengeCookie || !userIdCookie) {
      return jsonBadRequest("No challenge found");
    }

    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return jsonBadRequest("Missing credential");
    }

    const userId = userIdCookie.value as UserId;
    const credentialId = credential.id as PasskeyId;

    const passkeyRepo = getPasskeyRepository();
    const passkey = await passkeyRepo.getById(credentialId);

    if (!passkey || passkey.userId !== userId) {
      return jsonUnauthorized("Invalid passkey");
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challengeCookie.value,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: passkey.id,
        publicKey: new Uint8Array(
          passkey.credentialPublicKey
        ) as Uint8Array<ArrayBuffer>,
        counter: passkey.counter,
        transports: passkey.transports as (
          | "usb"
          | "nfc"
          | "ble"
          | "internal"
          | "hybrid"
        )[],
      },
    });

    if (!verification.verified) {
      return jsonUnauthorized("Verification failed");
    }

    await passkeyRepo.updateCounter(
      passkey.id,
      verification.authenticationInfo.newCounter
    );
    await passkeyRepo.updateLastUsed(passkey.id, new Date().toISOString());

    const userRepo = getUserRepository();
    const user = await userRepo.getById(userId);

    if (!user || user.status !== "active") {
      return jsonUnauthorized("Account not active");
    }

    const session = createSession(
      user.id,
      user.email,
      user.username,
      user.role
    );
    const sessionToken = generateSessionToken();

    const response = jsonOk({
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
      },
    });

    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    response.cookies.set("session_data", JSON.stringify(session), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    response.cookies.delete("passkey_auth_challenge");
    response.cookies.delete("passkey_auth_user_id");

    return response;
  } catch (error) {
    console.error("Error verifying passkey auth:", error);
    return jsonServerError("Failed to verify");
  }
};
