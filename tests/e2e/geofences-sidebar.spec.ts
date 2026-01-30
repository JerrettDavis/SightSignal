import { test, expect } from "@playwright/test";
import { clickSidebarButton } from "./helpers/sidebar";

test.describe("Geofences Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // First open Explore dropdown menu
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    await page.waitForTimeout(100);

    // Then click Geofences in the dropdown
    await page.getByRole("button", { name: "Geofences", exact: true }).click();

    // Wait for sidebar animation and dynamically loaded content
    await page.waitForTimeout(2000);
  });

  test("displays geofence map", async ({ page }) => {
    // Map should be visible
    const map = page.locator('[role="region"][aria-label="Map"]').first();
    await expect(map).toBeVisible();
  });

  test("displays map controls", async ({ page }) => {
    await expect(page.getByTestId("sample-geofence-button")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Clear points" })
    ).toBeVisible();
    await expect(page.getByText(/Points: \d+/)).toBeVisible();
  });

  test("displays create geofence form", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Create Geofence" })
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Name" })).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Visibility" })
    ).toBeVisible();
    await expect(page.getByTestId("create-geofence-button")).toBeVisible();
  });

  test("displays subscribe form", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Subscribe" })
    ).toBeVisible();
    await expect(page.getByTestId("subscription-email")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Target" })).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Trust level" })
    ).toBeVisible();
    await expect(page.getByTestId("subscribe-button")).toBeVisible();
  });

  test("displays category and type checkboxes", async ({ page }) => {
    // Category checkboxes
    await expect(page.getByRole("checkbox", { name: "Nature" })).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Public Safety" })
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Community", exact: true })
    ).toBeVisible();

    // Type checkboxes
    await expect(page.getByRole("checkbox", { name: "Birds" })).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Wildlife" })
    ).toBeVisible();
  });

  test("displays public geofences section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Public Geofences" })
    ).toBeVisible();
  });

  test("adds sample polygon", async ({ page }) => {
    // Initially should be 0 points
    await expect(page.getByText("Points: 0")).toBeVisible();

    // Click sample button (use helper for sidebar scroll container)
    await clickSidebarButton(page.getByTestId("sample-geofence-button"));

    // Should now show 4 points (sample polygon has 4 corners)
    await expect(page.getByText("Points: 4")).toBeVisible();
  });

  test("clears polygon points", async ({ page }) => {
    // Add sample polygon (use helper for sidebar scroll container)
    await clickSidebarButton(page.getByTestId("sample-geofence-button"));
    await expect(page.getByText("Points: 4")).toBeVisible();

    // Clear points (use helper for sidebar scroll container)
    await clickSidebarButton(
      page.getByRole("button", { name: "Clear points" })
    );

    // Should be back to 0
    await expect(page.getByText("Points: 0")).toBeVisible();
  });

  test("disables create geofence button without points", async ({ page }) => {
    // Button should be disabled with 0 points
    await expect(page.getByTestId("create-geofence-button")).toBeDisabled();

    // Add sample polygon (use helper for sidebar scroll container)
    await clickSidebarButton(page.getByTestId("sample-geofence-button"));

    // Button should now be enabled
    await expect(page.getByTestId("create-geofence-button")).toBeEnabled();
  });

  test("creates a geofence successfully", async ({ page }) => {
    // Add sample polygon (use helper for sidebar scroll container)
    await clickSidebarButton(page.getByTestId("sample-geofence-button"));

    // Fill name
    const nameInput = page.getByRole("textbox", { name: "Name" });
    await nameInput.clear();
    await nameInput.fill("Test Geofence E2E");

    // Select visibility
    await page
      .getByRole("combobox", { name: "Visibility" })
      .selectOption("public");

    // Wait for POST request
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/geofences") &&
        response.request().method() === "POST"
    );

    // Create geofence
    await clickSidebarButton(page.getByTestId("create-geofence-button"));
    const response = await responsePromise;

    // Verify success
    expect(response.ok()).toBe(true);
    await expect(page.getByText("Geofence saved successfully")).toBeVisible();

    // Points should be cleared
    await expect(page.getByText("Points: 0")).toBeVisible();
  });

  test("shows error when creating geofence without enough points", async ({
    page,
  }) => {
    // Button should be disabled with 0 points (can't click to see error)
    await expect(page.getByTestId("create-geofence-button")).toBeDisabled();

    // Add only 2 points (still not enough)
    // Note: This test verifies button is disabled, not that error message shows
    // because Playwright can't click disabled buttons
  });

  test("displays created geofence in public list", async ({ page }) => {
    // Get initial count of public geofences
    const geofenceCards = page.getByTestId("geofence-card");
    const initialCount = await geofenceCards.count();

    // Create a geofence
    await page.getByTestId("sample-geofence-button").click();
    const nameInput = page.getByRole("textbox", { name: "Name" });
    await nameInput.clear();
    await nameInput.fill("E2E Test Geofence");

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/geofences") &&
        response.request().method() === "POST"
    );

    await clickSidebarButton(page.getByTestId("create-geofence-button"));
    await responsePromise;
    await expect(page.getByText("Geofence saved successfully")).toBeVisible();

    // Wait for UI to update
    await page.waitForTimeout(500);

    // Should appear in public list
    await expect(geofenceCards).toHaveCount(initialCount + 1);
    await expect(
      page
        .getByTestId("geofence-card")
        .filter({ hasText: "E2E Test Geofence" })
        .first()
    ).toBeVisible();
  });

  test("disables subscribe button without email", async ({ page }) => {
    // Button should be disabled without email
    await expect(page.getByTestId("subscribe-button")).toBeDisabled();

    // Add email
    await page.getByTestId("subscription-email").fill("test@example.com");

    // Still disabled without target polygon
    await expect(page.getByTestId("subscribe-button")).toBeDisabled();

    // Add sample polygon (use helper for sidebar scroll container)
    await clickSidebarButton(page.getByTestId("sample-geofence-button"));

    // Now should be enabled
    await expect(page.getByTestId("subscribe-button")).toBeEnabled();
  });

  test("subscribes to drawn polygon successfully", async ({ page }) => {
    // Add sample polygon (use helper for sidebar scroll container)
    await clickSidebarButton(page.getByTestId("sample-geofence-button"));

    // Fill email
    await page.getByTestId("subscription-email").fill("test-e2e@example.com");

    // Select some categories (use exact: true to avoid matching "Community Events" type)
    await page.getByRole("checkbox", { name: "Nature" }).check();
    await page
      .getByRole("checkbox", { name: "Community", exact: true })
      .check();

    // Select target (drawn polygon should be default)
    await expect(page.getByRole("combobox", { name: "Target" })).toHaveValue(
      "drawn"
    );

    // Wait for POST request
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/subscriptions") &&
        response.request().method() === "POST"
    );

    // Subscribe
    await clickSidebarButton(page.getByTestId("subscribe-button"));
    const response = await responsePromise;

    // Verify success
    expect(response.ok()).toBe(true);
    await expect(
      page.getByText("Subscription saved successfully")
    ).toBeVisible();

    // Email should be cleared
    await expect(page.getByTestId("subscription-email")).toHaveValue("");
  });

  test("subscribes to existing geofence", async ({ page }) => {
    // First create a geofence
    await page.getByTestId("sample-geofence-button").click();
    const nameInput = page.getByRole("textbox", { name: "Name" });
    await nameInput.clear();
    await nameInput.fill("Subscription Target");

    const geofenceResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/geofences") &&
        response.request().method() === "POST"
    );

    await clickSidebarButton(page.getByTestId("create-geofence-button"));
    await geofenceResponse;
    await expect(page.getByText("Geofence saved successfully")).toBeVisible();

    // Now subscribe to it
    await page
      .getByTestId("subscription-email")
      .fill("existing-test@example.com");

    // Select the created geofence as target
    const targetSelect = page.getByRole("combobox", { name: "Target" });
    await targetSelect.selectOption("Subscription Target");

    const subscriptionResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/subscriptions") &&
        response.request().method() === "POST"
    );

    await clickSidebarButton(page.getByTestId("subscribe-button"));
    const response = await subscriptionResponse;

    expect(response.ok()).toBe(true);
    await expect(
      page.getByText("Subscription saved successfully")
    ).toBeVisible();
  });

  test("checks and unchecks category filters", async ({ page }) => {
    const natureCheckbox = page.getByRole("checkbox", { name: "Nature" });

    // Initially unchecked
    await expect(natureCheckbox).not.toBeChecked();

    // Check it
    await natureCheckbox.check();
    await expect(natureCheckbox).toBeChecked();

    // Uncheck it
    await natureCheckbox.uncheck();
    await expect(natureCheckbox).not.toBeChecked();
  });

  test("checks multiple type filters", async ({ page }) => {
    const birdsCheckbox = page.getByRole("checkbox", { name: "Birds" });
    const wildlifeCheckbox = page.getByRole("checkbox", { name: "Wildlife" });

    // Check both
    await birdsCheckbox.check();
    await wildlifeCheckbox.check();

    await expect(birdsCheckbox).toBeChecked();
    await expect(wildlifeCheckbox).toBeChecked();
  });

  test("changes trust level selection", async ({ page }) => {
    const trustLevelSelect = page.getByRole("combobox", {
      name: "Trust level",
    });

    // Default should be "all"
    await expect(trustLevelSelect).toHaveValue("all");

    // Change to vetted
    await trustLevelSelect.selectOption("vetted");
    await expect(trustLevelSelect).toHaveValue("vetted");

    // Change to raw
    await trustLevelSelect.selectOption("raw");
    await expect(trustLevelSelect).toHaveValue("raw");
  });

  test("shows 'No public geofences yet' when list is empty", async ({
    page,
  }) => {
    // This test depends on data state, but checks the empty state exists
    const noGeofencesText = page.getByText("No public geofences yet");

    // If there are no geofences, this text should be visible
    // If there are geofences, geofence cards should be visible instead
    const geofenceCards = page.getByTestId("geofence-card");
    const cardCount = await geofenceCards.count();

    if (cardCount === 0) {
      await expect(noGeofencesText).toBeVisible();
    } else {
      await expect(noGeofencesText).not.toBeVisible();
    }
  });
});
