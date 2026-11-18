import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../app/providers/AuthProvider';
import { useToast } from '../components/Toast';

const DEMO_ACCOUNTS = [
  { label: 'Propriétaire (Le Sillage)', email: 'proprietaire@lesillage.ci' },
  { label: 'Caissier (Le Sillage)', email: 'caisse@lesillage.ci' },
  { label: 'Serveur (Le Sillage)', email: 'serveur@lesillage.ci' },
  { label: 'Cuisine / Bar (Le Sillage)', email: 'cuisine@lesillage.ci' },
  { label: 'Super-admin Plateforme', email: 'superadmin@restomax.ci' },
];

export function LoginPage() {
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
      notify(`Bienvenue, ${user.fullName}`, 'success');
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
        err instanceof Error ? err.message : 'Échec de connexion.',
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
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#64748B] hover:text-[#182333] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au site vitrine</span>
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="mb-6">
            <BrandLogo theme="light" />
            <h1 className="mt-4 text-2xl font-extrabold text-[#182333]">
              Connexion à votre espace
            </h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Accédez à votre restaurant ou au portail Super-admin.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#182333] mb-1">
                Adresse email
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
                Mot de passe
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
              {submitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-7 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#182333] mb-3">
              <KeyRound className="w-3.5 h-3.5 text-[#FF8738]" />
              <span>Accès rapide environnement de démonstration</span>
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
                    {acc.label}
                  </span>
                  <span className="text-[#64748B] font-mono">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[#64748B]">
            Pas encore de compte ?{' '}
            <Link
              to="/inscription"
              className="font-semibold text-[#FF8738] hover:underline"
            >
              Créer mon restaurant
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
