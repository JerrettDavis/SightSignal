"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const hasRedirected = useRef(false);

  // Check if user is already authenticated as admin
  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) {
      return;
    }

    const checkAuth = async () => {
      console.log("[Admin Login] Checking auth status...");
      try {
        const response = await fetch("/api/admin/auth/verify");
        console.log(
          "[Admin Login] Auth response:",
          response.status,
          response.ok
        );

        if (response.ok) {
          console.log(
            "[Admin Login] User is authenticated, redirecting to /admin"
          );
          // Mark that we've redirected
          hasRedirected.current = true;
          // Use router.replace instead of window.location
          router.replace("/admin");
          return;
        }

        console.log("[Admin Login] Not authenticated, showing login form");
      } catch (error) {
        console.log("[Admin Login] Auth check failed:", error);
        // Not authenticated, show login form
      } finally {
        setIsCheckingAuth(false);
      }
    };

    void checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || "Login failed. Please try again.");
        setIsLoading(false);
        return;
      }

      // Successful login - redirect to admin dashboard
      router.push("/admin");
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[color:var(--background)]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--accent-primary)] border-r-transparent"></div>
          <p className="mt-4 text-sm text-[color:var(--text-secondary)]">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[color:var(--background)]">
      <div className="w-full max-w-md p-6">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--accent-primary)] text-lg font-bold text-white mb-4">
            SS
          </div>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
            Admin Login
          </h1>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            Sign in to access the admin panel
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-xl bg-[color:var(--surface-elevated)] p-6 shadow-[var(--shadow-md)] border border-[color:var(--border)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-[color:var(--text-primary)] mb-2"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--text-primary)] placeholder-[color:var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)] transition"
                placeholder="Enter your username"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[color:var(--text-primary)] mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--text-primary)] placeholder-[color:var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)] transition"
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-[color:var(--accent-danger)]/10 border border-[color:var(--accent-danger)]/20 px-4 py-3 text-sm text-[color:var(--accent-danger)]">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-[color:var(--accent-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)] focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[color:var(--text-tertiary)]">
          SightSignal Admin Panel v1.0
        </p>
      </div>
    </div>
  );
}
