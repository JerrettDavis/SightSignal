"use client";

import { useState, useEffect } from "react";

interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export const PasskeyManager = () => {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPasskeys = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/passkey/list");

      if (!response.ok) {
        throw new Error("Failed to load passkeys");
      }

      const result = await response.json();
      setPasskeys(result.data.passkeys);
    } catch (err) {
      console.error("Error loading passkeys:", err);
      setError("Failed to load passkeys");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPasskeys();
  }, []);

  const handleDelete = async (passkeyId: string) => {
    if (!confirm("Are you sure you want to remove this passkey?")) {
      return;
    }

    setDeletingId(passkeyId);
    setError(null);

    try {
      const response = await fetch(`/api/auth/passkey/${passkeyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete passkey");
      }

      setPasskeys((prev) => prev.filter((pk) => pk.id !== passkeyId));
    } catch (err) {
      console.error("Error deleting passkey:", err);
      setError("Failed to delete passkey");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        Loading passkeys...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Your Passkeys
        </h3>
      </div>

      {error && (
        <div
          className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 
                        dark:border-red-700 rounded-md text-red-700 dark:text-red-300 text-sm"
        >
          {error}
        </div>
      )}

      {passkeys.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          <p className="mb-4">You don&apos;t have any passkeys yet.</p>
          <p className="text-sm">
            Passkeys provide a more secure and convenient way to sign in to your
            account.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="flex items-center justify-between p-4 border border-gray-200 
                         dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400"
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
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {passkey.name}
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span>Added {formatDate(passkey.createdAt)}</span>
                      {passkey.lastUsedAt && (
                        <span className="ml-3">
                          Last used {formatDate(passkey.lastUsedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(passkey.id)}
                disabled={deletingId === passkey.id}
                className="ml-4 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 
                           dark:text-red-400 dark:hover:text-red-300
                           hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md
                           transition-colors duration-200 disabled:opacity-50"
              >
                {deletingId === passkey.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
