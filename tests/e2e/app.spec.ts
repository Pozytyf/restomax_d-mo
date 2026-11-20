import { expect, test } from '@playwright/test';

test.describe('Resto’MAX End-to-End Browser Journeys', () => {
  test('1. Marketing FR/EN switcher & secondary pages render translated copy cleanly', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.setItem('restomax_lang', 'fr'));
    await page.reload();

    await expect(
      page.getByRole('heading', {
        name: /Votre restaurant\. Votre équipe\./i,
      }),
    ).toBeVisible();

    // Toggle to English via header language switcher
    await page.getByTestId('lang-btn-en').first().click();

    await expect(
      page.getByRole('heading', {
        name: /Your restaurant\. Your team\. Your performance/i,
      }),
    ).toBeVisible();

    // Navigate to Features secondary page in English
    await page.goto('/fonctionnalites');
    await expect(
      page.getByRole('heading', {
        name: /Every operational tool unified in one platform/i,
      }),
    ).toBeVisible();
    await expect(page.getByText('06. Inventory & Recipes')).toBeVisible();

    // Navigate to Pricing & FAQ in English
    await page.goto('/tarifs');
    await expect(
      page.getByRole('heading', {
        name: /Plans tailored to the size of your venue/i,
      }),
    ).toBeVisible();

    await page.goto('/faq');
    await expect(
      page.getByRole('heading', {
        name: /Frequently asked questions about Resto’MAX/i,
      }),
    ).toBeVisible();

    // Switch back to FR
    await page.getByTestId('lang-btn-fr').first().click();
    await expect(
      page.getByRole('heading', {
        name: /Questions fréquentes sur Resto’MAX/i,
      }),
    ).toBeVisible();
  });

  test('2. Customer QR portal dark mode toggle + order submission -> live delivery tracker', async ({
    page,
  }) => {
    await page.goto('/q/sillage-table-01-v1');
    await page.evaluate(() => {
      window.localStorage.setItem('restomax_lang', 'fr');
      window.localStorage.setItem('restomax_theme', 'light');
    });
    await page.reload();

    await expect(page.getByText('Le Sillage Lagune')).toBeVisible();

    // Toggle dark mode on QR Menu
    const themeBtn = page
      .locator('button[aria-label*="sombre"], button[aria-label*="clair"]')
      .first();
    await themeBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Add Bissap or first available dish
    const addBtn = page.getByRole('button', { name: /Ajouter/i }).first();
    await addBtn.click();

    // If options modal opens, click "Ajouter au panier"
    const modalAdd = page.getByRole('button', { name: /Ajouter au panier/i });
    if (await modalAdd.isVisible({ timeout: 1500 }).catch(() => false)) {
      await modalAdd.click();
    }

    // Open cart drawer & submit order
    await page.getByRole('button', { name: /Voir mon panier/i }).click();
    await page.getByPlaceholder(/Votre prénom/i).fill('Client E2E');
    await page.getByRole('button', { name: /Confirmer la commande/i }).click();

    // Redirected to live delivery tracking page while preserving dark mode
    await page.waitForURL(/\/q\/sillage-table-01-v1\/suivi\//);
    await expect(page.getByText(/Suivi de livraison/i)).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('3. Restaurant Owner flow: Recipe Editor, Stocks SMTP preview, Settings ESC/POS test, POS shortcuts & KDS grouping', async ({
    page,
  }) => {
    await page.goto('/connexion');
    await page.evaluate(() => {
      window.localStorage.setItem('restomax_lang', 'fr');
      window.localStorage.setItem('restomax_theme', 'light');
    });
    await page.reload();

    // 1-click demo login as Owner
    await page.getByRole('button', { name: /proprietaire@lesillage\.ci/i }).click();
    await page.waitForURL(/\/app$/);
    await expect(page.getByText(/Tableau de bord Propriétaire/i)).toBeVisible();

    // Verify modular summary cards: Daily Revenue, Active Orders, Stock Alerts + Customize toggle
    await expect(page.getByTestId('summary-card-daily-revenue')).toBeVisible();
    await expect(page.getByTestId('summary-card-active-orders')).toBeVisible();
    await expect(page.getByTestId('summary-card-stock-alerts')).toBeVisible();

    await page.getByTestId('dashboard-customize-btn').click();
    await expect(page.getByTestId('dashboard-widget-customizer')).toBeVisible();
    await page.getByTestId('widget-toggle-stock-alerts').click();
    await expect(page.getByTestId('summary-card-stock-alerts')).toBeHidden();
    await page.getByTestId('widget-toggle-stock-alerts').click();
    await expect(page.getByTestId('summary-card-stock-alerts')).toBeVisible();
    await page.getByTestId('dashboard-customize-btn').click();

    // Toggle dark mode in Restaurant portal
    const restoThemeBtn = page
      .locator('button[aria-label*="sombre"], button[aria-label*="clair"]')
      .first();
    await restoThemeBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Open Menu Catalog & Recipe Editor modal
    await page.goto('/app/menu');
    await expect(page.getByTestId('recipe-btn-itm_poulet')).toBeVisible();
    await page.getByTestId('recipe-btn-itm_poulet').click();
    await expect(page.getByText(/Fiche technique : Poulet braisé/i)).toBeVisible();
    await page.getByRole('button', { name: /Enregistrer la fiche technique/i }).click();
    await expect(page.getByText(/Fiche technique : Poulet braisé/i)).toBeHidden();

    // Check Settings ESC/POS Thermal Printer test preview
    await page.goto('/app/settings');
    await expect(page.getByText(/Impression thermique dédiée \(ESC\/POS\)/i)).toBeVisible();
    await page.getByRole('button', { name: /Tester l’impression ESC\/POS/i }).click();
    await expect(page.getByText('TEST-ESCPOS')).toBeVisible();

    // Check Stocks SMTP Configuration panel & AUTO_ORDER badge visibility
    await page.goto('/app/stocks');
    await page.getByRole('button', { name: /Alertes auto/i }).click();
    await expect(page.getByText(/Serveur SMTP dédié de production/i)).toBeVisible();

    // POS Keyboard Shortcuts (F1, F3, F2) + Receipt Thermal Button
    await page.goto('/app/pos');
    await expect(page.getByTestId('pos-shortcuts-bar')).toBeVisible();

    // Press F1 -> focus customer name input & enter name
    await page.keyboard.press('F1');
    const customerInput = page.getByPlaceholder(/Nom client/i);
    await customerInput.fill('Client Raccourci');

    // Add first catalog item, then test F3 cancel
    const firstDishCard = page.getByRole('button', { name: /Capitaine grillé/i }).first();
    await firstDishCard.click();
    await expect(page.getByText(/1× Capitaine grillé/i).or(page.getByText('Capitaine grillé & Attiéké').nth(1))).toBeVisible();
    await page.keyboard.press('F3');

    // Re-add item and press F2 to submit & open payment modal, then F2 to confirm payment
    await firstDishCard.click();
    await page.keyboard.press('F2');
    await expect(page.getByRole('button', { name: /Valider l’encaissement/i })).toBeVisible();
    await page.keyboard.press('F2');

    // Receipt modal opens with ESC/POS thermal print button
    await expect(page.getByTestId('pos-thermal-print-btn')).toBeVisible();
    await page.getByTestId('pos-thermal-print-btn').click();
    await expect(page.getByText(/Aperçu prêt/i)).toBeVisible();
    await page.getByRole('button', { name: 'Fermer', exact: true }).first().click();

    // Check KDS Preparation Time visual grouping + Color-coded Status indicators + Table/Zone grouping
    await page.goto('/app/kitchen');
    await expect(page.getByTestId('kds-status-bar')).toBeVisible();
    await expect(page.getByTestId('kds-prep-time-board')).toBeVisible();
    await expect(page.getByTestId('kds-time-tier-CRITICAL')).toBeVisible();
    await expect(page.getByTestId('kds-time-tier-ACTIVE')).toBeVisible();
    await expect(page.getByTestId('kds-time-tier-FRESH')).toBeVisible();
    await expect(page.getByRole('button', { name: /Par table/i })).toBeVisible();
    await page.getByRole('button', { name: /Par zone/i }).click();
    await expect(page.getByText(/Cumul à préparer/i).first()).toBeVisible();
  });

  test('4. Super-Admin portal dark mode toggle & full EN/FR subpages', async ({
    page,
  }) => {
    await page.goto('/connexion');
    await page.evaluate(() => {
      window.localStorage.setItem('restomax_lang', 'en');
      window.localStorage.setItem('restomax_theme', 'light');
    });
    await page.reload();

    await page.getByRole('button', { name: /superadmin@restomax\.ci/i }).click();
    await page.waitForURL(/\/superadmin$/);
    await expect(page.getByText('Super Admin Dashboard')).toBeVisible();

    // Toggle dark mode in Super-Admin portal
    const saThemeBtn = page
      .locator('button[aria-label*="dark"], button[aria-label*="light"]')
      .first();
    await saThemeBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Check translated Super-Admin subpages
    await page.goto('/superadmin/restaurants');
    await expect(page.getByRole('heading', { name: 'Client Restaurants' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Establishment' })).toBeVisible();

    await page.goto('/superadmin/settings');
    await expect(
      page.getByText('Public Contact Details & Regional Settings'),
    ).toBeVisible();
  });
});
