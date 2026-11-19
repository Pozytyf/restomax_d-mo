import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../components/BrandLogo';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useAuth } from '../app/providers/AuthProvider';
import { useToast } from '../components/Toast';

export function RegisterPage() {
  const { t } = useTranslation();
  const { registerRestaurant } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPlan = searchParams.get('plan') || 'ESSENTIEL';

  const [form, setForm] = useState({
    restaurantName: '',
    city: 'Abidjan',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    planCode: initialPlan,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await registerRestaurant(form);
      notify(t('auth.createSuccessToast'), 'success');
      navigate('/app');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t('auth.createErrorToast'),
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#64748B] hover:text-[#182333]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('auth.backToSite')}</span>
          </Link>
          <LanguageSwitcher variant="light" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <BrandLogo theme="light" />
          <h1 className="mt-4 text-2xl font-extrabold text-[#182333]">
            {t('auth.registerTitle')}
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            {t('auth.registerSubtitle')}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#182333] mb-1">
                  {t('auth.restaurantNameLabel')}
                </label>
                <input
                  required
                  type="text"
                  value={form.restaurantName}
                  onChange={(e) =>
                    setForm({ ...form, restaurantName: e.target.value })
                  }
                  placeholder={t('auth.restaurantNamePlaceholder')}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#182333] mb-1">
                  {t('auth.cityLabel')}
                </label>
                <input
                  required
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#182333] mb-1">
                {t('auth.ownerNameLabel')}
              </label>
              <input
                required
                type="text"
                value={form.ownerName}
                onChange={(e) =>
                  setForm({ ...form, ownerName: e.target.value })
                }
                placeholder={t('auth.ownerNamePlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#182333] mb-1">
                  {t('auth.proEmailLabel')}
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#182333] mb-1">
                  {t('auth.phoneLabel')}
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+225 07…"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#182333] mb-1">
                  {t('auth.planLabel')}
                </label>
                <select
                  value={form.planCode}
                  onChange={(e) =>
                    setForm({ ...form, planCode: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                >
                  <option value="ESSENTIEL">{t('auth.plans.ESSENTIEL')}</option>
                  <option value="PROFESSIONNEL">
                    {t('auth.plans.PROFESSIONNEL')}
                  </option>
                  <option value="PREMIUM">{t('auth.plans.PREMIUM')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#182333] mb-1">
                  {t('auth.passwordMinLabel')}
                </label>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white font-semibold text-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {submitting
                ? t('auth.creatingSpace')
                : t('auth.createMyRestaurant')}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#64748B]">
            {t('auth.alreadyRegistered')}{' '}
            <Link
              to="/connexion"
              className="font-semibold text-[#FF8738] hover:underline"
            >
              {t('auth.submitLogin')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
