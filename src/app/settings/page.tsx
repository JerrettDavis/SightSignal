"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PasskeyManager } from "@/components/auth/PasskeyManager";
import { PasskeyEnrollment } from "@/components/auth/PasskeyEnrollment";

interface Settings {
  notificationsEnabled: boolean;
  locationSharingEnabled: boolean;
  followMeMode: boolean;
  publicProfile: boolean;
  theme: "light" | "dark" | "auto";
  mapStyle: "standard" | "satellite" | "terrain";
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    notificationsEnabled: false,
    locationSharingEnabled: false,
    followMeMode: false,
    publicProfile: true,
    theme: "auto",
    mapStyle: "standard",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const authResponse = await fetch("/api/auth/me");
        if (!authResponse.ok) {
          router.push("/");
          return;
        }

        // Load settings from backend
        const settingsResponse = await fetch("/api/users/settings");
        if (settingsResponse.ok) {
          const data = await settingsResponse.json();
          setSettings(data.settings);
        }
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  const updateSetting = async (
    key: keyof Settings,
    value: boolean | string
  ) => {
    setSaving(true);
    try {
      const response = await fetch("/api/users/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });

      if (response.ok) {
        setSettings((prev) => ({ ...prev, [key]: value }));

        // Handle notification toggle
        if (key === "notificationsEnabled") {
          if (value) {
            // @ts-expect-error - Global function from PushNotificationManager
            if (typeof window.subscribeToPush === "function") {
              // @ts-expect-error - Global function
              await window.subscribeToPush();
            }
          } else {
            // @ts-expect-error - Global function from PushNotificationManager
            if (typeof window.unsubscribeFromPush === "function") {
              // @ts-expect-error - Global function
              await window.unsubscribeFromPush();
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to update setting:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--border)] border-t-[color:var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)] p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[color:var(--text-primary)]">
            Settings
          </h1>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--surface-elevated)]"
          >
            Back to Map
          </button>
        </div>

        <div className="space-y-6">
          {/* Notifications Section */}
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold text-[color:var(--text-primary)]">
              Notifications
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[color:var(--text-primary)]">
                  Push Notifications
                </p>
                <p className="text-sm text-[color:var(--text-secondary)]">
                  Get notified when new sightings are reported
                </p>
              </div>
              <button
                onClick={() =>
                  updateSetting(
                    "notificationsEnabled",
                    !settings.notificationsEnabled
                  )
                }
                disabled={saving}
                className={`relative h-6 w-11 rounded-full transition ${
                  settings.notificationsEnabled
                    ? "bg-[color:var(--accent-primary)]"
                    : "bg-[color:var(--border)]"
                } ${saving ? "opacity-50" : ""}`}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    settings.notificationsEnabled ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Privacy Section */}
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold text-[color:var(--text-primary)]">
              Privacy & Location Sharing
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-[color:var(--text-primary)]">
                    Follow Me Mode
                  </p>
                  <p className="text-sm text-[color:var(--text-secondary)]">
                    Share your live location with others (you can block specific
                    users)
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateSetting("followMeMode", !settings.followMeMode)
                  }
                  disabled={saving}
                  className={`relative h-6 w-11 rounded-full transition ${
                    settings.followMeMode
                      ? "bg-[color:var(--accent-primary)]"
                      : "bg-[color:var(--border)]"
                  } ${saving ? "opacity-50" : ""}`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                      settings.followMeMode ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-[color:var(--text-primary)]">
                    Public Profile
                  </p>
                  <p className="text-sm text-[color:var(--text-secondary)]">
                    Allow others to view your profile and sightings
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateSetting("publicProfile", !settings.publicProfile)
                  }
                  disabled={saving}
                  className={`relative h-6 w-11 rounded-full transition ${
                    settings.publicProfile
                      ? "bg-[color:var(--accent-primary)]"
                      : "bg-[color:var(--border)]"
                  } ${saving ? "opacity-50" : ""}`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                      settings.publicProfile ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
            {settings.followMeMode && (
              <div className="mt-4 rounded-lg border border-[color:var(--accent-primary)] bg-[color:var(--accent-primary)]/10 p-3">
                <p className="text-sm text-[color:var(--text-primary)]">
                  📍 <strong>Follow Me is active!</strong> Your live location is
                  visible to other users. You can block specific users from the
                  Profile page if needed.
                </p>
              </div>
            )}
          </div>

          {/* Appearance Section */}
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold text-[color:var(--text-primary)]">
              Appearance
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[color:var(--text-secondary)]">
                  Theme
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) =>
                    updateSetting("theme", e.target.value as Settings["theme"])
                  }
                  disabled={saving}
                  className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-[color:var(--text-primary)] focus:border-[color:var(--accent-primary)] focus:outline-none disabled:opacity-50"
                >
                  <option value="dark">Dark Mode</option>
                  <option value="light">Light Mode</option>
                  <option value="auto">Auto (System)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[color:var(--text-secondary)]">
                  Map Style
                </label>
                <select
                  value={settings.mapStyle}
                  onChange={(e) =>
                    updateSetting(
                      "mapStyle",
                      e.target.value as Settings["mapStyle"]
                    )
                  }
                  disabled={saving}
                  className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-[color:var(--text-primary)] focus:border-[color:var(--accent-primary)] focus:outline-none disabled:opacity-50"
                >
                  <option value="standard">Standard</option>
                  <option value="satellite">Satellite</option>
                  <option value="terrain">Terrain</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security & Passkeys Section */}
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold text-[color:var(--text-primary)]">
              Security & Authentication
            </h2>

            {showEnrollment ? (
              <div className="space-y-4">
                <PasskeyEnrollment
                  onSuccess={() => {
                    setShowEnrollment(false);
                    window.location.reload();
                  }}
                  onSkip={() => setShowEnrollment(false)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <PasskeyManager />
                <button
                  onClick={() => setShowEnrollment(true)}
                  className="mt-4 w-full rounded-lg bg-blue-600 hover:bg-blue-700 
                             text-white font-medium py-2.5 px-4 transition-colors duration-200
                             flex items-center justify-center gap-2"
                >
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add New Passkey
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-4">
            <p className="text-sm text-[color:var(--text-secondary)]">
              🚧 <strong>More settings coming soon!</strong> We&apos;re working
              on additional customization options.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
