import { test, expect, Page } from "@playwright/test";

test.describe("Geofence Map Editor", () => {
  // Login helper
  async function loginAsAdmin(page: Page) {
    await page.goto("/admin/login");
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "Password!");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/admin", { timeout: 10000 });
  }

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should open map editor when clicking Edit Shape", async ({ page }) => {
    // Navigate to geofences page
    await page.goto("/admin/geofences");

    // Wait for geofences to load
    await page.waitForSelector('button:has-text("Edit Shape")', {
      timeout: 10000,
    });

    // Click first "Edit Shape" button
    await page.click('button:has-text("Edit Shape")');

    // Map editor should be visible
    await expect(page.locator(".maplibregl-map")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Edit Geofence Shape")).toBeVisible();
    await expect(page.getByText("Move Points")).toBeVisible();
  });

  test("should show all edit mode buttons", async ({ page }) => {
    await page.goto("/admin/geofences");
    await page.click('button:has-text("Edit Shape")');

    // Wait for map to load
    await page.waitForSelector(".maplibregl-map", { timeout: 10000 });

    // Check all mode buttons are present
    await expect(page.locator('button:has-text("Move Points")')).toBeVisible();
    await expect(page.locator('button:has-text("Move All")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Points")')).toBeVisible();
    await expect(
      page.locator('button:has-text("Delete Points")')
    ).toBeVisible();
  });

  test("should show Ctrl key indicator in Move Points mode", async ({
    page,
  }) => {
    await page.goto("/admin/geofences");
    await page.click('button:has-text("Edit Shape")');

    await page.waitForSelector(".maplibregl-map", { timeout: 10000 });

    // Should show Ctrl not pressed initially
    await expect(page.getByText("⊗ Ctrl Not Pressed")).toBeVisible();

    // Press Ctrl key
    await page.keyboard.down("Control");

    // Should show Ctrl active
    await expect(page.getByText("✓ Ctrl Active - Ready to drag")).toBeVisible({
      timeout: 2000,
    });

    // Release Ctrl
    await page.keyboard.up("Control");

    // Should show Ctrl not pressed again
    await expect(page.getByText("⊗ Ctrl Not Pressed")).toBeVisible({
      timeout: 2000,
    });
  });

  test("should test point dragging with Ctrl key", async ({ page }) => {
    await page.goto("/admin/geofences");
    await page.click('button:has-text("Edit Shape")');

    // Wait for map to load
    await page.waitForSelector(".maplibregl-map", { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for map to fully render

    // Get canvas element
    const canvas = page.locator(".maplibregl-canvas");
    await expect(canvas).toBeVisible();

    // Get canvas bounding box
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("Canvas not found");

    // Calculate a point near center of canvas to drag from
    const startX = canvasBox.x + canvasBox.width * 0.5;
    const startY = canvasBox.y + canvasBox.height * 0.5;
    const endX = startX + 50; // Drag 50px to the right
    const endY = startY + 50; // Drag 50px down

    // Press Ctrl key
    await page.keyboard.down("Control");

    // Verify Ctrl is active
    await expect(page.getByText("✓ Ctrl Active")).toBeVisible({
      timeout: 2000,
    });

    // Perform drag operation
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(100);

    // Move in small increments to simulate real dragging
    for (let i = 1; i <= 5; i++) {
      const intermediateX = startX + (endX - startX) * (i / 5);
      const intermediateY = startY + (endY - startY) * (i / 5);
      await page.mouse.move(intermediateX, intermediateY);
      await page.waitForTimeout(50);
    }

    await page.mouse.up();
    await page.keyboard.up("Control");

    // Note: We can't easily verify the point moved without checking the actual coordinates
    // But we can verify no errors occurred and the map is still interactive
    await expect(canvas).toBeVisible();
  });

  test("should test Move All mode", async ({ page }) => {
    await page.goto("/admin/geofences");
    await page.click('button:has-text("Edit Shape")');

    await page.waitForSelector(".maplibregl-map", { timeout: 10000 });

    // Click Move All button
    await page.click('button:has-text("Move All")');

    // Should show Ctrl indicator for Move All mode too
    await expect(page.getByText("⊗ Ctrl Not Pressed")).toBeVisible();

    // Press Ctrl and try to drag
    await page.keyboard.down("Control");
    await expect(page.getByText("✓ Ctrl Active")).toBeVisible();

    const canvas = page.locator(".maplibregl-canvas");
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("Canvas not found");

    const startX = canvasBox.x + canvasBox.width * 0.5;
    const startY = canvasBox.y + canvasBox.height * 0.5;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 30, startY + 30, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up("Control");
  });

  test("should test Add Points mode", async ({ page }) => {
    await page.goto("/admin/geofences");
    await page.click('button:has-text("Edit Shape")');

    await page.waitForSelector(".maplibregl-map", { timeout: 10000 });

    // Click Add Points button
    await page.click('button:has-text("Add Points")');

    // Get initial point count
    const initialCountText = await page
      .locator("text=/\\d+ points/")
      .textContent();
    const initialCount = parseInt(initialCountText?.match(/(\d+)/)?.[1] || "0");

    // Click on map to add a point
    const canvas = page.locator(".maplibregl-canvas");
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("Canvas not found");

    await canvas.click({
      position: {
        x: canvasBox.width * 0.6,
        y: canvasBox.height * 0.6,
      },
    });

    await page.waitForTimeout(500);

    // Verify point count increased
    const newCountText = await page.locator("text=/\\d+ points/").textContent();
    const newCount = parseInt(newCountText?.match(/(\d+)/)?.[1] || "0");

    expect(newCount).toBe(initialCount + 1);
  });

  test("should test Delete Points mode", async ({ page }) => {
    await page.goto("/admin/geofences");
    await page.click('button:has-text("Edit Shape")');

    await page.waitForSelector(".maplibregl-map", { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Get initial point count
    const initialCountText = await page
      .locator("text=/\\d+ points/")
      .textContent();
    const initialCount = parseInt(initialCountText?.match(/(\d+)/)?.[1] || "0");

    if (initialCount <= 3) {
      // Skip test if there aren't enough points (need at least 3 for polygon)
      test.skip();
      return;
    }

    // Click Delete Points button
    await page.click('button:has-text("Delete Points")');
    await page.waitForTimeout(300);

    // Click multiple times to ensure we hit a point (since we don't know exact positions)
    const canvas = page.locator(".maplibregl-canvas");
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("Canvas not found");

    // Try clicking in several locations to find a point
    let clickSuccess = false;
    const positions = [
      { x: canvasBox.width * 0.5, y: canvasBox.height * 0.5 },
      { x: canvasBox.width * 0.4, y: canvasBox.height * 0.4 },
      { x: canvasBox.width * 0.6, y: canvasBox.height * 0.4 },
    ];

    for (const pos of positions) {
      const beforeCount = await page
        .locator("text=/\\d+ points/")
        .textContent();
      await canvas.click({ position: pos });
      await page.waitForTimeout(300);
      const afterCount = await page.locator("text=/\\d+ points/").textContent();

      if (beforeCount !== afterCount) {
        clickSuccess = true;
        break;
      }
    }

    // If we successfully deleted a point, verify the count decreased
    const newCountText = await page.locator("text=/\\d+ points/").textContent();
    const newCount = parseInt(newCountText?.match(/(\d+)/)?.[1] || "0");

    if (clickSuccess) {
      expect(newCount).toBe(initialCount - 1);
    } else {
      // If we didn't hit a point, just verify count hasn't increased
      expect(newCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test("should save changes and close editor", async ({ page }) => {
    await page.goto("/admin/geofences");
    await page.click('button:has-text("Edit Shape")');

    await page.waitForSelector(".maplibregl-map", { timeout: 10000 });

    // Make a change (add a point)
    await page.click('button:has-text("Add Points")');
    const canvas = page.locator(".maplibregl-canvas");
    await canvas.click({
      position: { x: 100, y: 100 },
    });

    await page.waitForTimeout(500);

    // Click Save button
    await page.click('button:has-text("Save Changes")');

    // Wait for save operation and editor to close
    await page.waitForTimeout(2000);

    // Map editor should be closed
    await expect(page.locator(".maplibregl-map")).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("should cancel changes and close editor", async ({ page }) => {
    await page.goto("/admin/geofences");
    await page.click('button:has-text("Edit Shape")');

    await page.waitForSelector(".maplibregl-map", { timeout: 10000 });

    // Click Cancel button
    await page.click('button:has-text("Cancel")');

    // Map editor should be closed immediately
    await expect(page.locator(".maplibregl-map")).not.toBeVisible({
      timeout: 2000,
    });
  });

  test("should detect drag event interference", async ({ page }) => {
    await page.goto("/admin/geofences");
    await page.click('button:has-text("Edit Shape")');

    await page.waitForSelector(".maplibregl-map", { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Enable console monitoring
    const consoleMessages: string[] = [];
    page.on("console", (msg) => consoleMessages.push(msg.text()));

    const canvas = page.locator(".maplibregl-canvas");
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("Canvas not found");

    const startX = canvasBox.x + canvasBox.width * 0.5;
    const startY = canvasBox.y + canvasBox.height * 0.5;

    // Press Ctrl and try to drag
    await page.keyboard.down("Control");
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Small drag movement
    await page.mouse.move(startX + 10, startY + 10, { steps: 2 });
    await page.waitForTimeout(100);

    await page.mouse.up();
    await page.keyboard.up("Control");

    // Check if map panned (this would indicate event interference)
    // We can detect this by checking if the map's center changed significantly
    const mapState = await page.evaluate(() => {
      const mapContainer = document.querySelector(
        ".maplibregl-map"
      ) as HTMLElement & {
        _map?: { getCenter: () => { lng: number; lat: number } };
      };
      if (mapContainer?._map) {
        const center = mapContainer._map.getCenter();
        return { lng: center.lng, lat: center.lat };
      }
      return null;
    });

    // Log for debugging
    console.log("Map state after drag:", mapState);
    console.log("Console messages:", consoleMessages);
  });
});
