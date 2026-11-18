import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../app/providers/AuthProvider';
import { useToast } from '../components/Toast';

export function RegisterPage() {
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
      notify(
        'Votre établissement a été créé avec ses 4 premières tables et QR codes.',
        'success',
      );
      navigate('/app');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Erreur lors de la création.',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#64748B] hover:text-[#182333] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au site vitrine</span>
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <BrandLogo theme="light" />
          <h1 className="mt-4 text-2xl font-extrabold text-[#182333]">
            Créer votre espace restaurant
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Démarrez votre essai gratuit avec un espace multi-tenant isolé en FCFA.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#182333] mb-1">
                  Nom du restaurant *
                </label>
                <input
                  required
                  type="text"
                  value={form.restaurantName}
                  onChange={(e) =>
                    setForm({ ...form, restaurantName: e.target.value })
                  }
                  placeholder="Ex : Maquis Ébène"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#182333] mb-1">
                  Ville *
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
                Nom du propriétaire / gérant *
              </label>
              <input
                required
                type="text"
                value={form.ownerName}
                onChange={(e) =>
                  setForm({ ...form, ownerName: e.target.value })
                }
                placeholder="Ex : Kouadio Ange"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#182333] mb-1">
                  Email professionnel *
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
                  Téléphone
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
                  Offre choisie (essai)
                </label>
                <select
                  value={form.planCode}
                  onChange={(e) =>
                    setForm({ ...form, planCode: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                >
                  <option value="ESSENTIEL">Essentiel</option>
                  <option value="PROFESSIONNEL">Professionnel</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#182333] mb-1">
                  Mot de passe (min. 8 car.) *
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
                ? 'Création de votre espace…'
                : 'Créer mon restaurant'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#64748B]">
            Déjà inscrit ?{' '}
            <Link
              to="/connexion"
              className="font-semibold text-[#FF8738] hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
