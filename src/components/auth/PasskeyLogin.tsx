"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";

interface PasskeyLoginProps {
  onSuccess: (user: {
    id: string;
    email: string;
    username: string;
    role: string;
  }) => void;
  onCancel?: () => void;
}

export const PasskeyLogin = ({ onSuccess, onCancel }: PasskeyLoginProps) => {
  const [email, setEmail] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasskeyLogin = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const optionsResponse = await fetch("/api/auth/passkey/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!optionsResponse.ok) {
        const errorData = await optionsResponse.json();
        throw new Error(
          errorData.error?.message || "Failed to get authentication options"
        );
      }

      const options = await optionsResponse.json();

      const credential = await startAuthentication(options.data);

      const verifyResponse = await fetch("/api/auth/passkey/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error?.message || "Authentication failed");
      }

      const result = await verifyResponse.json();
      onSuccess(result.data.user);
    } catch (err: unknown) {
      console.error("Passkey authentication error:", err);
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isAuthenticating) {
      handlePasskeyLogin();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="passkey-email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Email Address
        </label>
        <input
          id="passkey-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="you@example.com"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isAuthenticating}
          autoFocus
        />
      </div>

      {error && (
        <div
          className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 
                        dark:border-red-700 rounded-md text-red-700 dark:text-red-300 text-sm"
        >
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handlePasskeyLogin}
          disabled={isAuthenticating || !email}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                     text-white font-medium py-2 px-4 rounded-md
                     transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isAuthenticating ? (
            "Authenticating..."
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              Sign In with Passkey
            </>
          )}
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isAuthenticating}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                       dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
