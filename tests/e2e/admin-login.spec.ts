import { test, expect } from "@playwright/test";

test.describe("Admin Login", () => {
  test("should successfully login with correct credentials", async ({
    page,
  }) => {
    // Navigate to admin page (should redirect to login)
    await page.goto("/admin");

    // Should redirect to login page
    await expect(page).toHaveURL("/admin/login");

    // Verify login page elements
    await expect(
      page.getByRole("heading", { name: "Admin Login" })
    ).toBeVisible();

    // Fill in login form
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "Password!");

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to admin dashboard
    await expect(page).toHaveURL("/admin", { timeout: 10000 });

    // Verify we're on the dashboard
    await expect(page.getByText("SightSignal Admin")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
  });

  test("should show error with incorrect credentials", async ({ page }) => {
    await page.goto("/admin/login");

    // Fill in wrong credentials
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "wrongpassword");

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.getByText(/Invalid username or password/i)).toBeVisible();

    // Should still be on login page
    await expect(page).toHaveURL("/admin/login");
  });

  test("should logout successfully", async ({ page }) => {
    // Login first
    await page.goto("/admin/login");
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "Password!");
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL("/admin");

    // Click logout button
    await page.click('button:has-text("Logout")');

    // Should redirect to login page
    await expect(page).toHaveURL("/admin/login", { timeout: 10000 });
  });

  test("admin button should appear in main app when authenticated", async ({
    page,
  }) => {
    // Login first
    await page.goto("/admin/login");
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "Password!");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/admin");

    // Navigate to main app
    await page.goto("/");

    // Wait for admin status check
    await page.waitForTimeout(1000);

    // Admin button should be visible
    await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
  });
});
