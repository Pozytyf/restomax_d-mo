import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, MapPin, Phone } from 'lucide-react';
import { MarketingLayout } from '../components/MarketingLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';

export function ContactPage() {
  const { notify } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    restaurantName: '',
    city: 'Abidjan',
    message: '',
    website: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    apiFetch<{ settings: Record<string, string> }>('/api/public/settings')
      .then((res) => setSettings(res.settings))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await apiFetch('/api/public/contact', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSent(true);
      notify('Message transmis avec succès.', 'success');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Erreur lors de l’envoi.',
        'error',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <MarketingLayout>
      <section className="bg-white border-b border-slate-200 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-[#FF8738]">Contact</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#182333] tracking-tight">
            Parlons de votre restaurant
          </h1>
          <p className="mt-3 text-[#64748B] max-w-2xl">
            Questions commerciales, déploiement multi-sites ou assistance technique : écrivez-nous directement via ce formulaire.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-7 space-y-5">
              <h2 className="text-lg font-bold text-[#182333]">
                Coordonnées commerciales configurables
              </h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#FF8738] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#182333]">Email</p>
                    <p className="text-[#64748B]">
                      {settings.contact_email || 'contact@restomax.ci'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#FF8738] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#182333]">Téléphone</p>
                    <p className="text-[#64748B]">
                      {settings.contact_phone || 'Configurable depuis le Super-admin'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#FF8738] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#182333]">Zone couverte</p>
                    <p className="text-[#64748B]">
                      {settings.commercial_region || 'Côte d’Ivoire · Zone UEMOA'}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#64748B] pt-3 border-t border-slate-100">
                Ces coordonnées sont administrables en direct depuis les paramètres de la plateforme Super-admin.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              {sent ? (
                <div className="py-10 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-[#14B8A6] mx-auto" />
                  <h2 className="text-xl font-bold text-[#182333]">
                    Merci pour votre message
                  </h2>
                  <p className="text-sm text-[#64748B] max-w-md mx-auto">
                    Votre demande a été enregistrée dans notre console commerciale. Nous vous répondrons dans les meilleurs délais.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    name="website"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#182333] mb-1">
                        Email *
                      </label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#182333] mb-1">
                        Établissement
                      </label>
                      <input
                        type="text"
                        value={form.restaurantName}
                        onChange={(e) =>
                          setForm({ ...form, restaurantName: e.target.value })
                        }
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#182333] mb-1">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-6 py-3 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white font-semibold text-sm transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {sending ? 'Envoi…' : 'Envoyer le message'}
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
