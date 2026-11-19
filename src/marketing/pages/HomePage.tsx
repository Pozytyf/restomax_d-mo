import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  ChefHat,
  CreditCard,
  Package,
  QrCode,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MarketingLayout } from '../components/MarketingLayout';
import { ResilientImage } from '../../components/ResilientImage';
import { formatFcfa } from '../../utils/format';

export function HomePage() {
  const { t } = useTranslation();
  const [previewTab, setPreviewTab] = useState<'owner' | 'superadmin'>('owner');

  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-semibold text-[#FF8738] tracking-wide mb-3">
                {t('marketing.heroBadge')}
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#182333] tracking-tight leading-[1.12] text-balance">
                {t('marketing.heroTitle')}
              </h1>
              <p className="mt-5 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-xl">
                {t('marketing.heroSubtitle')}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/inscription"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white font-semibold text-sm transition-colors whitespace-nowrap"
                >
                  <span>{t('marketing.startTrial')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/demonstration"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[#182333] font-semibold text-sm transition-colors whitespace-nowrap"
                >
                  <span>{t('marketing.seeDemo')}</span>
                </Link>
              </div>

              <p className="mt-5 text-xs text-[#64748B]">
                {t('marketing.heroFoot')}
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[300px] rounded-2xl overflow-hidden border border-slate-200 bg-[#182333]">
                <ResilientImage
                  src="/src/assets/images/hero_restomax_dining_1795030466131.jpg"
                  alt={t('marketing.heroImgAlt')}
                  className="w-full h-full object-cover"
                  fallbackTitle={t('marketing.heroImgFallback')}
                />
              </div>
            </div>
          </div>

          {/* 4-column structural proof strip */}
          <div className="mt-12 pt-10 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-2xl font-bold text-[#182333] tabular-nums">
                {t('marketing.proof1Title')}
              </p>
              <p className="text-sm text-[#64748B] mt-1">
                {t('marketing.proof1Desc')}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#182333] tabular-nums">
                {t('marketing.proof2Title')}
              </p>
              <p className="text-sm text-[#64748B] mt-1">
                {t('marketing.proof2Desc')}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#182333] tabular-nums">
                {t('marketing.proof3Title')}
              </p>
              <p className="text-sm text-[#64748B] mt-1">
                {t('marketing.proof3Desc')}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#182333] tabular-nums">
                {t('marketing.proof4Title')}
              </p>
              <p className="text-sm text-[#64748B] mt-1">
                {t('marketing.proof4Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Modules Asymmetric Bento */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#182333] tracking-tight">
              {t('marketing.modulesTitle')}
            </h2>
            <p className="mt-3 text-[#64748B] text-base">
              {t('marketing.modulesSubtitle')}
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-7 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[#182333] text-[#FF8738] flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-[#182333]">
                  {t('marketing.mod1Title')}
                </h3>
                <p className="mt-2 text-sm text-[#64748B] leading-relaxed max-w-xl">
                  {t('marketing.mod1Desc')}
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap gap-6 text-xs text-[#64748B]">
                <span>{t('marketing.mod1Tag1')}</span>
                <span aria-hidden="true">·</span>
                <span>{t('marketing.mod1Tag2')}</span>
                <span aria-hidden="true">·</span>
                <span>{t('marketing.mod1Tag3')}</span>
              </div>
            </div>

            <div className="bg-[#182333] text-white rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-white/10 text-[#FF8738] flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="mt-5 text-xl font-bold">
                  {t('marketing.mod2Title')}
                </h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  {t('marketing.mod2Desc')}
                </p>
              </div>
              <div className="mt-6">
                <Link
                  to="/q/sillage-table-01-v1"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF8738] hover:underline"
                >
                  <span>{t('marketing.mod2Cta')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <div className="w-10 h-10 rounded-lg bg-[#F5F7FA] text-[#182333] flex items-center justify-center">
                <ChefHat className="w-5 h-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#182333]">
                {t('marketing.mod3Title')}
              </h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                {t('marketing.mod3Desc')}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <div className="w-10 h-10 rounded-lg bg-[#F5F7FA] text-[#182333] flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#182333]">
                {t('marketing.mod4Title')}
              </h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                {t('marketing.mod4Desc')}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <div className="w-10 h-10 rounded-lg bg-[#F5F7FA] text-[#182333] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#182333]">
                {t('marketing.mod5Title')}
              </h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                {t('marketing.mod5Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Dashboard Preview Switcher */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#182333] tracking-tight">
                {t('marketing.previewTitle')}
              </h2>
              <p className="mt-2 text-[#64748B] text-base max-w-2xl">
                {t('marketing.previewSubtitle')}
              </p>
            </div>

            <div className="inline-flex p-1 rounded-lg bg-[#F5F7FA] border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewTab('owner')}
                className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  previewTab === 'owner'
                    ? 'bg-[#182333] text-white'
                    : 'text-[#64748B] hover:text-[#182333]'
                }`}
              >
                {t('marketing.previewOwnerTab')}
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('superadmin')}
                className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  previewTab === 'superadmin'
                    ? 'bg-[#182333] text-white'
                    : 'text-[#64748B] hover:text-[#182333]'
                }`}
              >
                {t('marketing.previewSaTab')}
              </button>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 overflow-hidden bg-[#F5F7FA]">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-3 bg-[#182333] text-white p-6">
                <p className="text-xs font-semibold text-[#FF8738]">
                  {previewTab === 'owner'
                    ? t('marketing.previewOwnerSpace')
                    : t('marketing.previewSaSpace')}
                </p>
                <p className="mt-1 text-base font-bold">
                  {previewTab === 'owner'
                    ? t('marketing.previewDemoVenue')
                    : t('marketing.previewSaAdmin')}
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-300">
                  {previewTab === 'owner' ? (
                    <>
                      <li className="px-3 py-2 rounded-md bg-[#FF8738] text-white font-semibold">
                        {t('nav.dashboard')}
                      </li>
                      <li className="px-3 py-2 rounded-md">{t('nav.pos')}</li>
                      <li className="px-3 py-2 rounded-md">{t('nav.floor')}</li>
                      <li className="px-3 py-2 rounded-md">{t('nav.kitchen')}</li>
                      <li className="px-3 py-2 rounded-md">{t('nav.stocks')}</li>
                      <li className="px-3 py-2 rounded-md">{t('nav.qr')}</li>
                    </>
                  ) : (
                    <>
                      <li className="px-3 py-2 rounded-md bg-[#FF8738] text-white font-semibold">
                        {t('nav.saOverview')}
                      </li>
                      <li className="px-3 py-2 rounded-md">
                        {t('nav.saRestaurants')}
                      </li>
                      <li className="px-3 py-2 rounded-md">
                        {t('nav.saSubscriptions')}
                      </li>
                      <li className="px-3 py-2 rounded-md">
                        {t('nav.saBilling')}
                      </li>
                      <li className="px-3 py-2 rounded-md">
                        {t('nav.saAudit')}
                      </li>
                    </>
                  )}
                </ul>
              </div>

              <div className="lg:col-span-9 p-6 sm:p-8">
                {previewTab === 'owner' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">
                          {t('marketing.previewOwnerRev')}
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#182333] tabular-nums">
                          {formatFcfa(318000)}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">
                          {t('marketing.previewOwnerActiveOrders')}
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#FF8738] tabular-nums">
                          {t('marketing.previewOwnerActiveCount')}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">
                          {t('marketing.previewOwnerBasket')}
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#182333] tabular-nums">
                          {formatFcfa(35333)}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">
                          {t('marketing.previewOwnerStockAlerts')}
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#E05252] tabular-nums">
                          {t('marketing.previewOwnerStockCount')}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-[#182333] text-sm">
                          {t('marketing.previewOwnerCtaTitle')}
                        </h4>
                        <p className="text-xs text-[#64748B] mt-1">
                          {t('marketing.previewOwnerCtaDesc')}
                        </p>
                      </div>
                      <Link
                        to="/connexion"
                        className="px-4 py-2 rounded-lg bg-[#FF8738] text-white text-xs font-semibold whitespace-nowrap"
                      >
                        {t('marketing.previewOwnerCtaBtn')}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">
                          {t('marketing.previewSaActiveRestos')}
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#14B8A6] tabular-nums">
                          {t('marketing.previewSaActiveRestosVal')}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">
                          {t('marketing.previewSaRevenue')}
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#182333] tabular-nums">
                          {formatFcfa(110000)}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">
                          {t('marketing.previewSaPendingPay')}
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#E5A32A] tabular-nums">
                          {formatFcfa(55000)}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">
                          {t('marketing.previewSaTickets')}
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#182333] tabular-nums">
                          {t('marketing.previewSaTicketsVal')}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-[#182333] text-sm">
                          {t('marketing.previewSaCtaTitle')}
                        </h4>
                        <p className="text-xs text-[#64748B] mt-1">
                          {t('marketing.previewSaCtaDesc')}
                        </p>
                      </div>
                      <Link
                        to="/connexion"
                        className="px-4 py-2 rounded-lg bg-[#182333] text-white text-xs font-semibold whitespace-nowrap"
                      >
                        {t('marketing.previewSaCtaBtn')}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POS & QR Experience Split */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-slate-200 bg-white">
            <ResilientImage
              src="/src/assets/images/showcase_pos_counter_1795030467222.jpg"
              alt="Resto’MAX POS"
              className="w-full h-80 sm:h-96 object-cover"
              fallbackTitle="POS Resto’MAX"
            />
          </div>
          <div className="lg:col-span-6 space-y-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#182333] tracking-tight">
              {t('marketing.splitTitle')}
            </h2>
            <p className="text-[#64748B] leading-relaxed">
              {t('marketing.splitDesc')}
            </p>
            <ul className="space-y-3 text-sm text-[#182333]">
              <li className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#14B8A6] shrink-0 mt-0.5" />
                <span>{t('marketing.splitBullet1')}</span>
              </li>
              <li className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-[#FF8738] shrink-0 mt-0.5" />
                <span>{t('marketing.splitBullet2')}</span>
              </li>
            </ul>
            <div className="pt-2">
              <Link
                to="/fonctionnalites"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF8738] hover:underline"
              >
                <span>{t('marketing.exploreFeatures')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Testimonials */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#182333]">
                {t('marketing.testimonialsTitle')}
              </h2>
              <p className="text-xs text-[#64748B] mt-1">
                {t('marketing.testimonialsSubtitle')}
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote:
                  'Avant Resto’MAX, les bons papier se perdaient aux heures de pointe. Désormais nos cuisiniers voient chaque plat en direct avec le temps d’attente.',
                name: 'Awa Touré (Profil démo)',
                role: 'Gérante · Le Sillage Lagune, Abidjan',
              },
              {
                quote:
                  'La séparation entre les droits du serveur, du caissier et du manager nous donne une visibilité nette sur chaque encaissement Wave et espèces.',
                name: 'Jean-Marc Kouassi (Profil démo)',
                role: 'Directeur de salle · Brasserie fictive Plateau',
              },
              {
                quote:
                  'Les clients scannent le QR sur la terrasse sans attendre qu’un serveur se libère pour commander une boisson supplémentaire.',
                name: 'Fatoumata Coulibaly (Profil démo)',
                role: 'Fondatrice · La Terrasse du Plateau (Démo)',
              },
            ].map((item) => (
              <div
                key={item.name}
                className="p-6 rounded-xl border border-slate-200 bg-[#F5F7FA] flex flex-col justify-between"
              >
                <p className="text-sm text-[#182333] leading-relaxed">
                  « {item.quote} »
                </p>
                <div className="mt-5 pt-4 border-t border-slate-200">
                  <p className="text-sm font-semibold text-[#182333]">
                    {item.name}
                  </p>
                  <p className="text-xs text-[#64748B] mt-0.5">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-[#182333] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('marketing.ctaTitle')}
          </h2>
          <p className="mt-3 text-slate-300 text-base">
            {t('marketing.ctaSubtitle')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/inscription"
              className="px-6 py-3 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white font-semibold text-sm transition-colors"
            >
              {t('marketing.ctaCreate')}
            </Link>
            <Link
              to="/contact"
              className="px-6 py-3 rounded-lg border border-white/25 hover:bg-white/10 text-white font-semibold text-sm transition-colors"
            >
              {t('marketing.ctaContact')}
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
