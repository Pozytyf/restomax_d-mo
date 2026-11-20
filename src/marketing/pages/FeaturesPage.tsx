import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  CalendarClock,
  ChefHat,
  ClipboardList,
  CreditCard,
  LayoutGrid,
  Package,
  QrCode,
  ShieldCheck,
  UserCheck,
  Utensils,
} from 'lucide-react';
import { MarketingLayout } from '../components/MarketingLayout';

const MODULE_ICONS = [
  ClipboardList,
  CreditCard,
  LayoutGrid,
  QrCode,
  ChefHat,
  Package,
  ShieldCheck,
  UserCheck,
  CalendarClock,
  BarChart3,
  Utensils,
];

export function FeaturesPage() {
  const { t } = useTranslation();
  const modules = t('marketingPages.features.modules', {
    returnObjects: true,
  }) as Array<{ title: string; desc: string }>;

  return (
    <MarketingLayout>
      <section className="bg-white border-b border-slate-200 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-[#FF8738]">
            {t('marketingPages.features.eyebrow')}
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#182333] tracking-tight max-w-3xl">
            {t('marketingPages.features.title')}
          </h1>
          <p className="mt-4 text-[#64748B] max-w-2xl text-base leading-relaxed">
            {t('marketingPages.features.subtitle')}
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Array.isArray(modules) ? modules : []).map((mod, idx) => {
            const Icon = MODULE_ICONS[idx % MODULE_ICONS.length];
            return (
              <div
                key={mod.title}
                className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#182333] text-[#FF8738] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-[#182333]">
                    {mod.title}
                  </h2>
                  <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 text-center">
          <Link
            to="/inscription"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white font-semibold text-sm transition-colors"
          >
            {t('marketingPages.features.cta')}
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
