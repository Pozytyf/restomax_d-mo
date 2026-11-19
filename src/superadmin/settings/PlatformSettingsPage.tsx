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
      notify(
        'Paramètres globaux enregistrés et répercutés sur la page Contact.',
        'success',
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  return (
    <SuperAdminLayout title={t('superadmin.settingsTitle')}>
      <form
        onSubmit={handleSave}
        className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl space-y-4"
      >
        <h2 className="text-base font-bold text-[#182333]">
          Coordonnées publiques et configuration régionale
        </h2>
        <p className="text-xs text-[#64748B]">
          Ces paramètres alimentent directement le site vitrine public Resto’MAX.
        </p>

        <div>
          <label className="block text-xs font-semibold mb-1">
            Email commercial public
          </label>
          <input
            type="email"
            value={settings.contact_email || ''}
            onChange={(e) =>
              setSettings({ ...settings, contact_email: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            Téléphone commercial configurable
          </label>
          <input
            type="text"
            value={settings.contact_phone || ''}
            onChange={(e) =>
              setSettings({ ...settings, contact_phone: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            Zone commerciale affichée
          </label>
          <input
            type="text"
            value={settings.commercial_region || ''}
            onChange={(e) =>
              setSettings({ ...settings, commercial_region: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            Durée d’essai par défaut (jours)
          </label>
          <input
            type="number"
            value={settings.default_trial_days || '14'}
            onChange={(e) =>
              setSettings({ ...settings, default_trial_days: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
          />
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
        >
          Enregistrer la configuration
        </button>
      </form>
    </SuperAdminLayout>
  );
}
