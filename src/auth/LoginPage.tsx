import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../components/BrandLogo';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useAuth } from '../app/providers/AuthProvider';
import { useToast } from '../components/Toast';

const DEMO_ACCOUNTS = [
  { key: 'owner', email: 'proprietaire@lesillage.ci' },
  { key: 'cashier', email: 'caisse@lesillage.ci' },
  { key: 'waiter', email: 'serveur@lesillage.ci' },
  { key: 'kitchen', email: 'cuisine@lesillage.ci' },
  { key: 'superadmin', email: 'superadmin@restomax.ci' },
] as const;

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const performLogin = async (targetEmail: string, targetPass: string) => {
    setSubmitting(true);
    try {
      const user = await login(targetEmail, targetPass);
      notify(t('auth.welcomeToast', { name: user.fullName }), 'success');
      if (user.role === 'SUPER_ADMIN') {
        navigate('/superadmin');
      } else if (user.role === 'KITCHEN_BAR') {
        navigate('/app/kitchen');
      } else if (user.role === 'CASHIER') {
        navigate('/app/pos');
      } else if (user.role === 'WAITER') {
        navigate('/app/floor');
      } else {
        navigate('/app');
      }
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t('auth.loginFailed'),
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto">
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
          <div className="mb-6">
            <BrandLogo theme="light" />
            <h1 className="mt-4 text-2xl font-extrabold text-[#182333]">
              {t('auth.loginTitle')}
            </h1>
            <p className="mt-1 text-sm text-[#64748B]">
              {t('auth.loginSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#182333] mb-1">
                {t('auth.emailLabel')}
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@restaurant.ci"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#182333] mb-1">
                {t('auth.passwordLabel')}
              </label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white font-semibold text-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {submitting ? t('auth.loggingIn') : t('auth.submitLogin')}
            </button>
          </form>

          <div className="mt-7 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#182333] mb-3">
              <KeyRound className="w-3.5 h-3.5 text-[#FF8738]" />
              <span>{t('auth.quickDemoTitle')}</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword('RestoMax2026!');
                    performLogin(acc.email, 'RestoMax2026!');
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-[#F5F7FA] hover:border-[#FF8738] text-left flex items-center justify-between text-xs transition-colors cursor-pointer"
                >
                  <span className="font-semibold text-[#182333]">
                    {t(`auth.demoAccounts.${acc.key}`)}
                  </span>
                  <span className="text-[#64748B] font-mono">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[#64748B]">
            {t('auth.noAccountYet')}{' '}
            <Link
              to="/inscription"
              className="font-semibold text-[#FF8738] hover:underline"
            >
              {t('auth.createMyRestaurant')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
