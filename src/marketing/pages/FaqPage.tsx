import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MarketingLayout } from '../components/MarketingLayout';

const FAQ_ITEMS = [
  {
    q: 'Comment fonctionne Resto’MAX au quotidien dans mon restaurant ?',
    a: 'Vous créez votre établissement, configurez vos plats et vos tables, puis chaque membre d’équipe (caissier, serveur, cuisine/bar) accède uniquement aux écrans autorisés par son rôle depuis navigateur, tablette ou smartphone.',
  },
  {
    q: 'Comment sont structurés les tarifs en FCFA ?',
    a: 'Les plans (Essentiel, Professionnel, Premium) incluent une période d’essai configurable et une facturation mensuelle ou annuelle en FCFA. Les tarifs actuellement affichés sur la page Tarifs sont des valeurs de démonstration administrables depuis le portail Super-admin.',
  },
  {
    q: 'Comment fonctionnent les QR codes sur les tables ?',
    a: 'Chaque table dispose d’un QR code unique et versionné. Le client ne peut pas changer lui-même de table ni modifier les prix. Si une fiche QR est abîmée ou compromise, vous pouvez la révoquer et régénérer un nouveau token en un clic.',
  },
  {
    q: 'Quels moyens de paiement sont pris en charge ?',
    a: 'La caisse POS prend en charge les espèces, la carte bancaire, Wave, Orange Money et MTN MoMo, avec gestion des paiements partiels et partagés. L’intégration PayDunya est paramétrable par chaque restaurant en mode TEST avant tout passage en production.',
  },
  {
    q: 'Resto’MAX encaisse-t-il l’argent à la place de mon restaurant ?',
    a: 'Non. Le circuit d’abonnement SaaS (vers Resto’MAX) et le circuit d’encaissement client (vers votre établissement) sont strictement séparés. Chaque restaurant connecte ses propres identifiants marchands.',
  },
  {
    q: 'Comment est sécurisé l’accès de mon personnel ?',
    a: 'Les permissions sont vérifiées côté serveur à chaque requête. Si vous suspendez un employé ou révoquez sa session, son accès est bloqué immédiatement même avec un ancien jeton.',
  },
  {
    q: 'Puis-je résilier ou changer d’offre à tout moment ?',
    a: 'Oui, le changement de plan et la gestion de votre abonnement s’effectuent sans blocage de vos historiques comptables et rapports exportables.',
  },
];

export function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <MarketingLayout>
      <section className="bg-white border-b border-slate-200 py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-[#FF8738]">FAQ</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#182333] tracking-tight">
            Questions fréquentes sur Resto’MAX
          </h1>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={item.q}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left font-semibold text-[#182333] text-sm sm:text-base cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-[#64748B] transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-[#64748B] leading-relaxed border-t border-slate-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </MarketingLayout>
  );
}
