import { Link } from 'react-router-dom';
import { MarketingLayout } from '../components/MarketingLayout';

export function AboutPage() {
  return (
    <MarketingLayout>
      <section className="bg-white border-b border-slate-200 py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-[#FF8738]">À propos</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#182333] tracking-tight">
            Donner aux restaurateurs africains et internationaux des outils de pilotage exigeants
          </h1>
          <p className="mt-4 text-base text-[#64748B] leading-relaxed">
            Resto’MAX est né d’un constat simple sur le terrain : trop d’établissements de qualité jonglent entre cahiers papier, caisses déconnectées et tableurs manuels, entraînant des écarts de caisse, des oublis en cuisine et une visibilité tardive sur les marges.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-7 space-y-4">
            <h2 className="text-xl font-bold text-[#182333]">
              Notre vision produit
            </h2>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Offrir un logiciel SaaS fiable, rapide et ergonomique, conçu nativement autour du Franc CFA (XOF), des habitudes de service en Côte d’Ivoire et dans l’espace UEMOA, et des standards de sécurité multi-tenant les plus stricts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-[#182333]">Souveraineté financière</h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                Resto’MAX ne centralise jamais les fonds des restaurants. Chaque établissement connecte son propre compte marchand configurable.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-[#182333]">Sécurité vérifiée côté serveur</h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                Calcul des montants, contrôle des permissions, révocation des sessions et isolation des données sont appliqués sur le serveur.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-[#182333]">Évolutivité internationale</h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                Paramétrage régional prêt pour l’ajout de nouvelles devises, fiscalités et langues selon la croissance des enseignes.
              </p>
            </div>
          </div>

          <div className="text-center pt-4">
            <Link
              to="/inscription"
              className="inline-flex px-6 py-3 rounded-lg bg-[#FF8738] text-white text-sm font-semibold hover:bg-[#F07322] transition-colors"
            >
              Ouvrir un compte établissement
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
