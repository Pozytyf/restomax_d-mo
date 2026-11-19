import test from 'node:test';
import assert from 'node:assert/strict';
import i18n, { getActiveIntlLocale } from '../i18n/index.ts';
import { fr } from '../i18n/locales/fr.ts';
import { en } from '../i18n/locales/en.ts';
import {
  getDeliveryStatusLabel,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getRoleLabel,
} from '../utils/format.ts';

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v as Record<string, unknown>, next));
    } else {
      keys.push(next);
    }
  }
  return keys.sort();
}

test('fr and en locales have identical translation key trees', () => {
  const frKeys = collectKeys(fr as unknown as Record<string, unknown>);
  const enKeys = collectKeys(en as unknown as Record<string, unknown>);
  assert.deepEqual(enKeys, frKeys);
  assert.ok(frKeys.length > 200, 'Expected rich translation dictionaries');
});

test('switching i18n language updates localized labels and Intl locale', async () => {
  await i18n.changeLanguage('fr');
  assert.equal(getActiveIntlLocale(), 'fr-FR');
  assert.equal(getRoleLabel('OWNER'), 'Propriétaire');
  assert.equal(getOrderStatusLabel('IN_PREPARATION'), 'En préparation');
  assert.equal(getDeliveryStatusLabel('READY'), 'En cours de livraison');
  assert.equal(getPaymentMethodLabel('CASH'), 'Espèces');

  await i18n.changeLanguage('en');
  assert.equal(getActiveIntlLocale(), 'en-GB');
  assert.equal(getRoleLabel('OWNER'), 'Owner');
  assert.equal(getOrderStatusLabel('IN_PREPARATION'), 'Preparing');
  assert.equal(getDeliveryStatusLabel('READY'), 'Out for table delivery');
  assert.equal(getPaymentMethodLabel('CASH'), 'Cash');

  await i18n.changeLanguage('fr');
});
