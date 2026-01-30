import { Locator } from "@playwright/test";

/**
 * Clicks a button inside a sidebar using JavaScript evaluation.
 * This bypasses Playwright's viewport checks which fail for elements
 * in scrollable containers (overflow-y-auto).
 *
 * @param locator - The Playwright locator for the button to click
 */
export async function clickSidebarButton(locator: Locator): Promise<void> {
  await locator.evaluate((el) => (el as HTMLElement).click());
}

/**
 * Clicks multiple sidebar buttons in sequence.
 *
 * @param locators - Array of Playwright locators to click in order
 */
export async function clickSidebarButtons(
  ...locators: Locator[]
): Promise<void> {
  for (const locator of locators) {
    await clickSidebarButton(locator);
  }
}
