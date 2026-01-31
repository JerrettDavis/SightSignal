"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasskeyEnrollment } from "@/components/auth/PasskeyEnrollment";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<
    "verifying" | "success" | "error" | "passkey-enrollment"
  >("verifying");
  const [message, setMessage] = useState("Verifying your magic link...");
  const [showPasskeyEnrollment, setShowPasskeyEnrollment] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setTimeout(() => {
        setStatus("error");
        setMessage("No token provided");
      }, 0);
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(`/api/auth/verify?token=${token}`);

        if (response.ok) {
          setStatus("success");
          setMessage("Successfully logged in!");

          // Offer passkey enrollment after brief delay
          setTimeout(() => {
            setShowPasskeyEnrollment(true);
          }, 1000);
        } else {
          const data = await response.json();
          setStatus("error");
          setMessage(data.error?.message || "Invalid or expired link");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Verification failed. Please try again.");
        console.error("Verification error:", error);
      }
    };

    verify();
  }, [searchParams]);

  const handlePasskeyEnrollmentSuccess = () => {
    window.location.href = "/";
  };

  const handleSkipPasskey = () => {
    window.location.href = "/";
  };

  if (showPasskeyEnrollment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--background)] p-6">
        <PasskeyEnrollment
          onSuccess={handlePasskeyEnrollmentSuccess}
          onSkip={handleSkipPasskey}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--background)] p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          {status === "verifying" && (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--accent-primary)]/20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--border)] border-t-[color:var(--accent-primary)]" />
            </div>
          )}
          {status === "success" && (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green-500"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
          {status === "error" && (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-red-500"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
          )}
        </div>

        <div>
          <h1 className="mb-2 text-2xl font-bold text-[color:var(--text-primary)]">
            {status === "verifying" && "Verifying..."}
            {status === "success" && "Success!"}
            {status === "error" && "Verification Failed"}
          </h1>
          <p className="text-[color:var(--text-secondary)]">{message}</p>
        </div>

        {status === "error" && (
          <div className="space-y-2">
            <button
              onClick={() => router.push("/")}
              className="w-full rounded-lg bg-[color:var(--accent-primary)] px-4 py-2 text-white transition hover:bg-[color:var(--accent-primary)]/90"
            >
              Go to Home
            </button>
            <p className="text-xs text-[color:var(--text-tertiary)]">
              Magic links expire after 15 minutes. Please request a new one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--background)] p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--accent-primary)]/20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--border)] border-t-[color:var(--accent-primary)]" />
          </div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
