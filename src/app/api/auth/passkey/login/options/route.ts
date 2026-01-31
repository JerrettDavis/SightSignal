import { generateAuthenticationOptions } from "@simplewebauthn/server";
import {
  getPasskeyRepository,
  getUserRepository,
} from "@/adapters/repositories/repository-factory";
import { jsonOk, jsonBadRequest, jsonServerError } from "@/shared/http";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || "localhost";

// POST /api/auth/passkey/login/options
export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const { email } = body;

    console.log("[Passkey Login Options] Request for email:", email);

    if (!email) {
      return jsonBadRequest("Email required");
    }

    const userRepo = getUserRepository();
    const user = await userRepo.getByEmail(email);

    console.log("[Passkey Login Options] User found:", !!user, user?.id);

    if (!user) {
      return jsonBadRequest("User not found");
    }

    const passkeyRepo = getPasskeyRepository();
    const passkeys = await passkeyRepo.listByUserId(user.id);

    console.log("[Passkey Login Options] Passkeys found:", passkeys.length);

    if (passkeys.length === 0) {
      return jsonBadRequest("No passkeys registered");
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: passkeys.map((pk) => ({
        id: pk.id,
        transports: pk.transports as (
          | "usb"
          | "nfc"
          | "ble"
          | "internal"
          | "hybrid"
        )[],
      })),
      userVerification: "preferred",
    });

    console.log("[Passkey Login Options] Options generated successfully");

    const response = jsonOk({ data: options });
    response.cookies.set("passkey_auth_challenge", options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 5,
      path: "/",
    });
    response.cookies.set("passkey_auth_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 5,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error generating auth options:", error);
    return jsonServerError("Failed to generate options");
  }
};
