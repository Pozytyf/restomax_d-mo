import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Info } from 'lucide-react';
import { MarketingLayout } from '../components/MarketingLayout';
import { apiFetch } from '../../services/api';
import type { Plan } from '../../types';
import { formatFcfa } from '../../utils/format';

export function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycle, setCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ plans: Plan[] }>('/api/public/plans')
      .then((res) => setPlans(res.plans))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MarketingLayout>
      <section className="bg-white border-b border-slate-200 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#182333] tracking-tight">
            Des offres adaptées à la taille de votre établissement
          </h1>
          <p className="mt-3 text-[#64748B] max-w-2xl mx-auto">
            Chaque plan inclut une période d’essai gratuite et un espace multi-tenant isolé en FCFA.
          </p>

          <div className="mt-6 inline-flex items-center p-1 rounded-lg bg-[#F5F7FA] border border-slate-200">
            <button
              type="button"
              onClick={() => setCycle('MONTHLY')}
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                cycle === 'MONTHLY'
                  ? 'bg-[#182333] text-white'
                  : 'text-[#64748B] hover:text-[#182333]'
              }`}
            >
              Facturation mensuelle
            </button>
            <button
              type="button"
              onClick={() => setCycle('YEARLY')}
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                cycle === 'YEARLY'
                  ? 'bg-[#182333] text-white'
                  : 'text-[#64748B] hover:text-[#182333]'
              }`}
            >
              Facturation annuelle
            </button>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-xs text-amber-900">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#E5A32A]" />
            <p>
              <strong>Valeurs de démonstration configurables :</strong> Les montants et limites affichés ci-dessous sont des tarifs de démonstration modifiables en direct depuis le portail Super-admin Resto’MAX.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-96 rounded-2xl bg-white border border-slate-200 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {plans.map((plan) => {
                const price =
                  cycle === 'MONTHLY'
                    ? plan.priceMonthlyXof
                    : plan.priceYearlyXof;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-7 flex flex-col justify-between border ${
                      plan.isFeatured
                        ? 'bg-[#182333] text-white border-[#182333]'
                        : 'bg-white text-[#182333] border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-xl font-bold">{plan.name}</h2>
                        {plan.isFeatured && (
                          <span className="text-xs font-semibold text-[#FF8738]">
                            Recommandé
                          </span>
                        )}
                      </div>
                      <p
                        className={`mt-2 text-sm ${
                          plan.isFeatured ? 'text-slate-300' : 'text-[#64748B]'
                        }`}
                      >
                        {plan.tagline}
                      </p>

                      <div className="mt-6 pb-6 border-b border-current/10">
                        <p className="text-3xl font-extrabold tabular-nums">
                          {formatFcfa(price)}
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            plan.isFeatured ? 'text-slate-400' : 'text-[#64748B]'
                          }`}
                        >
                          {cycle === 'MONTHLY' ? 'par mois' : 'par an'} · Essai {plan.trialDays} jours · Tarif démo
                        </p>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2 text-xs pb-5 border-b border-current/10">
                        <div>
                          <p className="opacity-70">Tables</p>
                          <p className="font-bold tabular-nums mt-0.5">
                            {plan.maxTables}
                          </p>
                        </div>
                        <div>
                          <p className="opacity-70">Équipe</p>
                          <p className="font-bold tabular-nums mt-0.5">
                            {plan.maxStaff}
                          </p>
                        </div>
                        <div>
                          <p className="opacity-70">Articles</p>
                          <p className="font-bold tabular-nums mt-0.5">
                            {plan.maxMenuItems}
                          </p>
                        </div>
                      </div>

                      <ul className="mt-5 space-y-2.5 text-sm">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2.5">
                            <Check className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link
                      to={`/inscription?plan=${plan.code}`}
                      className={`mt-8 w-full py-3 rounded-lg text-center text-sm font-semibold transition-colors ${
                        plan.isFeatured
                          ? 'bg-[#FF8738] hover:bg-[#F07322] text-white'
                          : 'bg-[#182333] hover:bg-[#223044] text-white'
                      }`}
                    >
                      Démarrer avec {plan.name}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}
