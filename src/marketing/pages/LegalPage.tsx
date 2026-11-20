import { useTranslation } from 'react-i18next';
import { MarketingLayout } from '../components/MarketingLayout';

type LegalDocKey = 'mentions' | 'confidentialite' | 'cgu' | 'cgv' | 'cookies';

export function LegalPage({ doc }: { doc: LegalDocKey }) {
  const { t } = useTranslation();
  const base = `marketingPages.legal.docs.${doc}`;
  const sections = [
    { heading: t(`${base}.s1h`), body: t(`${base}.s1b`) },
    { heading: t(`${base}.s2h`), body: t(`${base}.s2b`) },
  ];

  return (
    <MarketingLayout>
      <section className="bg-white border-b border-slate-200 py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-[#FF8738]">
            {t('marketingPages.legal.eyebrow')}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#182333] tracking-tight">
            {t(`${base}.title`)}
          </h1>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            {t('marketingPages.legal.disclaimer')}
          </div>
          {sections.map((s) => (
            <div
              key={s.heading}
              className="bg-white rounded-xl border border-slate-200 p-6 space-y-2"
            >
              <h2 className="text-base font-bold text-[#182333]">{s.heading}</h2>
              <p className="text-sm text-[#64748B] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}
