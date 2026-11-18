import { MarketingLayout } from '../components/MarketingLayout';

type LegalDocKey = 'mentions' | 'confidentialite' | 'cgu' | 'cgv' | 'cookies';

const LEGAL_DOCS: Record<
  LegalDocKey,
  { title: string; sections: Array<{ heading: string; body: string }> }
> = {
  mentions: {
    title: 'Mentions légales',
    sections: [
      {
        heading: '1. Éditeur de la plateforme',
        body: 'La plateforme SaaS Resto’MAX est éditée à titre professionnel. Les coordonnées légales définitives (raison sociale, RCCM, siège social, directeur de publication et coordonnées d’hébergement) doivent être complétées et validées juridiquement avant la mise en production commerciale.',
      },
      {
        heading: '2. Hébergement et sécurité',
        body: 'L’application et les bases de données associées sont opérées sur des environnements cloud isolés avec séparation des environnements de développement, prévisualisation et production.',
      },
    ],
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    sections: [
      {
        heading: '1. Données collectées et isolation multi-tenant',
        body: 'Chaque restaurant client est responsable des données de son personnel, de ses menus, de ses commandes et de ses clients finaux. Les données sont strictement cloisonnées par identifiant d’établissement.',
      },
      {
        heading: '2. Durée de conservation et droits',
        body: 'Conformément aux bonnes pratiques applicables dans l’espace UEMOA et aux standards internationaux de protection des données, les comptes supprimés logiquement conservent leurs pièces comptables sur la durée légale requise. Toute demande d’accès ou de rectification peut être adressée via le formulaire de contact.',
      },
    ],
  },
  cgu: {
    title: 'Conditions Générales d’Utilisation (CGU)',
    sections: [
      {
        heading: '1. Objet du service',
        body: 'Les présentes CGU encadrent l’accès et l’utilisation de la plateforme Resto’MAX par les établissements clients, leurs collaborateurs autorisés et les clients finaux consultant un menu QR.',
      },
      {
        heading: '2. Responsabilité des comptes et rôles',
        body: 'Le propriétaire de l’établissement administre les rôles de son équipe et veille à la confidentialité des accès. Resto’MAX met en œuvre les contrôles de permission et de révocation côté serveur.',
      },
    ],
  },
  cgv: {
    title: 'Conditions Générales de Vente (CGV)',
    sections: [
      {
        heading: '1. Abonnements SaaS en FCFA (XOF)',
        body: 'Les abonnements sont exprimés en Francs CFA (XOF). Les montants et durées d’essai affichés sur l’environnement de prévisualisation constituent des tarifs de démonstration à valider juridiquement et commercialement avant ouverture publique.',
      },
      {
        heading: '2. Flux d’encaissement des restaurants',
        body: 'Les règlements effectués par les convives d’un restaurant sont encaissés directement par l’établissement via ses propres moyens de paiement ou son compte marchand configuré.',
      },
    ],
  },
  cookies: {
    title: 'Politique de cookies',
    sections: [
      {
        heading: '1. Cookies techniques essentiels',
        body: 'Resto’MAX utilise uniquement des cookies techniques strictement nécessaires au maintien sécurisé de la session authentifiée (cookie HttpOnly) et à la continuité du panier de commande.',
      },
      {
        heading: '2. Mesure d’audience respectueuse de la vie privée',
        body: 'Aucun traceur publicitaire tiers n’est activé par défaut. Tout outil analytique ultérieur sera soumis au consentement préalable.',
      },
    ],
  },
};

export function LegalPage({ doc }: { doc: LegalDocKey }) {
  const content = LEGAL_DOCS[doc];

  return (
    <MarketingLayout>
      <section className="bg-white border-b border-slate-200 py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-[#FF8738]">
            Documentation légale (Projet à valider juridiquement)
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#182333] tracking-tight">
            {content.title}
          </h1>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            Ce texte éditorial constitue une structure de départ à faire valider par un conseil juridique avant la publication officielle du service.
          </div>
          {content.sections.map((s) => (
            <div
              key={s.heading}
              className="bg-white rounded-xl border border-slate-200 p-6 space-y-2"
            >
              <h2 className="text-base font-bold text-[#182333]">{s.heading}</h2>
              <p className="text-sm text-[#64748B] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}
