import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-[#182333]">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <Link to="/" className="whitespace-nowrap shrink-0">
            <BrandLogo theme="light" />
          </Link>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#64748B]">
            <NavLink
              to="/fonctionnalites"
              className={({ isActive }) =>
                `hover:text-[#182333] transition-colors whitespace-nowrap shrink-0 ${
                  isActive ? 'text-[#182333] font-semibold' : ''
                }`
              }
            >
              Fonctionnalités
            </NavLink>
            <NavLink
              to="/tarifs"
              className={({ isActive }) =>
                `hover:text-[#182333] transition-colors whitespace-nowrap shrink-0 ${
                  isActive ? 'text-[#182333] font-semibold' : ''
                }`
              }
            >
              Tarifs
            </NavLink>
            <NavLink
              to="/demonstration"
              className={({ isActive }) =>
                `hover:text-[#182333] transition-colors whitespace-nowrap shrink-0 ${
                  isActive ? 'text-[#182333] font-semibold' : ''
                }`
              }
            >
              Démonstration
            </NavLink>
            <NavLink
              to="/a-propos"
              className={({ isActive }) =>
                `hover:text-[#182333] transition-colors whitespace-nowrap shrink-0 ${
                  isActive ? 'text-[#182333] font-semibold' : ''
                }`
              }
            >
              À propos
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `hover:text-[#182333] transition-colors whitespace-nowrap shrink-0 ${
                  isActive ? 'text-[#182333] font-semibold' : ''
                }`
              }
            >
              Contact
            </NavLink>
          </nav>

          {/* Zone 3: Login link + 1 Primary CTA */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <Link
              to="/connexion"
              className="text-sm font-medium text-[#182333] hover:text-[#FF8738] transition-colors whitespace-nowrap shrink-0"
            >
              Connexion
            </Link>
            <Link
              to="/inscription"
              className="px-4 py-2 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Essayer Resto’MAX
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-[#182333] hover:bg-slate-100"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-3">
            <nav className="flex flex-col space-y-2 text-sm font-medium">
              <Link
                to="/fonctionnalites"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-[#182333]"
              >
                Fonctionnalités
              </Link>
              <Link
                to="/tarifs"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-[#182333]"
              >
                Tarifs
              </Link>
              <Link
                to="/demonstration"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-[#182333]"
              >
                Démonstration
              </Link>
              <Link
                to="/a-propos"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-[#182333]"
              >
                À propos
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-[#182333]"
              >
                Contact
              </Link>
              <Link
                to="/faq"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-[#182333]"
              >
                FAQ
              </Link>
            </nav>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/connexion"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-[#182333]"
              >
                Connexion
              </Link>
              <Link
                to="/inscription"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2.5 rounded-lg bg-[#FF8738] text-white text-sm font-semibold"
              >
                Essayer Resto’MAX
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#182333] text-slate-300 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="space-y-4">
              <BrandLogo theme="dark" />
              <p className="text-sm text-slate-400 leading-relaxed">
                Plateforme SaaS de gestion et de pilotage des restaurants conçue pour la Côte d’Ivoire et l’espace UEMOA.
              </p>
              <p className="text-xs text-slate-400">
                Devise FCFA (XOF) · Fuseau Africa/Abidjan
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Produit</h3>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li>
                  <Link to="/fonctionnalites" className="hover:text-white transition-colors">
                    Fonctionnalités
                  </Link>
                </li>
                <li>
                  <Link to="/tarifs" className="hover:text-white transition-colors">
                    Tarifs & offres
                  </Link>
                </li>
                <li>
                  <Link to="/demonstration" className="hover:text-white transition-colors">
                    Démonstration guidée
                  </Link>
                </li>
                <li>
                  <Link to="/q/sillage-table-01-v1" className="hover:text-white transition-colors">
                    Tester un menu QR table
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Entreprise</h3>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li>
                  <Link to="/a-propos" className="hover:text-white transition-colors">
                    À propos
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-white transition-colors">
                    Questions fréquentes
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors">
                    Contact commercial
                  </Link>
                </li>
                <li>
                  <Link to="/connexion" className="hover:text-white transition-colors">
                    Accès application SaaS
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Informations légales</h3>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li>
                  <Link to="/mentions-legales" className="hover:text-white transition-colors">
                    Mentions légales
                  </Link>
                </li>
                <li>
                  <Link to="/confidentialite" className="hover:text-white transition-colors">
                    Politique de confidentialité
                  </Link>
                </li>
                <li>
                  <Link to="/cgu" className="hover:text-white transition-colors">
                    Conditions générales d’utilisation
                  </Link>
                </li>
                <li>
                  <Link to="/cgv" className="hover:text-white transition-colors">
                    Conditions générales de vente
                  </Link>
                </li>
                <li>
                  <Link to="/cookies" className="hover:text-white transition-colors">
                    Politique de cookies
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} Resto’MAX. Tous droits réservés.</p>
            <p>
              Environnement SaaS multi-tenant sécurisé · Abidjan, Côte d’Ivoire
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
