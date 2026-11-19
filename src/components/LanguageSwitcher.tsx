import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from '../i18n';

interface LanguageSwitcherProps {
  variant?: 'app' | 'light' | 'dark';
}

export function LanguageSwitcher({ variant = 'app' }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const current: SupportedLanguage = i18n.language?.startsWith('en')
    ? 'en'
    : 'fr';

  const switchTo = (lang: SupportedLanguage) => {
    if (lang !== current) {
      void i18n.changeLanguage(lang);
    }
  };

  const containerCls =
    variant === 'app'
      ? 'inline-flex items-center gap-1 p-1 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface-muted)]'
      : variant === 'dark'
        ? 'inline-flex items-center gap-1 p-1 rounded-lg border border-white/15 bg-white/10'
        : 'inline-flex items-center gap-1 p-1 rounded-lg border border-slate-200 bg-slate-50';

  const iconCls =
    variant === 'app'
      ? 'w-3.5 h-3.5 text-[var(--rm-ink-muted)] ml-1 mr-0.5 shrink-0'
      : variant === 'dark'
        ? 'w-3.5 h-3.5 text-slate-300 ml-1 mr-0.5 shrink-0'
        : 'w-3.5 h-3.5 text-[#64748B] ml-1 mr-0.5 shrink-0';

  const getBtnCls = (active: boolean) => {
    if (active) {
      return 'px-2 py-1 rounded-md text-[11px] font-bold bg-[#FF8738] text-white transition-colors cursor-pointer whitespace-nowrap';
    }
    if (variant === 'app') {
      return 'px-2 py-1 rounded-md text-[11px] font-semibold text-[var(--rm-ink-muted)] hover:text-[var(--rm-ink)] transition-colors cursor-pointer whitespace-nowrap';
    }
    if (variant === 'dark') {
      return 'px-2 py-1 rounded-md text-[11px] font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap';
    }
    return 'px-2 py-1 rounded-md text-[11px] font-semibold text-[#64748B] hover:text-[#182333] transition-colors cursor-pointer whitespace-nowrap';
  };

  return (
    <div
      role="group"
      aria-label={t('header.languageLabel')}
      data-testid="language-switcher"
      className={containerCls}
    >
      <Globe className={iconCls} aria-hidden="true" />
      <button
        type="button"
        onClick={() => switchTo('fr')}
        aria-pressed={current === 'fr'}
        aria-label={t('header.french')}
        data-testid="lang-btn-fr"
        className={getBtnCls(current === 'fr')}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => switchTo('en')}
        aria-pressed={current === 'en'}
        aria-label={t('header.english')}
        data-testid="lang-btn-en"
        className={getBtnCls(current === 'en')}
      >
        EN
      </button>
    </div>
  );
}
