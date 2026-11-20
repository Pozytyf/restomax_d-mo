import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, QrCode, Monitor, ChefHat } from 'lucide-react';
import { MarketingLayout } from '../components/MarketingLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';

const STEP_META = [
  { icon: QrCode, actionTo: '/q/sillage-table-01-v1' },
  { icon: ChefHat, actionTo: '/connexion' },
  { icon: Monitor, actionTo: '/connexion' },
];

export function DemoPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    restaurantName: '',
    city: 'Abidjan',
    message: '',
    website: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const translatedSteps = t('marketingPages.demo.steps', {
    returnObjects: true,
  }) as Array<{ title: string; desc: string; actionLabel: string }>;
  const steps = (Array.isArray(translatedSteps) ? translatedSteps : []).map(
    (s, idx) => ({
      ...s,
      icon: STEP_META[idx % STEP_META.length].icon,
      actionTo: STEP_META[idx % STEP_META.length].actionTo,
    }),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/public/demo-requests', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSubmitted(true);
      notify(t('marketingPages.demo.submittedToast'), 'success');
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : t('marketingPages.demo.submitErrorToast'),
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MarketingLayout>
      <section className="bg-white border-b border-slate-200 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-[#FF8738]">
            {t('marketingPages.demo.eyebrow')}
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#182333] tracking-tight">
            {t('marketingPages.demo.title')}
          </h1>
          <p className="mt-3 text-[#64748B] max-w-2xl">
            {t('marketingPages.demo.subtitle')}
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap gap-2">
              {steps.map((s, idx) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setStep(idx)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    step === idx
                      ? 'bg-[#182333] text-white'
                      : 'bg-white border border-slate-200 text-[#64748B] hover:text-[#182333]'
                  }`}
                >
                  {t('marketingPages.demo.stepBtn', { num: idx + 1 })}
                </button>
              ))}
            </div>

            {steps[step] && (() => {
              const current = steps[step];
              const Icon = current.icon;
              return (
                <div className="bg-white rounded-2xl border border-slate-200 p-7 space-y-5">
                  <div className="w-11 h-11 rounded-xl bg-[#182333] text-[#FF8738] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#182333]">
                    {current.title}
                  </h2>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    {current.desc}
                  </p>
                  <div className="pt-2">
                    <Link
                      to={current.actionTo}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-sm font-semibold transition-colors"
                    >
                      <span>{current.actionLabel}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })()}

            <div className="bg-[#182333] text-white rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base">
                  {t('marketingPages.demo.quickAccessTitle')}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {t('marketingPages.demo.quickAccessDesc')}
                </p>
              </div>
              <Link
                to="/connexion"
                className="px-4 py-2.5 rounded-lg bg-[#FF8738] text-white text-xs font-semibold whitespace-nowrap"
              >
                {t('marketingPages.demo.goToLoginBtn')}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <h2 className="text-lg font-bold text-[#182333]">
                {t('marketingPages.demo.formTitle')}
              </h2>
              <p className="text-xs text-[#64748B] mt-1">
                {t('marketingPages.demo.formSubtitle')}
              </p>

              {submitted ? (
                <div className="mt-6 p-5 rounded-xl bg-[#F5F7FA] border border-slate-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#14B8A6] mx-auto" />
                  <p className="font-semibold text-[#182333] text-sm">
                    {t('marketingPages.demo.submittedTitle')}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {t('marketingPages.demo.submittedDesc')}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <input
                    type="text"
                    name="website"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                  <div>
                    <label className="block text-xs font-semibold text-[#182333] mb-1">
                      {t('marketingPages.demo.fullNameLabel')}
                    </label>
                    <input
                      required
                      type="text"
                      value={form.fullName}
                      onChange={(e) =>
                        setForm({ ...form, fullName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#182333] mb-1">
                      {t('marketingPages.demo.restaurantNameLabel')}
                    </label>
                    <input
                      required
                      type="text"
                      value={form.restaurantName}
                      onChange={(e) =>
                        setForm({ ...form, restaurantName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#182333] mb-1">
                        {t('marketingPages.demo.emailLabel')}
                      </label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#182333] mb-1">
                        {t('marketingPages.demo.phoneLabel')}
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setForm({ ...form, phone: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#182333] mb-1">
                      {t('marketingPages.demo.needsLabel')}
                    </label>
                    <textarea
                      rows={3}
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white font-semibold text-sm transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {submitting
                      ? t('marketingPages.demo.submittingBtn')
                      : t('marketingPages.demo.submitBtn')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
