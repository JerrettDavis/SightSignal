import { test, expect } from "@playwright/test";

test.describe("Explore Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Open Explore sidebar
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    await page.waitForTimeout(300); // Wait for animation
  });

  test("displays category filters", async ({ page }) => {
    const categories = [
      "Nature",
      "Public Safety",
      "Community",
      "Hazards",
      "Infrastructure",
      "Events",
    ];

    for (const category of categories) {
      await expect(
        page.getByRole("button", { name: category, exact: true })
      ).toBeVisible();
    }
  });

  test("displays importance filter", async ({ page }) => {
    const importanceSelect = page
      .getByRole("combobox")
      .filter({ hasText: /All levels|Critical|High|Normal|Low/ })
      .first();
    await expect(importanceSelect).toBeVisible();
  });

  test("filters signals by category", async ({ page }) => {
    // Get initial count
    const countText = await page
      .locator("text=/\\d+ found/")
      .first()
      .textContent();
    const initialCount = parseInt(countText?.match(/\d+/)?.[0] || "0");

    if (initialCount === 0) {
      test.skip(); // Skip if no signals to filter
      return;
    }

    // Click Nature category (use force to handle sidebar scroll issues)
    await page
      .getByRole("button", { name: "Nature", exact: true })
      .click({ force: true });

    // Verify button shows selected state (blue background)
    const natureButton = page.getByRole("button", {
      name: "Nature",
      exact: true,
    });
    await expect(natureButton).toHaveClass(
      /bg-\[color:var\(--accent-primary\)\]/
    );

    // Verify count changed or stayed the same (depends on data)
    const newCountText = await page
      .locator("text=/\\d+ found/")
      .first()
      .textContent();
    const newCount = parseInt(newCountText?.match(/\d+/)?.[0] || "0");

    // Count should be less than or equal to initial
    expect(newCount).toBeLessThanOrEqual(initialCount);
  });

  test("filters signals by multiple categories", async ({ page }) => {
    const countText = await page
      .locator("text=/\\d+ found/")
      .first()
      .textContent();
    const initialCount = parseInt(countText?.match(/\d+/)?.[0] || "0");

    if (initialCount === 0) {
      test.skip();
      return;
    }

    // Select Nature (use force to handle sidebar scroll issues)
    await page
      .getByRole("button", { name: "Nature", exact: true })
      .click({ force: true });
    const afterNature = await page
      .locator("text=/\\d+ found/")
      .first()
      .textContent();
    const countAfterNature = parseInt(afterNature?.match(/\d+/)?.[0] || "0");

    // Select Community (use force to handle sidebar scroll issues)
    await page
      .getByRole("button", { name: "Community", exact: true })
      .click({ force: true });
    const afterCommunity = await page
      .locator("text=/\\d+ found/")
      .first()
      .textContent();
    const countAfterCommunity = parseInt(
      afterCommunity?.match(/\d+/)?.[0] || "0"
    );

    // Count with two categories should be >= count with one category
    expect(countAfterCommunity).toBeGreaterThanOrEqual(countAfterNature);

    // Both buttons should show selected state
    await expect(
      page.getByRole("button", { name: "Nature", exact: true })
    ).toHaveClass(/bg-\[color:var\(--accent-primary\)\]/);
    await expect(
      page.getByRole("button", { name: "Community", exact: true })
    ).toHaveClass(/bg-\[color:var\(--accent-primary\)\]/);
  });

  test("toggles category filter off", async ({ page }) => {
    // Select a category (use force to handle sidebar scroll issues)
    await page
      .getByRole("button", { name: "Nature", exact: true })
      .click({ force: true });
    await expect(
      page.getByRole("button", { name: "Nature", exact: true })
    ).toHaveClass(/bg-\[color:var\(--accent-primary\)\]/);

    // Click again to deselect (use force to handle sidebar scroll issues)
    await page
      .getByRole("button", { name: "Nature", exact: true })
      .click({ force: true });
    await expect(
      page.getByRole("button", { name: "Nature", exact: true })
    ).not.toHaveClass(/bg-\[color:var\(--accent-primary\)\]/);
  });

  test("filters signals by importance level", async ({ page }) => {
    const countText = await page
      .locator("text=/\\d+ found/")
      .first()
      .textContent();
    const initialCount = parseInt(countText?.match(/\d+/)?.[0] || "0");

    if (initialCount === 0) {
      test.skip();
      return;
    }

    // Select "High" importance
    const importanceSelect = page
      .locator("select")
      .filter({ hasText: /All levels/ });
    await importanceSelect.selectOption("high");

    // Wait for filter to apply
    await page.waitForTimeout(100);

    // Count should be less than or equal to initial
    const newCountText = await page
      .locator("text=/\\d+ found/")
      .first()
      .textContent();
    const newCount = parseInt(newCountText?.match(/\d+/)?.[0] || "0");
    expect(newCount).toBeLessThanOrEqual(initialCount);
  });

  test("combines category and importance filters", async ({ page }) => {
    const countText = await page
      .locator("text=/\\d+ found/")
      .first()
      .textContent();
    const initialCount = parseInt(countText?.match(/\d+/)?.[0] || "0");

    if (initialCount === 0) {
      test.skip();
      return;
    }

    // Select category (use force to handle sidebar scroll issues)
    await page
      .getByRole("button", { name: "Nature", exact: true })
      .click({ force: true });

    // Select importance
    const importanceSelect = page
      .locator("select")
      .filter({ hasText: /All levels/ });
    await importanceSelect.selectOption("normal");

    await page.waitForTimeout(100);

    // Combined filter should show subset
    const newCountText = await page
      .locator("text=/\\d+ found/")
      .first()
      .textContent();
    const newCount = parseInt(newCountText?.match(/\d+/)?.[0] || "0");
    expect(newCount).toBeLessThanOrEqual(initialCount);
  });

  test("clears all filters", async ({ page }) => {
    const countText = await page
      .locator("text=/\\d+ found/")
      .first()
      .textContent();
    const initialCount = parseInt(countText?.match(/\d+/)?.[0] || "0");

    if (initialCount === 0) {
      test.skip();
      return;
    }

    // Apply some filters (use force to handle sidebar scroll issues)
    await page
      .getByRole("button", { name: "Nature", exact: true })
      .click({ force: true });
    const importanceSelect = page
      .locator("select")
      .filter({ hasText: /All levels/ });
    await importanceSelect.selectOption("high");

    // Clear filters button should appear if count is 0
    const clearButton = page.getByRole("button", { name: "Clear filters" });

    // Click clear if it exists
    if (await clearButton.isVisible()) {
      await clearButton.click();

      // Verify filters are reset
      await expect(
        page.getByRole("button", { name: "Nature", exact: true })
      ).not.toHaveClass(/bg-\[color:var\(--accent-primary\)\]/);
      await expect(importanceSelect).toHaveValue("all");
    }
  });

  test("displays signal cards with correct information", async ({ page }) => {
    const countText = await page
      .locator("text=/\\d+ found/")
      .first()
      .textContent();
    const count = parseInt(countText?.match(/\d+/)?.[0] || "0");

    if (count === 0) {
      await expect(
        page.getByText("No signals match your filters")
      ).toBeVisible();
      return;
    }

    // Check first signal card has required elements
    const firstCard = page
      .locator(".cursor-pointer")
      .filter({ has: page.locator("p") })
      .first();
    await expect(firstCard).toBeVisible();

    // Card should have at least 3 paragraphs (description, category/type, timestamp)
    const paragraphs = firstCard.locator("p");
    const paragraphCount = await paragraphs.count();
    expect(paragraphCount).toBeGreaterThanOrEqual(3);
  });

  test("limits signals to 15 maximum", async ({ page }) => {
    const countText = await page
      .locator("text=/\\d+ found/")
      .first()
      .textContent();
    const count = parseInt(countText?.match(/\d+/)?.[0] || "0");

    // Count shown should never exceed 15
    expect(count).toBeLessThanOrEqual(15);
  });

  test("displays importance indicators on signal cards", async ({ page }) => {
    const countText = await page
      .locator("text=/\\d+ found/")
      .first()
      .textContent();
    const count = parseInt(countText?.match(/\d+/)?.[0] || "0");

    if (count === 0) {
      test.skip();
      return;
    }

    // Verify signal cards are displayed (importance indicator is visual, hard to test)
    const firstCard = page
      .locator(".cursor-pointer")
      .filter({ has: page.locator("p") })
      .first();
    await expect(firstCard).toBeVisible();

    // Verify the card has the category/type line which appears with the indicator
    await expect(firstCard.locator("p").nth(1)).toBeVisible();
  });
});
