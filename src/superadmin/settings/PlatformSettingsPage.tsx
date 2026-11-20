import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SuperAdminLayout } from '../SuperAdminLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';

export function PlatformSettingsPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    apiFetch<{ settings: Record<string, string> }>('/api/superadmin/settings')
      .then((res) => setSettings(res.settings))
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/superadmin/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      notify(t('superadminPages.settings.savedToast'), 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    }
  };

  return (
    <SuperAdminLayout title={t('superadmin.settingsTitle')}>
      <form
        onSubmit={handleSave}
        className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6 max-w-2xl space-y-4"
      >
        <h2 className="text-base font-bold text-[var(--rm-ink)]">
          {t('superadminPages.settings.title')}
        </h2>
        <p className="text-xs text-[var(--rm-ink-muted)]">
          {t('superadminPages.settings.subtitle')}
        </p>

        <div>
          <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
            {t('superadminPages.settings.contactEmailLabel')}
          </label>
          <input
            type="email"
            value={settings.contact_email || ''}
            onChange={(e) =>
              setSettings({ ...settings, contact_email: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
            {t('superadminPages.settings.contactPhoneLabel')}
          </label>
          <input
            type="text"
            value={settings.contact_phone || ''}
            onChange={(e) =>
              setSettings({ ...settings, contact_phone: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
            {t('superadminPages.settings.regionLabel')}
          </label>
          <input
            type="text"
            value={settings.commercial_region || ''}
            onChange={(e) =>
              setSettings({ ...settings, commercial_region: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
            {t('superadminPages.settings.trialDaysLabel')}
          </label>
          <input
            type="number"
            value={settings.default_trial_days || '14'}
            onChange={(e) =>
              setSettings({ ...settings, default_trial_days: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm tabular-nums"
          />
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
        >
          {t('superadminPages.settings.saveBtn')}
        </button>
      </form>
    </SuperAdminLayout>
  );
}
