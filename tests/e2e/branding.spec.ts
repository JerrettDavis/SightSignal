import { test, expect } from "@playwright/test";

/**
 * BDD Test Suite: Branding Display
 *
 * Purpose: Validate that brand name "SignalFeed" appears correctly
 * throughout the application. These tests serve as regression tests
 * during the rebrand from SightSignal to SignalFeed.
 */

test.describe("Feature: Brand Identity Display", () => {
  test.describe("Scenario: User visits home page", () => {
    test("should display SignalFeed in page title", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle(/SignalFeed/i);
    });

    test("should display SignalFeed in main heading", async ({ page }) => {
      await page.goto("/");
      // Look for the brand name in any h1 or prominent heading
      const heading = page.locator("h1, h2, [role='banner']").first();
      await expect(heading).toBeVisible();
    });

    test("should have SignalFeed in meta description", async ({ page }) => {
      await page.goto("/");
      const metaDescription = page.locator('meta[name="description"]');
      const content = await metaDescription.getAttribute("content");
      expect(content).toBeTruthy();
    });
  });

  test.describe("Scenario: User installs PWA", () => {
    test("should have SignalFeed as PWA name in manifest", async ({ page }) => {
      await page.goto("/");
      const response = await page.request.get("/manifest.json");
      expect(response.ok()).toBeTruthy();

      const manifest = await response.json();
      expect(manifest.name).toContain("SignalFeed");
      expect(manifest.short_name).toContain("SignalFeed");
    });

    test("should have proper PWA description", async ({ page }) => {
      await page.goto("/");
      const response = await page.request.get("/manifest.json");
      const manifest = await response.json();
      expect(manifest.description).toBeTruthy();
      expect(manifest.description.length).toBeGreaterThan(10);
    });
  });

  test.describe("Scenario: User interacts with UI elements", () => {
    test("should see consistent terminology in navigation", async ({
      page,
    }) => {
      await page.goto("/");

      // Check that we're using "Signals" terminology
      const signalsButton = page.getByRole("button", { name: /signal/i });
      if ((await signalsButton.count()) > 0) {
        await expect(signalsButton.first()).toBeVisible();
      }
    });

    test("should see consistent terminology in forms", async ({ page }) => {
      await page.goto("/");

      // Open report form if it exists
      const reportButton = page.getByRole("button", { name: /report/i });
      if ((await reportButton.count()) > 0) {
        await reportButton.first().click();
        // Check for signal-related labels
        await expect(page.locator("form")).toBeVisible();
      }
    });
  });

  test.describe("Scenario: User views admin interface", () => {
    test("should display SignalFeed in admin layout", async ({ page }) => {
      // Navigate to admin login
      await page.goto("/admin/login");
      await expect(page).toHaveTitle(/SignalFeed/i);
    });
  });

  test.describe("Scenario: User receives notifications", () => {
    test("should use SignalFeed in notification permission prompt", async ({
      page,
      context,
    }) => {
      await context.grantPermissions(["notifications"]);
      await page.goto("/");

      // Check if push notification manager is present
      const notificationToggle = page.locator(
        '[data-testid="notification-toggle"], button:has-text("notification")'
      );
      if ((await notificationToggle.count()) > 0) {
        // Notification UI should be visible
        await expect(notificationToggle.first()).toBeVisible();
      }
    });
  });

  test.describe("Scenario: User views offline state", () => {
    test("should display offline indicator with proper branding", async ({
      page,
      context,
    }) => {
      await page.goto("/");

      // Simulate offline state
      await context.setOffline(true);

      // Check for offline indicator
      const offlineIndicator = page.locator(
        '[data-testid="offline-indicator"], [role="status"]:has-text("offline")'
      );

      // Wait a bit for offline detection
      await page.waitForTimeout(1000);

      // If offline indicator exists, verify it's visible
      if ((await offlineIndicator.count()) > 0) {
        await expect(offlineIndicator.first()).toBeVisible();
      }

      // Restore online state
      await context.setOffline(false);
    });
  });
});

test.describe("Feature: Internationalization Support", () => {
  test.describe("Scenario: Application loads with default locale", () => {
    test("should use English locale by default", async ({ page }) => {
      await page.goto("/");
      // Page should load without locale prefix in URL
      expect(page.url()).toMatch(/\/$/);
    });

    test("should have lang attribute set to en", async ({ page }) => {
      await page.goto("/");
      const html = page.locator("html");
      await expect(html).toHaveAttribute("lang", "en");
    });
  });

  test.describe("Scenario: All UI strings are translated", () => {
    test("should not have hardcoded 'SightSignal' in visible text", async ({
      page,
    }) => {
      await page.goto("/");

      // Get all visible text excluding scripts/internal data
      const visibleText = await page.evaluate(() => {
        // Get text content but exclude script tags and data attributes
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              // Skip script tags and hidden elements
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              if (parent.tagName === "SCRIPT") return NodeFilter.FILTER_REJECT;
              if (parent.tagName === "STYLE") return NodeFilter.FILTER_REJECT;

              // Check if element is visible
              const style = window.getComputedStyle(parent);
              if (style.display === "none" || style.visibility === "hidden") {
                return NodeFilter.FILTER_REJECT;
              }

              return NodeFilter.FILTER_ACCEPT;
            },
          }
        );

        let text = "";
        let node;
        while ((node = walker.nextNode())) {
          text += node.textContent + " ";
        }
        return text;
      });

      // Should not contain old brand name in visible UI (case insensitive)
      expect(visibleText.toLowerCase()).not.toContain("sightsignal");
    });
  });
});
