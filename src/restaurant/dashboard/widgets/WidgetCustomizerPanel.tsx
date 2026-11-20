import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WIDGET_DEFINITION_MAP } from './widgetRegistry';
import type { DashboardWidgetId, DashboardWidgetPreference } from './types';

interface WidgetCustomizerPanelProps {
  preferences: DashboardWidgetPreference[];
  canReadFinance: boolean;
  onToggleVisibility: (id: DashboardWidgetId) => void;
  onReset: () => void;
  onClose: () => void;
}

export function WidgetCustomizerPanel({
  preferences,
  canReadFinance,
  onToggleVisibility,
  onReset,
  onClose,
}: WidgetCustomizerPanelProps) {
  const { t } = useTranslation();

  const configurable = preferences.filter((pref) => {
    const def = WIDGET_DEFINITION_MAP[pref.id];
    if (!def) return false;
    if (def.requiresFinance && !canReadFinance) return false;
    return true;
  });

  return (
    <section
      data-testid="dashboard-widget-customizer"
      className="bg-[var(--rm-surface)] rounded-xl border border-[#FF8738]/50 p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--rm-border-subtle)]">
        <div className="flex items-start gap-2.5">
          <SlidersHorizontal className="w-4 h-4 text-[#FF8738] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-[var(--rm-ink)]">
              {t('dashboard.widgetConfigTitle')}
            </h2>
            <p className="text-xs text-[var(--rm-ink-muted)]">
              {t('dashboard.widgetConfigSubtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--rm-border)] text-xs font-semibold text-[var(--rm-ink)] hover:border-[#FF8738] cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('dashboard.resetWidgets')}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#182333] dark:bg-[#FF8738] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            {t('dashboard.doneCustomizing')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {configurable.map((pref) => {
          const def = WIDGET_DEFINITION_MAP[pref.id];
          return (
            <label
              key={pref.id}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                pref.visible
                  ? 'border-[#FF8738]/60 bg-[#FF8738]/8 text-[var(--rm-ink)]'
                  : 'border-[var(--rm-border)] bg-[var(--rm-surface-muted)] text-[var(--rm-ink-muted)]'
              }`}
            >
              <input
                type="checkbox"
                checked={pref.visible}
                onChange={() => onToggleVisibility(pref.id)}
                data-testid={`widget-toggle-${pref.id}`}
                className="accent-[#FF8738] rounded cursor-pointer"
              />
              <span className="truncate">{t(def.titleKey)}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
