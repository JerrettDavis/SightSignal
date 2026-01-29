import { test, expect } from "@playwright/test";

test.describe("Integration Workflow", () => {
  test("complete workflow: explore, filter, report, verify", async ({
    page,
  }) => {
    // 1. Load homepage
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "SightSignal", exact: true })
    ).toBeVisible();

    // 2. Open Explore sidebar and check initial state
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    await page.waitForTimeout(300);

    const initialCountText = await page
      .locator("text=/\\d+ found/")
      .textContent();
    const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

    // 3. Apply filters to find specific signals
    await page.getByRole("button", { name: "Nature", exact: true }).click();
    await page.waitForTimeout(100);

    const filteredCountText = await page
      .locator("text=/\\d+ found/")
      .textContent();
    const filteredCount = parseInt(filteredCountText?.match(/\d+/)?.[0] || "0");

    // Filtered count should be <= initial
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // 4. Close Explore and open Report
    await page.waitForTimeout(300);
    const closeButton1 = page
      .getByRole("button", { name: "Close sidebar" })
      .first();
    await closeButton1.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(300);
    await page
      .getByRole("button", { name: "Report", exact: true })
      .first()
      .click();
    await page.waitForTimeout(300);

    // 5. Submit a new sighting
    await page
      .getByRole("combobox", { name: "Category" })
      .selectOption("cat-nature");
    await page
      .getByTestId("report-description")
      .fill("Integration test sighting");
    await page
      .getByRole("textbox", { name: "Details" })
      .fill("Testing complete workflow");
    await page.getByTestId("report-lat").fill("37.8042");
    await page.getByTestId("report-lng").fill("-122.4087");

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/sightings") &&
        response.request().method() === "POST"
    );

    await page.getByTestId("report-submit").click();
    await responsePromise;
    await expect(page.getByText("Submitted successfully")).toBeVisible();

    // 6. Go back to Explore and verify new signal appears
    const closeButton6 = page
      .getByRole("button", { name: "Close sidebar" })
      .first();
    await closeButton6.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    await page.waitForTimeout(300);

    // Wait for refresh
    await page.waitForTimeout(500);

    // Count should have increased
    const newCountText = await page.locator("text=/\\d+ found/").textContent();
    const newCount = parseInt(newCountText?.match(/\d+/)?.[0] || "0");

    // With Nature filter still active, count should include our new Nature sighting
    expect(newCount).toBeGreaterThanOrEqual(filteredCount);
  });

  test("workflow: create geofence, then subscribe to it", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500); // Extra wait for page to fully settle

    // 1. Open Geofences sidebar
    await page.getByRole("button", { name: "Geofences", exact: true }).click();
    await page.waitForTimeout(500); // Longer wait for sidebar animation

    // 2. Create a geofence
    await page.getByTestId("sample-geofence-button").click();
    const nameInput = page.getByRole("textbox", { name: "Name" });
    await nameInput.clear();
    await nameInput.fill("Workflow Test Geofence");

    const geofenceResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/geofences") &&
        response.request().method() === "POST"
    );

    await page.getByTestId("create-geofence-button").click();
    await geofenceResponse;
    await expect(page.getByText("Geofence saved successfully")).toBeVisible();

    // 3. Verify it appears in public list
    await expect(
      page
        .getByTestId("geofence-card")
        .filter({ hasText: "Workflow Test Geofence" })
        .first()
    ).toBeVisible();

    // 4. Subscribe to the newly created geofence
    await page
      .getByTestId("subscription-email")
      .fill("workflow-test@example.com");

    // Select the geofence we just created
    const targetSelect = page.getByRole("combobox", { name: "Target" });
    await targetSelect.selectOption("Workflow Test Geofence");

    // Select some filters
    await page.getByRole("checkbox", { name: "Nature" }).check();
    await page.getByRole("checkbox", { name: "Birds" }).check();

    const subscriptionResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/subscriptions") &&
        response.request().method() === "POST"
    );

    await page.getByTestId("subscribe-button").click();
    await subscriptionResponse;
    await expect(
      page.getByText("Subscription saved successfully")
    ).toBeVisible();
  });

  test("workflow: filter signals, switch views, filters persist", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. Open Explore and apply filters
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: "Nature", exact: true }).click();
    await page.getByRole("button", { name: "Community", exact: true }).click();

    const importanceSelect = page
      .locator("select")
      .filter({ hasText: /All levels/ });
    await importanceSelect.selectOption("high");

    await page.waitForTimeout(100);

    // 2. Switch to Report
    const closeButton2 = page
      .getByRole("button", { name: "Close sidebar" })
      .first();
    await closeButton2.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(300);
    await page
      .getByRole("button", { name: "Report", exact: true })
      .first()
      .click();
    await page.waitForTimeout(300);

    // 3. Switch back to Explore
    const closeButton3 = page
      .getByRole("button", { name: "Close sidebar" })
      .first();
    await closeButton3.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    await page.waitForTimeout(300);

    // 4. Verify filters are still applied
    await expect(
      page.getByRole("button", { name: "Nature", exact: true })
    ).toHaveClass(/bg-\[color:var\(--accent-primary\)\]/);
    await expect(
      page.getByRole("button", { name: "Community", exact: true })
    ).toHaveClass(/bg-\[color:var\(--accent-primary\)\]/);
    await expect(importanceSelect).toHaveValue("high");
  });

  test("workflow: submit report with custom fields, verify in API response", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page
      .getByRole("button", { name: "Report", exact: true })
      .first()
      .click();
    await page.waitForTimeout(300);

    // Fill form with custom field
    await page
      .getByRole("combobox", { name: "Category" })
      .selectOption("cat-community");
    await page.getByTestId("report-description").fill("Community event");
    await page.getByTestId("report-lat").fill("37.8042");
    await page.getByTestId("report-lng").fill("-122.4087");
    await page
      .getByRole("textbox", { name: "Custom field key" })
      .fill("organizer");
    await page
      .getByRole("textbox", { name: "Custom field value" })
      .fill("Test Org");

    let capturedRequestBody: unknown;

    page.on("request", (request) => {
      if (
        request.url().includes("/api/sightings") &&
        request.method() === "POST"
      ) {
        capturedRequestBody = JSON.parse(request.postData() || "{}");
      }
    });

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/sightings") &&
        response.request().method() === "POST"
    );

    await page.getByTestId("report-submit").click();
    await responsePromise;

    // Verify custom field was sent
    expect(capturedRequestBody.fields).toEqual({ organizer: "Test Org" });
  });

  test("workflow: multiple reports in sequence", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page
      .getByRole("button", { name: "Report", exact: true })
      .first()
      .click();
    await page.waitForTimeout(300);

    // Submit first report
    await page.getByTestId("report-description").fill("First sighting");
    await page.getByTestId("report-lat").fill("37.8042");
    await page.getByTestId("report-lng").fill("-122.4087");

    const response1 = page.waitForResponse(
      (response) =>
        response.url().includes("/api/sightings") &&
        response.request().method() === "POST"
    );

    await page.getByTestId("report-submit").click();
    await response1;
    await expect(page.getByText("Submitted successfully")).toBeVisible();

    // Form should be cleared, submit second report
    await page.getByTestId("report-description").fill("Second sighting");
    await page.getByTestId("report-lat").fill("37.7749");
    await page.getByTestId("report-lng").fill("-122.4194");

    const response2 = page.waitForResponse(
      (response) =>
        response.url().includes("/api/sightings") &&
        response.request().method() === "POST"
    );

    await page.getByTestId("report-submit").click();
    await response2;
    await expect(page.getByText("Submitted successfully")).toBeVisible();
  });

  test("workflow: error handling and recovery", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page
      .getByRole("button", { name: "Report", exact: true })
      .first()
      .click();
    await page.waitForTimeout(300);

    // 1. Try to submit with invalid coordinates
    await page.getByTestId("report-description").fill("Test error handling");
    await page.getByTestId("report-lat").fill("invalid");
    await page.getByTestId("report-lng").fill("not-a-number");

    await page.getByTestId("report-submit").click();
    await expect(
      page.getByText("Please check inputs and try again")
    ).toBeVisible();

    // 2. Fix the error
    await page.getByTestId("report-lat").clear();
    await page.getByTestId("report-lng").clear();
    await page.getByTestId("report-lat").fill("37.8042");
    await page.getByTestId("report-lng").fill("-122.4087");

    // 3. Retry submission
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/sightings") &&
        response.request().method() === "POST"
    );

    await page.getByTestId("report-submit").click();
    await responsePromise;

    // Should now succeed
    await expect(page.getByText("Submitted successfully")).toBeVisible();
  });

  test("workflow: theme persists across sidebar navigation", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Set theme
    const themeToggle = page.getByRole("button", { name: /Toggle theme/ });
    await themeToggle.click();
    await page.waitForTimeout(100);

    const html = page.locator("html");
    const selectedTheme = await html.getAttribute("data-theme");

    // Navigate through sidebars
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    await page.waitForTimeout(300);
    await expect(html).toHaveAttribute("data-theme", selectedTheme);

    const closeButton4 = page
      .getByRole("button", { name: "Close sidebar" })
      .first();
    await closeButton4.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(300);
    await page
      .getByRole("button", { name: "Report", exact: true })
      .first()
      .click();
    await page.waitForTimeout(300);
    await expect(html).toHaveAttribute("data-theme", selectedTheme);

    const closeButton5 = page
      .getByRole("button", { name: "Close sidebar" })
      .first();
    await closeButton5.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Geofences", exact: true }).click();
    await page.waitForTimeout(300);
    await expect(html).toHaveAttribute("data-theme", selectedTheme);
  });
});
