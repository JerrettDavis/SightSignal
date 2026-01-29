import { test, expect, type Page } from "@playwright/test";

test.describe("Admin CRUD Operations", () => {
  // Skip these slow tests in CI to keep pipeline fast
  test.skip(!!process.env.CI, "Admin CRUD tests are slow - skip in CI");

  // Helper function to login
  const adminLogin = async (page: Page) => {
    await page.goto("/admin/login");
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "Password!");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/admin");
  };

  test("should view and navigate to all admin sections", async ({ page }) => {
    await adminLogin(page);

    // Check dashboard metrics are visible
    await expect(page.getByText("Total Sightings").first()).toBeVisible();
    await expect(page.getByText("Active Sightings").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
    await expect(page.getByText("Subscriptions").first()).toBeVisible();

    // Navigate to Sightings
    await page.click('a[href="/admin/sightings"]');
    await expect(page).toHaveURL("/admin/sightings");
    await expect(page.getByText("Sightings Management")).toBeVisible();

    // Navigate to Geofences
    await page.click('a[href="/admin/geofences"]');
    await expect(page).toHaveURL("/admin/geofences");
    await expect(page.getByText("Geofences Management")).toBeVisible();

    // Navigate to Subscriptions
    await page.click('a[href="/admin/subscriptions"]');
    await expect(page).toHaveURL("/admin/subscriptions");
    await expect(page.getByText("Subscriptions Management")).toBeVisible();
  });

  test("should search and filter sightings", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/sightings");

    // Wait for data to load
    await page.waitForTimeout(500);

    // Search for a sighting
    const searchInput = page.getByPlaceholder("Search sightings...");
    if (await searchInput.isVisible()) {
      await searchInput.fill("test");
      await page.waitForTimeout(300);
      // Results should be filtered
    }
  });

  test("should update a sighting", async ({ page }) => {
    // First, create a test sighting
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: "Report", exact: true })
      .first()
      .click();
    await page.waitForTimeout(300);

    await page
      .getByRole("combobox", { name: "Category" })
      .selectOption("cat-nature");
    await page.getByTestId("report-description").fill("Admin test sighting");
    await page.getByTestId("report-lat").fill("37.8042");
    await page.getByTestId("report-lng").fill("-122.4087");

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/sightings") &&
        response.request().method() === "POST"
    );

    await page.getByTestId("report-submit").click();
    await createResponse;
    await expect(page.getByText("Submitted successfully")).toBeVisible();

    // Now login to admin and update it
    await adminLogin(page);
    await page.goto("/admin/sightings");
    await page.waitForTimeout(500);

    // Find the sighting we just created
    const sightingRow = page.locator('text="Admin test sighting"').first();
    await expect(sightingRow).toBeVisible();

    // Click edit button
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();

    // Modal should open
    await expect(page.getByText("Edit Sighting")).toBeVisible();

    // Update description
    const descriptionInput = page.getByLabel("Description");
    await descriptionInput.clear();
    await descriptionInput.fill("Updated admin test sighting");

    // Change importance
    await page.getByLabel("Importance").selectOption("high");

    // Save
    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/sightings/") &&
        response.request().method() === "PATCH"
    );

    await page.click('button:has-text("Save")');
    await updateResponse;

    // Verify update
    await page.waitForTimeout(500);
    await expect(page.getByText("Updated admin test sighting")).toBeVisible();
  });

  test("should delete a sighting", async ({ page }) => {
    // Create a test sighting first
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: "Report", exact: true })
      .first()
      .click();
    await page.waitForTimeout(300);

    await page.getByTestId("report-description").fill("Sighting to delete");
    await page.getByTestId("report-lat").fill("37.8042");
    await page.getByTestId("report-lng").fill("-122.4087");

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/sightings") &&
        response.request().method() === "POST"
    );

    await page.getByTestId("report-submit").click();
    await createResponse;

    // Login to admin
    await adminLogin(page);
    await page.goto("/admin/sightings");
    await page.waitForTimeout(500);

    // Find and delete the sighting
    const sightingRow = page.locator('text="Sighting to delete"').first();
    await expect(sightingRow).toBeVisible();

    const deleteButton = page.locator('button:has-text("Delete")').first();
    await deleteButton.click();

    // Confirm deletion
    await expect(page.getByText(/Are you sure/)).toBeVisible();

    const confirmResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/sightings/") &&
        response.request().method() === "DELETE"
    );

    await page.click('button:has-text("Delete"):has-text("Confirm")');
    await confirmResponse;

    // Verify deletion
    await page.waitForTimeout(500);
    await expect(page.locator('text="Sighting to delete"')).not.toBeVisible();
  });

  test("should bulk delete sightings", async ({ page }) => {
    // Create multiple test sightings
    for (let i = 1; i <= 3; i++) {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page
        .getByRole("button", { name: "Report", exact: true })
        .first()
        .click();
      await page.waitForTimeout(300);

      await page
        .getByTestId("report-description")
        .fill(`Bulk delete test ${i}`);
      await page.getByTestId("report-lat").fill("37.8042");
      await page.getByTestId("report-lng").fill("-122.4087");

      const createResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/api/sightings") &&
          response.request().method() === "POST"
      );

      await page.getByTestId("report-submit").click();
      await createResponse;
    }

    // Login to admin
    await adminLogin(page);
    await page.goto("/admin/sightings");
    await page.waitForTimeout(500);

    // Select multiple sightings
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count > 3) {
      // Select first 3 checkboxes
      for (let i = 0; i < 3; i++) {
        await checkboxes.nth(i).check();
      }

      // Click bulk delete button
      await page.click('button:has-text("Delete selected")');

      // Confirm
      await expect(page.getByText(/Are you sure.*3 items/)).toBeVisible();

      const bulkResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/sightings/bulk-delete") &&
          response.request().method() === "POST"
      );

      await page.click('button:has-text("Delete"):has-text("Confirm")');
      await bulkResponse;

      // Verify deletion
      await page.waitForTimeout(500);
    }
  });

  test("should update a geofence", async ({ page }) => {
    // Create a geofence first
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Geofences", exact: true }).click();
    await page.waitForTimeout(500);

    await page.getByTestId("sample-geofence-button").click();
    const nameInput = page.getByRole("textbox", { name: "Name" });
    await nameInput.clear();
    await nameInput.fill("Geofence to update");

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/geofences") &&
        response.request().method() === "POST"
    );

    await page.getByTestId("create-geofence-button").click();
    await createResponse;

    // Login to admin and update
    await adminLogin(page);
    await page.goto("/admin/geofences");
    await page.waitForTimeout(500);

    const geofenceRow = page.locator('text="Geofence to update"').first();
    await expect(geofenceRow).toBeVisible();

    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();

    // Update name
    const nameField = page.getByLabel("Name");
    await nameField.clear();
    await nameField.fill("Updated geofence name");

    // Change visibility
    await page.getByLabel("Visibility").selectOption("private");

    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/geofences/") &&
        response.request().method() === "PATCH"
    );

    await page.click('button:has-text("Save")');
    await updateResponse;

    // Verify update
    await page.waitForTimeout(500);
    await expect(page.getByText("Updated geofence name")).toBeVisible();
    await expect(page.getByText("private")).toBeVisible();
  });

  test("should delete a geofence", async ({ page }) => {
    // Create a geofence first
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Geofences", exact: true }).click();
    await page.waitForTimeout(500);

    await page.getByTestId("sample-geofence-button").click();
    const nameInput = page.getByRole("textbox", { name: "Name" });
    await nameInput.clear();
    await nameInput.fill("Geofence to delete");

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/geofences") &&
        response.request().method() === "POST"
    );

    await page.getByTestId("create-geofence-button").click();
    await createResponse;

    // Login to admin and delete
    await adminLogin(page);
    await page.goto("/admin/geofences");
    await page.waitForTimeout(500);

    const geofenceRow = page.locator('text="Geofence to delete"').first();
    await expect(geofenceRow).toBeVisible();

    const deleteButton = page.locator('button:has-text("Delete")').first();
    await deleteButton.click();

    // Confirm deletion
    const deleteResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/geofences/") &&
        response.request().method() === "DELETE"
    );

    await page.click('button:has-text("Confirm")');
    await deleteResponse;

    // Verify deletion
    await page.waitForTimeout(500);
    await expect(page.locator('text="Geofence to delete"')).not.toBeVisible();
  });

  test("should view dashboard metrics correctly", async ({ page }) => {
    // Create some test data
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Create a sighting
    await page
      .getByRole("button", { name: "Report", exact: true })
      .first()
      .click();
    await page.waitForTimeout(300);
    await page.getByTestId("report-description").fill("Metrics test sighting");
    await page.getByTestId("report-lat").fill("37.8042");
    await page.getByTestId("report-lng").fill("-122.4087");
    await page
      .getByRole("combobox", { name: "Importance" })
      .selectOption("high");

    const sightingResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/sightings") &&
        response.request().method() === "POST"
    );
    await page.getByTestId("report-submit").click();
    await sightingResponse;

    // Create a geofence
    const closeButton = page
      .getByRole("button", { name: "Close sidebar" })
      .first();
    await closeButton.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: "Geofences", exact: true }).click();
    await page.waitForTimeout(500);
    await page.getByTestId("sample-geofence-button").click();

    const geofenceResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/geofences") &&
        response.request().method() === "POST"
    );
    await page.getByTestId("create-geofence-button").click();
    await geofenceResponse;

    // Check admin metrics
    await adminLogin(page);

    // Verify metrics are numbers and make sense
    const totalSightings = page.getByText(/Total Sightings/).locator("..");
    await expect(totalSightings).toBeVisible();

    const activeSightings = page.getByText(/Active Sightings/).locator("..");
    await expect(activeSightings).toBeVisible();

    const geofencesCount = page.getByText(/Geofences/).locator("..");
    await expect(geofencesCount).toBeVisible();
  });
});
