"use client";

import { useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: {
    id: string;
    email: string;
    username?: string;
    role: string;
  }) => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to send magic link");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setSent(false);
    setError(null);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-2xl bg-[color:var(--surface)] shadow-2xl border border-[color:var(--border)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-6 py-4">
            <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">
              {sent ? "Check Your Email" : "Welcome"}
            </h2>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-[color:var(--text-secondary)] transition hover:bg-[color:var(--surface-elevated)]"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <p className="text-sm text-[color:var(--text-secondary)]">
                Enter your email to get started. We&apos;ll send you a magic
                link to sign in instantly.
              </p>

              {error && (
                <div className="rounded-lg border border-[color:var(--accent-danger)]/20 bg-[color:var(--accent-danger)]/5 p-3">
                  <p className="text-sm text-[color:var(--accent-danger)]">
                    {error}
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)]"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[color:var(--accent-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[color:var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Magic Link"}
              </button>

              <p className="text-center text-xs text-[color:var(--text-tertiary)]">
                No password required • Secure & instant
              </p>
            </form>
          ) : (
            <div className="p-6 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--accent-success)]/10">
                <svg
                  className="h-6 w-6 text-[color:var(--accent-success)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <div className="text-center">
                <h3 className="mb-2 text-lg font-semibold text-[color:var(--text-primary)]">
                  Magic Link Sent!
                </h3>
                <p className="text-sm text-[color:var(--text-secondary)]">
                  We&apos;ve sent a magic link to <strong>{email}</strong>
                </p>
                <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                  Click the link in your email to sign in instantly.
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--surface-elevated)] hover:text-[color:var(--text-primary)]"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
