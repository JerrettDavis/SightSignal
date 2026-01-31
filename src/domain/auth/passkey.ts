import type { UserId } from "@/domain/users/user";

export type PasskeyId = string & { readonly __brand: "PasskeyId" };

export type Passkey = {
  id: PasskeyId; // credential_id from WebAuthn
  userId: UserId;
  credentialPublicKey: Uint8Array;
  counter: number;
  transports: string[];
  backupEligible: boolean;
  backupState: boolean;
  name?: string; // User-friendly name
  createdAt: string;
  lastUsedAt?: string;
};

export type NewPasskey = Omit<Passkey, "createdAt" | "lastUsedAt">;

// WebAuthn specific types
export type AuthenticatorTransport = "usb" | "nfc" | "ble" | "internal";

export type PasskeyRegistrationOptions = {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: "public-key";
    alg: number;
  }>;
  timeout?: number;
  attestation?: "none" | "indirect" | "direct";
  authenticatorSelection?: {
    authenticatorAttachment?: "platform" | "cross-platform";
    requireResidentKey?: boolean;
    residentKey?: "discouraged" | "preferred" | "required";
    userVerification?: "required" | "preferred" | "discouraged";
  };
};

export type PasskeyAuthenticationOptions = {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{
    type: "public-key";
    id: string;
    transports?: AuthenticatorTransport[];
  }>;
  userVerification?: "required" | "preferred" | "discouraged";
};
