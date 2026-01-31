"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

interface PasskeyEnrollmentProps {
  onSuccess: () => void;
  onSkip?: () => void;
}

export const PasskeyEnrollment = ({
  onSuccess,
  onSkip,
}: PasskeyEnrollmentProps) => {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passkeyName, setPasskeyName] = useState("");

  const handleEnroll = async () => {
    setIsEnrolling(true);
    setError(null);

    try {
      const optionsResponse = await fetch(
        "/api/auth/passkey/register/options",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!optionsResponse.ok) {
        const errorData = await optionsResponse.json();
        throw new Error(
          errorData.error?.message || "Failed to get registration options"
        );
      }

      const options = await optionsResponse.json();

      const credential = await startRegistration(options.data);

      const verifyResponse = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential,
          passkeyName: passkeyName || undefined,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(
          errorData.error?.message || "Failed to register passkey"
        );
      }

      onSuccess();
    } catch (err: unknown) {
      console.error("Passkey enrollment error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to enroll passkey";
      setError(message);
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Secure Your Account
      </h2>

      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Add a passkey for faster, more secure sign-ins. You can use your
        fingerprint, face, or device PIN.
      </p>

      <div className="mb-4">
        <label
          htmlFor="passkey-name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Device Name (Optional)
        </label>
        <input
          id="passkey-name"
          type="text"
          value={passkeyName}
          onChange={(e) => setPasskeyName(e.target.value)}
          placeholder="My Laptop"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isEnrolling}
        />
      </div>

      {error && (
        <div
          className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 
                        dark:border-red-700 rounded-md text-red-700 dark:text-red-300 text-sm"
        >
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleEnroll}
          disabled={isEnrolling}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                     text-white font-medium py-2 px-4 rounded-md
                     transition-colors duration-200"
        >
          {isEnrolling ? "Setting up..." : "Add Passkey"}
        </button>

        {onSkip && (
          <button
            onClick={onSkip}
            disabled={isEnrolling}
            className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 
                       dark:hover:bg-gray-600 disabled:opacity-50
                       text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-md
                       transition-colors duration-200"
          >
            Skip for Now
          </button>
        )}
      </div>
    </div>
  );
};
