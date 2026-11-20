import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { MarketingLayout } from '../components/MarketingLayout';

export function FaqPage() {
  const { t } = useTranslation();
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const items = t('marketingPages.faq.items', {
    returnObjects: true,
  }) as Array<{ q: string; a: string }>;

  return (
    <MarketingLayout>
      <section className="bg-white border-b border-slate-200 py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-[#FF8738]">
            {t('marketingPages.faq.eyebrow')}
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#182333] tracking-tight">
            {t('marketingPages.faq.title')}
          </h1>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          {(Array.isArray(items) ? items : []).map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={item.q}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left font-semibold text-[#182333] text-sm sm:text-base cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-[#64748B] transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-[#64748B] leading-relaxed border-t border-slate-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </MarketingLayout>
  );
}
