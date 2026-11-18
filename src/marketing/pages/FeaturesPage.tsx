import { Link } from 'react-router-dom';
import {
  BarChart3,
  CalendarClock,
  ChefHat,
  ClipboardList,
  CreditCard,
  LayoutGrid,
  Package,
  QrCode,
  ShieldCheck,
  UserCheck,
  Utensils,
} from 'lucide-react';
import { MarketingLayout } from '../components/MarketingLayout';

const MODULES = [
  {
    icon: ClipboardList,
    title: '01. Gestion des commandes',
    desc: 'Centralisez les commandes sur place, à emporter et QR table. Suivez chaque étape de la prise de commande jusqu’à la clôture et l’archivage.',
  },
  {
    icon: CreditCard,
    title: '02. Point de vente (POS)',
    desc: 'Caisse tactile rapide : ajout au panier, options et suppléments, remises contrôlées, TVA automatique, paiements partiels, partagés et reçus.',
  },
  {
    icon: LayoutGrid,
    title: '03. Salle & tables',
    desc: 'Organisez vos zones (Terrasse, Salle climatisée, Salon VIP), visualisez l’occupation en temps réel et gérez les additions par table.',
  },
  {
    icon: QrCode,
    title: '04. Menu digital & QR code',
    desc: 'Générez des QR codes uniques et versionnés par table. Révoquez ou régénérez un QR code compromis en un clic sans affecter les autres tables.',
  },
  {
    icon: ChefHat,
    title: '05. Cuisine & Bar (KDS)',
    desc: 'Écrans de préparation dédiés séparant automatiquement les plats cuisine et les boissons bar, avec suivi des priorités et temps d’attente.',
  },
  {
    icon: Package,
    title: '06. Gestion des stocks',
    desc: 'Suivi des ingrédients, entrées fournisseurs, sorties, pertes, inventaires et alertes automatiques lorsque le stock atteint le seuil minimal.',
  },
  {
    icon: ShieldCheck,
    title: '07. Personnel & permissions',
    desc: 'Rôles prédéfinis (Propriétaire, Manager, Caissier, Serveur, Cuisine/Bar), délégation encadrée, suspension immédiate et révocation de session.',
  },
  {
    icon: UserCheck,
    title: '08. Clients & fidélité',
    desc: 'Base clients structurée avec historique de dépenses, préférences alimentaires et suivi des points de fidélité.',
  },
  {
    icon: CalendarClock,
    title: '09. Réservations',
    desc: 'Planification des réservations par date, heure, nombre de couverts et affectation directe à une table de votre salle.',
  },
  {
    icon: BarChart3,
    title: '10. Rapports & finances',
    desc: 'Chiffre d’affaires en FCFA, répartition par mode d’encaissement, suivi des dépenses, calcul des marges brutes et exports CSV.',
  },
  {
    icon: Utensils,
    title: '11. Catalogue & tarification',
    desc: 'Activation ou mise en indisponibilité immédiate d’un plat en cas de rupture, gestion des variantes, suppléments et coûts matière.',
  },
];

export function FeaturesPage() {
  return (
    <MarketingLayout>
      <section className="bg-white border-b border-slate-200 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-[#FF8738]">
            Suite complète Resto’MAX
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#182333] tracking-tight max-w-3xl">
            Toutes les fonctionnalités métier réunies dans une seule plateforme
          </h1>
          <p className="mt-4 text-[#64748B] max-w-2xl text-base leading-relaxed">
            Conçue pour les réalités opérationnelles des restaurants en Côte d’Ivoire et dans l’espace UEMOA, avec une architecture prête pour le multi-établissement.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.title}
                className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#182333] text-[#FF8738] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-[#182333]">
                    {mod.title}
                  </h2>
                  <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 text-center">
          <Link
            to="/inscription"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white font-semibold text-sm transition-colors"
          >
            Créer mon établissement sur Resto’MAX
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
