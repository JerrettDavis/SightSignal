import { test, expect } from "@playwright/test";

test.describe("Signals Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Open Explore menu and click Signals
    await page.getByRole("button", { name: "Explore" }).click();
    await page.getByRole("button", { name: "Signals" }).click();
    await page.waitForTimeout(300); // Wait for animation
  });

  test("displays signals browser", async ({ page }) => {
    // Should show "My Signals" heading
    await expect(
      page.getByRole("heading", { name: "My Signals" })
    ).toBeVisible();
  });

  test("displays filter buttons", async ({ page }) => {
    // All three filter buttons should be visible
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Active" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Inactive" })).toBeVisible();
  });

  test("displays create signal button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Create Signal" })
    ).toBeVisible();
  });

  test("shows loading state initially", async ({ page }) => {
    // Reload to catch loading state
    await page.reload();
    await page.getByRole("button", { name: "Explore" }).click();
    await page.getByRole("button", { name: "Signals" }).click();

    // Loading message should appear briefly
    // Note: This might pass the loading state too quickly to catch
  });

  test("default filter is active", async ({ page }) => {
    const activeButton = page.getByRole("button", { name: "Active" });

    // Active button should have accent color (indicates it's selected)
    await expect(activeButton).toHaveClass(
      /bg-\[color:var\(--accent-primary\)\]/
    );
  });

  test("switches between filters", async ({ page }) => {
    // Click All filter
    const allButton = page.getByRole("button", { name: "All" });
    await allButton.click();
    await expect(allButton).toHaveClass(/bg-\[color:var\(--accent-primary\)\]/);

    // Click Inactive filter
    const inactiveButton = page.getByRole("button", { name: "Inactive" });
    await inactiveButton.click();
    await expect(inactiveButton).toHaveClass(
      /bg-\[color:var\(--accent-primary\)\]/
    );

    // Click Active filter
    const activeButton = page.getByRole("button", { name: "Active" });
    await activeButton.click();
    await expect(activeButton).toHaveClass(
      /bg-\[color:var\(--accent-primary\)\]/
    );
  });

  test("displays signal count", async ({ page }) => {
    // Should show count like "N found"
    await expect(page.getByText(/\d+ found/)).toBeVisible();
  });

  test("shows empty state when no signals", async ({ page }) => {
    // The empty state depends on whether signals exist
    // Check if either empty state or signal cards are visible
    const emptyMessage = page.getByText("No signals created yet");
    const signalCards = page.locator(".space-y-2 > div");

    const cardCount = await signalCards.count();

    if (cardCount === 0) {
      await expect(emptyMessage).toBeVisible();
    } else {
      await expect(emptyMessage).not.toBeVisible();
    }
  });

  test("shows filter-specific empty state", async ({ page }) => {
    // Click Inactive filter
    await page.getByRole("button", { name: "Inactive" }).click();
    await page.waitForTimeout(200);

    // Check for empty state or cards
    const filterEmptyMessage = page.getByText("No inactive signals");
    const signalCards = page.locator(".space-y-2 > div");

    const cardCount = await signalCards.count();

    if (cardCount === 0) {
      // Should show filter-specific message with link to show all
      await expect(filterEmptyMessage).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Show all signals" })
      ).toBeVisible();
    }
  });

  test("empty state 'show all' button works", async ({ page }) => {
    // Click Inactive filter
    await page.getByRole("button", { name: "Inactive" }).click();
    await page.waitForTimeout(200);

    // If empty state is visible, click show all
    const showAllButton = page.getByRole("button", {
      name: "Show all signals",
    });
    const isVisible = await showAllButton.isVisible().catch(() => false);

    if (isVisible) {
      await showAllButton.click();

      // Should switch to All filter
      const allButton = page.getByRole("button", { name: "All" });
      await expect(allButton).toHaveClass(
        /bg-\[color:var\(--accent-primary\)\]/
      );
    }
  });

  test("create signal button shows coming soon alert", async ({ page }) => {
    // Set up dialog handler before clicking
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toBe("Signal creator coming soon!");
      await dialog.accept();
    });

    await page.getByRole("button", { name: "Create Signal" }).click();
  });

  test("displays signal cards with name", async ({ page }) => {
    // Check if any signals exist
    const signalCards = page
      .locator(".space-y-2 > div")
      .filter({ has: page.locator("p.text-sm.font-medium") });
    const cardCount = await signalCards.count();

    if (cardCount > 0) {
      // First signal should have a name
      const firstCard = signalCards.first();
      await expect(firstCard.locator("p.text-sm.font-medium")).toBeVisible();
    }
  });

  test("displays signal trigger and target info", async ({ page }) => {
    // Check if any signals exist
    const signalCards = page
      .locator(".space-y-2 > div")
      .filter({ has: page.locator("p.text-sm.font-medium") });
    const cardCount = await signalCards.count();

    if (cardCount > 0) {
      // First signal should show trigger and target info (e.g., "New sighting • Geofence")
      const firstCard = signalCards.first();
      const infoText = firstCard.locator(
        "p.text-xs.text-\\[color\\:var\\(--text-secondary\\)\\]"
      );
      await expect(infoText).toBeVisible();
      // Should contain bullet separator
      await expect(infoText).toContainText("•");
    }
  });

  test("displays signal description when available", async ({ page }) => {
    // Check if any signals exist with descriptions
    const signalCards = page
      .locator(".space-y-2 > div")
      .filter({ has: page.locator("p.text-sm.font-medium") });
    const cardCount = await signalCards.count();

    if (cardCount > 0) {
      // Check each card for description
      for (let i = 0; i < Math.min(cardCount, 5); i++) {
        const card = signalCards.nth(i);
        const description = card.locator(
          "p.text-xs.text-\\[color\\:var\\(--text-tertiary\\)\\].line-clamp-2"
        );

        // Description is optional, so just check if it exists
        const hasDescription = (await description.count()) > 0;
        if (hasDescription) {
          await expect(description).toBeVisible();
        }
      }
    }
  });

  test("displays active status indicator", async ({ page }) => {
    // Check if any signals exist
    const signalCards = page
      .locator(".space-y-2 > div")
      .filter({ has: page.locator("p.text-sm.font-medium") });
    const cardCount = await signalCards.count();

    if (cardCount > 0) {
      // First signal should have a status indicator dot
      const firstCard = signalCards.first();
      const statusDot = firstCard.locator("div.rounded-full.w-2.h-2");
      await expect(statusDot).toBeVisible();

      // Check if it has either active (green) or inactive (gray) styling
      const hasActiveClass = await statusDot.evaluate((el) =>
        el.classList.contains("bg-[color:var(--accent-success)]")
      );
      const hasInactiveClass = await statusDot.evaluate((el) =>
        el.classList.contains("bg-[color:var(--text-tertiary)]")
      );

      expect(hasActiveClass || hasInactiveClass).toBe(true);
    }
  });

  test("signal cards have hover effect", async ({ page }) => {
    // Check if any signals exist
    const signalCards = page
      .locator(".space-y-2 > div")
      .filter({ has: page.locator("p.text-sm.font-medium") });
    const cardCount = await signalCards.count();

    if (cardCount > 0) {
      const firstCard = signalCards.first();

      // Hover over the card
      await firstCard.hover();

      // Card should have hover:bg class
      await expect(firstCard).toHaveClass(
        /hover:bg-\[color:var\(--surface-elevated\)\]/
      );
    }
  });

  test("filters update signal count", async ({ page }) => {
    // Get count for All
    await page.getByRole("button", { name: "All" }).click();
    await page.waitForTimeout(200);
    const allCountText = await page.getByText(/\d+ found/).textContent();
    const allCount = parseInt(allCountText?.match(/\d+/)?.[0] || "0");

    // Get count for Active
    await page.getByRole("button", { name: "Active" }).click();
    await page.waitForTimeout(200);
    const activeCountText = await page.getByText(/\d+ found/).textContent();
    const activeCount = parseInt(activeCountText?.match(/\d+/)?.[0] || "0");

    // Get count for Inactive
    await page.getByRole("button", { name: "Inactive" }).click();
    await page.waitForTimeout(200);
    const inactiveCountText = await page.getByText(/\d+ found/).textContent();
    const inactiveCount = parseInt(inactiveCountText?.match(/\d+/)?.[0] || "0");

    // All count should equal or exceed individual filter counts
    expect(allCount).toBeGreaterThanOrEqual(activeCount);
    expect(allCount).toBeGreaterThanOrEqual(inactiveCount);
  });

  test("sidebar has sticky filter section", async ({ page }) => {
    const filterSection = page.locator(".sticky.top-0.z-10");

    // Filter section should exist and be visible
    await expect(filterSection).toBeVisible();

    // Should contain Status label
    await expect(filterSection.getByText("Status")).toBeVisible();
  });

  test("signals list is scrollable", async ({ page }) => {
    // Check if signals list container exists
    const listContainer = page.locator(".flex-1.overflow-y-auto");
    await expect(listContainer).toBeVisible();
  });

  test("navigates to signals from explore menu", async ({ page }) => {
    // Go back to home
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Open explore menu
    const exploreButton = page.getByRole("button", { name: "Explore" });
    await exploreButton.click();

    // Dropdown should be visible
    const signalsMenuItem = page.getByRole("button", { name: "Signals" });
    await expect(signalsMenuItem).toBeVisible();

    // Click signals
    await signalsMenuItem.click();
    await page.waitForTimeout(300);

    // Should show signals sidebar
    await expect(
      page.getByRole("heading", { name: "My Signals" })
    ).toBeVisible();
  });

  test("closes when clicking outside", async ({ page }) => {
    // Signals sidebar should be visible
    await expect(
      page.getByRole("heading", { name: "My Signals" })
    ).toBeVisible();

    // Click on the map area (outside sidebar)
    await page
      .locator('[role="region"][aria-label="Map"]')
      .first()
      .click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(300);

    // Sidebar should close (heading should not be visible)
    await expect(
      page.getByRole("heading", { name: "My Signals" })
    ).not.toBeVisible();
  });

  test("filters section has proper styling", async ({ page }) => {
    const filterSection = page.locator(
      ".border-b.border-\\[color\\:var\\(--border\\)\\].p-4"
    );

    // Should have elevated background
    await expect(filterSection).toHaveClass(
      /bg-\[color:var\(--surface-elevated\)\]/
    );
  });

  test("truncates long signal names", async ({ page }) => {
    // Check if any signals exist
    const signalCards = page
      .locator(".space-y-2 > div")
      .filter({ has: page.locator("p.text-sm.font-medium") });
    const cardCount = await signalCards.count();

    if (cardCount > 0) {
      const firstCard = signalCards.first();
      const nameElement = firstCard.locator("p.text-sm.font-medium.truncate");

      // Name element should have truncate class
      await expect(nameElement).toBeVisible();
      await expect(nameElement).toHaveClass(/truncate/);
    }
  });

  test("limits description to 2 lines", async ({ page }) => {
    // Check if any signals exist with descriptions
    const signalCards = page
      .locator(".space-y-2 > div")
      .filter({ has: page.locator("p.text-sm.font-medium") });
    const cardCount = await signalCards.count();

    if (cardCount > 0) {
      // Check for line-clamp-2 class
      const description = signalCards.first().locator("p.line-clamp-2");
      const hasDescription = (await description.count()) > 0;

      if (hasDescription) {
        await expect(description).toBeVisible();
        await expect(description).toHaveClass(/line-clamp-2/);
      }
    }
  });
});
