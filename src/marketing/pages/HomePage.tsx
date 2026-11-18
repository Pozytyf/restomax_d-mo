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
import { MarketingLayout } from '../components/MarketingLayout';
import { ResilientImage } from '../../components/ResilientImage';
import { formatFcfa } from '../../utils/format';

export function HomePage() {
  const [previewTab, setPreviewTab] = useState<'owner' | 'superadmin'>('owner');

  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-semibold text-[#FF8738] tracking-wide mb-3">
                Plateforme SaaS restauration · Côte d’Ivoire & UEMOA
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#182333] tracking-tight leading-[1.12] text-balance">
                Votre restaurant. Votre équipe. Votre performance. Tout au même endroit.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-xl">
                Resto’MAX simplifie la gestion de votre restaurant : commandes, caisse, cuisine, stocks, personnel et finances depuis une seule plateforme.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/inscription"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white font-semibold text-sm transition-colors whitespace-nowrap"
                >
                  <span>Démarrer l’essai gratuit</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/demonstration"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[#182333] font-semibold text-sm transition-colors whitespace-nowrap"
                >
                  <span>Voir la démonstration</span>
                </Link>
              </div>

              <p className="mt-5 text-xs text-[#64748B]">
                Tarification transparente en FCFA · Sans matériel propriétaire imposé · Déploiement immédiat
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[300px] rounded-2xl overflow-hidden border border-slate-200 bg-[#182333]">
                <ResilientImage
                  src="/src/assets/images/hero_restomax_dining_1795030466131.jpg"
                  alt="Salle de restaurant contemporaine équipée de Resto’MAX à Abidjan"
                  className="w-full h-full object-cover"
                  fallbackTitle="Resto’MAX — Pilotage de salle et service"
                />
              </div>
            </div>
          </div>

          {/* 4-column structural proof strip */}
          <div className="mt-12 pt-10 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-2xl font-bold text-[#182333] tabular-nums">6 rôles</p>
              <p className="text-sm text-[#64748B] mt-1">
                Propriétaire, Manager, Caissier, Serveur, Cuisine/Bar & Super-admin
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#182333] tabular-nums">Temps réel</p>
              <p className="text-sm text-[#64748B] mt-1">
                Synchronisation instantanée POS, KDS cuisine/bar, salle et QR tables
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#182333] tabular-nums">FCFA (XOF)</p>
              <p className="text-sm text-[#64748B] mt-1">
                TVA paramétrable, reçus, paiements partiels, partagés et Mobile Money
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#182333] tabular-nums">Multi-tenant</p>
              <p className="text-sm text-[#64748B] mt-1">
                Isolation stricte des données et journal d’audit de sécurité complet
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
              Une architecture opérationnelle pensée pour le terrain
            </h2>
            <p className="mt-3 text-[#64748B] text-base">
              Chaque poste de votre restaurant travaille sur la même donnée source, sans ressaisie ni perte de tickets.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-7 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[#182333] text-[#FF8738] flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-[#182333]">
                  01. Caisse POS & encaissement multicanal
                </h3>
                <p className="mt-2 text-sm text-[#64748B] leading-relaxed max-w-xl">
                  Encaissez en espèces, carte, Wave, Orange Money ou MTN MoMo via votre compte marchand PayDunya configurable. Gérez les paiements partiels, le partage d’addition et les remises autorisées avec calcul serveur sécurisé.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap gap-6 text-xs text-[#64748B]">
                <span>Calcul TVA automatique</span>
                <span aria-hidden="true">·</span>
                <span>Protection anti double-encaissement</span>
                <span aria-hidden="true">·</span>
                <span>Fonds versés directement au restaurant</span>
              </div>
            </div>

            <div className="bg-[#182333] text-white rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-white/10 text-[#FF8738] flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="mt-5 text-xl font-bold">
                  02. Commande QR par table
                </h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  Vos clients scannent le QR fixe de leur table, consultent les plats disponibles en temps réel et envoient leur commande directement en cuisine.
                </p>
              </div>
              <div className="mt-6">
                <Link
                  to="/q/sillage-table-01-v1"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF8738] hover:underline"
                >
                  <span>Ouvrir le menu QR de démonstration</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <div className="w-10 h-10 rounded-lg bg-[#F5F7FA] text-[#182333] flex items-center justify-center">
                <ChefHat className="w-5 h-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#182333]">
                03. KDS Cuisine & Bar
              </h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                Ventilation automatique des lignes vers l’écran Cuisine ou l’écran Bar, chronomètre d’attente et notification immédiate aux serveurs dès qu’un plat est prêt.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <div className="w-10 h-10 rounded-lg bg-[#F5F7FA] text-[#182333] flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#182333]">
                04. Stocks & alertes de rupture
              </h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                Suivez les entrées fournisseurs, sorties, pertes et inventaires. Recevez des alertes dès qu’un ingrédient passe sous son seuil critique.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <div className="w-10 h-10 rounded-lg bg-[#F5F7FA] text-[#182333] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#182333]">
                05. Équipe, clients & réservations
              </h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                Déléguez des droits précis par rôle, gérez le plan de salle, les réservations et le fichier de fidélité clients.
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
                Aperçu des tableaux de bord de pilotage
              </h2>
              <p className="mt-2 text-[#64748B] text-base max-w-2xl">
                Basculez entre la vue Propriétaire d’établissement et la vue Super-administrateur de plateforme.
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
                Dashboard Propriétaire
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
                Portail Super-admin
              </button>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 overflow-hidden bg-[#F5F7FA]">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-3 bg-[#182333] text-white p-6">
                <p className="text-xs font-semibold text-[#FF8738]">
                  {previewTab === 'owner' ? 'Espace Restaurant' : 'Portail Plateforme'}
                </p>
                <p className="mt-1 text-base font-bold">
                  {previewTab === 'owner'
                    ? 'Le Sillage Lagune (Démo)'
                    : 'Administration Resto’MAX'}
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-300">
                  {previewTab === 'owner' ? (
                    <>
                      <li className="px-3 py-2 rounded-md bg-[#FF8738] text-white font-semibold">
                        Tableau de bord
                      </li>
                      <li className="px-3 py-2 rounded-md">Caisse POS</li>
                      <li className="px-3 py-2 rounded-md">Salle & Tables</li>
                      <li className="px-3 py-2 rounded-md">Cuisine & Bar (KDS)</li>
                      <li className="px-3 py-2 rounded-md">Stocks & Achats</li>
                      <li className="px-3 py-2 rounded-md">QR Codes Tables</li>
                    </>
                  ) : (
                    <>
                      <li className="px-3 py-2 rounded-md bg-[#FF8738] text-white font-semibold">
                        Vue Globale SaaS
                      </li>
                      <li className="px-3 py-2 rounded-md">Restaurants clients</li>
                      <li className="px-3 py-2 rounded-md">Plans & Tarifs</li>
                      <li className="px-3 py-2 rounded-md">Facturation plateforme</li>
                      <li className="px-3 py-2 rounded-md">Journal d’audit</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="lg:col-span-9 p-6 sm:p-8">
                {previewTab === 'owner' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">Chiffre d’affaires (démo)</p>
                        <p className="mt-1 text-lg font-bold text-[#182333] tabular-nums">
                          {formatFcfa(318000)}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">Commandes actives</p>
                        <p className="mt-1 text-lg font-bold text-[#FF8738] tabular-nums">
                          2 en cuisine
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">Panier moyen</p>
                        <p className="mt-1 text-lg font-bold text-[#182333] tabular-nums">
                          {formatFcfa(35333)}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">Alertes stock</p>
                        <p className="mt-1 text-lg font-bold text-[#E05252] tabular-nums">
                          2 critiques
                        </p>
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-[#182333] text-sm">
                          Testez le véritable dashboard avec des données persistées
                        </h4>
                        <p className="text-xs text-[#64748B] mt-1">
                          Connectez-vous en un clic depuis la page Connexion pour manipuler la caisse, la cuisine et les stocks.
                        </p>
                      </div>
                      <Link
                        to="/connexion"
                        className="px-4 py-2 rounded-lg bg-[#FF8738] text-white text-xs font-semibold whitespace-nowrap"
                      >
                        Ouvrir l’espace démo
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">Restaurants actifs</p>
                        <p className="mt-1 text-lg font-bold text-[#14B8A6] tabular-nums">
                          2 actifs · 1 essai
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">Revenus plateforme</p>
                        <p className="mt-1 text-lg font-bold text-[#182333] tabular-nums">
                          {formatFcfa(110000)}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">Paiements en attente</p>
                        <p className="mt-1 text-lg font-bold text-[#E5A32A] tabular-nums">
                          {formatFcfa(55000)}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-[#64748B]">Tickets ouverts</p>
                        <p className="mt-1 text-lg font-bold text-[#182333] tabular-nums">
                          1 ticket
                        </p>
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-[#182333] text-sm">
                          Séparation stricte des flux financiers et multi-tenant
                        </h4>
                        <p className="text-xs text-[#64748B] mt-1">
                          Le portail Super-admin pilote les abonnements SaaS, la modération des établissements et l’audit sécurité.
                        </p>
                      </div>
                      <Link
                        to="/connexion"
                        className="px-4 py-2 rounded-lg bg-[#182333] text-white text-xs font-semibold whitespace-nowrap"
                      >
                        Accéder au Super-admin
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
              alt="Terminal POS Resto’MAX au comptoir d’un restaurant"
              className="w-full h-80 sm:h-96 object-cover"
              fallbackTitle="Terminal de caisse POS Resto’MAX"
            />
          </div>
          <div className="lg:col-span-6 space-y-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#182333] tracking-tight">
              De la prise de commande en salle au bilan financier en FCFA
            </h2>
            <p className="text-[#64748B] leading-relaxed">
              Que le client commande lui-même via le QR code de sa table ou que le serveur saisisse l’addition sur tablette, le ticket est validé côté serveur et routé instantanément vers la cuisine et le bar.
            </p>
            <ul className="space-y-3 text-sm text-[#182333]">
              <li className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#14B8A6] shrink-0 mt-0.5" />
                <span>Prix et totaux calculés côté serveur pour éviter toute manipulation.</span>
              </li>
              <li className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-[#FF8738] shrink-0 mt-0.5" />
                <span>Suivi des marges, dépenses d’approvisionnement et export CSV en un clic.</span>
              </li>
            </ul>
            <div className="pt-2">
              <Link
                to="/fonctionnalites"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF8738] hover:underline"
              >
                <span>Explorer toutes les fonctionnalités</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Testimonials (Explicitly labeled as fictional) */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#182333]">
                Retours d’usage en conditions réelles
              </h2>
              <p className="text-xs text-[#64748B] mt-1">
                Témoignages de démonstration fictifs illustrant les bénéfices opérationnels attendus.
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
            ].map((t) => (
              <div
                key={t.name}
                className="p-6 rounded-xl border border-slate-200 bg-[#F5F7FA] flex flex-col justify-between"
              >
                <p className="text-sm text-[#182333] leading-relaxed">
                  « {t.quote} »
                </p>
                <div className="mt-5 pt-4 border-t border-slate-200">
                  <p className="text-sm font-semibold text-[#182333]">{t.name}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">{t.role}</p>
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
            Prêt à structurer la gestion de votre établissement ?
          </h2>
          <p className="mt-3 text-slate-300 text-base">
            Créez votre espace restaurant en moins de 2 minutes avec un essai configurable, ou demandez une présentation guidée.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/inscription"
              className="px-6 py-3 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white font-semibold text-sm transition-colors"
            >
              Créer mon compte restaurant
            </Link>
            <Link
              to="/contact"
              className="px-6 py-3 rounded-lg border border-white/25 hover:bg-white/10 text-white font-semibold text-sm transition-colors"
            >
              Contacter l’équipe
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
