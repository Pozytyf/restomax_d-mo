import React from 'react';
import { ArrowDown, ArrowUp, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DashboardWidgetId } from './types';

interface WidgetFrameProps {
  id: DashboardWidgetId;
  title: string;
  colSpanClass: string;
  editMode: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onHide: () => void;
  children: React.ReactNode;
}

export function WidgetFrame({
  id,
  title,
  colSpanClass,
  editMode,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onHide,
  children,
}: WidgetFrameProps) {
  const { t } = useTranslation();

  return (
    <div
      data-testid={`widget-frame-${id}`}
      className={`col-span-1 ${colSpanClass} flex flex-col ${
        editMode
          ? 'rounded-xl ring-1 ring-[#FF8738]/50 bg-[var(--rm-surface-muted)] p-2 gap-2'
          : ''
      }`}
    >
      {editMode && (
        <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs">
          <span className="font-semibold text-[var(--rm-ink)] truncate">
            {title}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              aria-label={t('dashboard.moveUp')}
              title={t('dashboard.moveUp')}
              className="p-1.5 rounded-md border border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-ink)] hover:border-[#FF8738] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              aria-label={t('dashboard.moveDown')}
              title={t('dashboard.moveDown')}
              className="p-1.5 rounded-md border border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-ink)] hover:border-[#FF8738] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onHide}
              aria-label={t('dashboard.hideWidget')}
              title={t('dashboard.hideWidget')}
              className="p-1.5 rounded-md border border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-ink-muted)] hover:text-[#E05252] hover:border-[#E05252] cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
