import {
  getUserRepository,
  getMagicLinkRepository,
} from "@/adapters/repositories/repository-factory";
import { validateEmail, createUser } from "@/domain/users/user";
import type { UserId } from "@/domain/users/user";
import { jsonBadRequest, jsonOk, jsonServerError } from "@/shared/http";
import { sendEmail, generateMagicLinkEmail } from "@/shared/email";

export const runtime = "nodejs";

const userRepo = getUserRepository();
const magicLinkRepo = getMagicLinkRepository();

// POST /api/auth/magic-link
export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return jsonBadRequest("Email is required");
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.ok) {
      return jsonBadRequest(emailValidation.error.message);
    }

    // Check if user exists, if not create them
    let user = await userRepo.getByEmail(email);

    if (!user) {
      // Auto-register user with email
      const userId =
        `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as UserId;
      const userResult = createUser(userId, {
        email: emailValidation.value,
        role: "user",
        status: "active",
      });

      if (!userResult.ok) {
        return jsonBadRequest(userResult.error.message);
      }

      await userRepo.create(userResult.value);
      user = userResult.value;
    }

    // Generate magic link token
    const token = await magicLinkRepo.create(email);

    // Generate magic link URL
    // Use custom domain in production, fall back to VERCEL_URL or localhost
    const getBaseUrl = () => {
      // 1. Check for explicit URL override
      if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
      }

      // 2. In production (Vercel), prefer custom domain
      if (process.env.VERCEL_ENV === "production") {
        return "https://www.signalfeed.app";
      }

      // 3. Preview deployments use VERCEL_URL
      if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
      }

      // 4. Fall back to localhost for development
      return "http://localhost:3000";
    };

    const magicLink = `${getBaseUrl()}/auth/verify?token=${token.token}`;

    // In development, log the magic link to console
    if (process.env.NODE_ENV === "development") {
      console.log("\n╔══════════════════════════════════════════╗");
      console.log("║          MAGIC LINK GENERATED            ║");
      console.log("╠══════════════════════════════════════════╣");
      console.log(`║ Email: ${email.padEnd(32)} ║`);
      console.log("║                                          ║");
      console.log("║ Click this link to login:                ║");
      console.log(`║ ${magicLink.substring(0, 40).padEnd(40)} ║`);
      if (magicLink.length > 40) {
        console.log(`║ ${magicLink.substring(40).padEnd(40)} ║`);
      }
      console.log("║                                          ║");
      console.log(`║ Expires in: 15 minutes                   ║`);
      console.log("╚══════════════════════════════════════════╝\n");
    }

    // Send email with magic link
    const { html, text } = generateMagicLinkEmail(magicLink, 15);
    const emailResult = await sendEmail({
      to: email,
      subject: "Sign in to SignalFeed",
      html,
      text,
    });

    if (!emailResult.success) {
      console.error(
        "[Auth] Failed to send magic link email:",
        emailResult.error
      );
      // Don't fail the request - log for debugging
    }

    return jsonOk({
      data: {
        message: "Magic link sent! Check your email.",
        // In development, return the token for easy testing
        ...(process.env.NODE_ENV === "development" && {
          token: token.token,
          devNote: "Magic link also logged to console",
        }),
      },
    });
  } catch (error) {
    console.error("Magic link error:", error);
    return jsonServerError("Failed to send magic link");
  }
};
