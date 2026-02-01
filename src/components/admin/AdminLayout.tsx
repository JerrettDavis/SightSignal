"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/admin/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        router.push("/admin/login");
      } else {
        alert("Logout failed. Please try again.");
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      alert("Logout failed. Please try again.");
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/sightings", label: "Sightings" },
    { path: "/admin/geofences", label: "Geofences" },
    { path: "/admin/subscriptions", label: "Subscriptions" },
    { path: "/admin/reputation", label: "Reputation" },
    { path: "/admin/taxonomy", label: "Taxonomy" },
  ];

  const isActive = (path: string) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }
    return pathname?.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--surface-elevated)] shadow-[var(--shadow-sm)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--accent-primary)] text-base font-bold text-white">
                SF
              </div>
              <div>
                <h1 className="text-base font-semibold text-[color:var(--text-primary)]">
                  SignalFeed Admin
                </h1>
                <p className="text-xs text-[color:var(--text-tertiary)]">
                  Management Dashboard
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[color:var(--surface-elevated)] transition"
              >
                🏠 Back to Map
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[color:var(--surface-elevated)] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-1 -mb-px">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                  isActive(item.path)
                    ? "border-[color:var(--accent-primary)] text-[color:var(--accent-primary)]"
                    : "border-transparent text-[color:var(--text-secondary)] hover:border-[color:var(--border)] hover:text-[color:var(--text-primary)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
