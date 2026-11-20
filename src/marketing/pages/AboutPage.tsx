import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../components/MarketingLayout';

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <MarketingLayout>
      <section className="bg-white border-b border-slate-200 py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-[#FF8738]">
            {t('marketingPages.about.eyebrow')}
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#182333] tracking-tight">
            {t('marketingPages.about.title')}
          </h1>
          <p className="mt-4 text-base text-[#64748B] leading-relaxed">
            {t('marketingPages.about.intro')}
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-7 space-y-4">
            <h2 className="text-xl font-bold text-[#182333]">
              {t('marketingPages.about.visionTitle')}
            </h2>
            <p className="text-sm text-[#64748B] leading-relaxed">
              {t('marketingPages.about.visionBody')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-[#182333]">
                {t('marketingPages.about.card1Title')}
              </h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                {t('marketingPages.about.card1Body')}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-[#182333]">
                {t('marketingPages.about.card2Title')}
              </h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                {t('marketingPages.about.card2Body')}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-[#182333]">
                {t('marketingPages.about.card3Title')}
              </h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                {t('marketingPages.about.card3Body')}
              </p>
            </div>
          </div>

          <div className="text-center pt-4">
            <Link
              to="/inscription"
              className="inline-flex px-6 py-3 rounded-lg bg-[#FF8738] text-white text-sm font-semibold hover:bg-[#F07322] transition-colors"
            >
              {t('marketingPages.about.cta')}
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
