import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, QrCode, Monitor, ChefHat } from 'lucide-react';
import { MarketingLayout } from '../components/MarketingLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';

export function DemoPage() {
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

  const steps = [
    {
      title: '1. Commande QR ou prise de commande en salle',
      icon: QrCode,
      desc: 'Le client scanne le QR unique de sa table ou le serveur saisit le ticket sur tablette. Les prix et disponibilités sont validés en direct côté serveur.',
      actionLabel: 'Tester le menu QR de la Table 01',
      actionTo: '/q/sillage-table-01-v1',
    },
    {
      title: '2. Routage instantané Cuisine & Bar (KDS)',
      icon: ChefHat,
      desc: 'Les plats chauds apparaissent sur l’écran Cuisine et les boissons sur l’écran Bar. Dès qu’une préparation est prête, le service en salle est averti en temps réel.',
      actionLabel: 'Ouvrir l’espace Cuisine/Bar via Connexion',
      actionTo: '/connexion',
    },
    {
      title: '3. Encaissement POS & pilotage financier FCFA',
      icon: Monitor,
      desc: 'Le caissier encaisse en espèces, carte ou Mobile Money (mode TEST configurable PayDunya), gère les paiements partiels et met à jour le chiffre d’affaires du propriétaire.',
      actionLabel: 'Ouvrir le Dashboard Propriétaire',
      actionTo: '/connexion',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/public/demo-requests', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSubmitted(true);
      notify('Demande de démonstration enregistrée.', 'success');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Erreur lors de l’envoi.',
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
            Démonstration guidée
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#182333] tracking-tight">
            Découvrez le flux complet de Resto’MAX en action
          </h1>
          <p className="mt-3 text-[#64748B] max-w-2xl">
            Explorez chaque étape du parcours opérationnel ou testez directement notre environnement de démonstration multi-rôles.
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
                  Étape {idx + 1}
                </button>
              ))}
            </div>

            {(() => {
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
                  Accès immédiat aux comptes de démonstration
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Connexion directe en 1 clic pour Propriétaire, Caissier, Cuisine/Bar et Super-admin.
                </p>
              </div>
              <Link
                to="/connexion"
                className="px-4 py-2.5 rounded-lg bg-[#FF8738] text-white text-xs font-semibold whitespace-nowrap"
              >
                Aller à la connexion
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <h2 className="text-lg font-bold text-[#182333]">
                Demander une démonstration commerciale
              </h2>
              <p className="text-xs text-[#64748B] mt-1">
                Un conseiller vous présente Resto’MAX selon les spécificités de votre établissement.
              </p>

              {submitted ? (
                <div className="mt-6 p-5 rounded-xl bg-[#F5F7FA] border border-slate-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#14B8A6] mx-auto" />
                  <p className="font-semibold text-[#182333] text-sm">
                    Demande bien enregistrée
                  </p>
                  <p className="text-xs text-[#64748B]">
                    Nous reviendrons vers vous par email pour fixer un créneau.
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
                      Nom complet *
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
                      Nom du restaurant *
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
                        Email professionnel *
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
                        Téléphone
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
                      Besoins prioritaires
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
                    {submitting ? 'Envoi en cours…' : 'Planifier une démonstration'}
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
