// DSP regression suites exercise every tool; studio-simplicity tests the folded UI itself.
export async function revealStudioTools(page) {
  await page.locator('details.studio-panel, details.studio-options, details.deck-tools').evaluateAll(panels => {
    for (const panel of panels) panel.open = true;
  });
}
