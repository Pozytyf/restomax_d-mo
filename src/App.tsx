import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './app/providers/AuthProvider';
import { ProtectedRoute } from './app/guards/ProtectedRoute';
import { ToastProvider } from './components/Toast';

// Public Marketing Site
import { HomePage } from './marketing/pages/HomePage';
import { FeaturesPage } from './marketing/pages/FeaturesPage';
import { PricingPage } from './marketing/pages/PricingPage';
import { DemoPage } from './marketing/pages/DemoPage';
import { AboutPage } from './marketing/pages/AboutPage';
import { ContactPage } from './marketing/pages/ContactPage';
import { FaqPage } from './marketing/pages/FaqPage';
import { LegalPage } from './marketing/pages/LegalPage';

// Auth
import { LoginPage } from './auth/LoginPage';
import { RegisterPage } from './auth/RegisterPage';

// Customer QR Experience
import { QrMenuPage } from './customer/QrMenuPage';
import { QrOrderTrackingPage } from './customer/QrOrderTrackingPage';

// Restaurant SaaS Modules
import { OwnerDashboardPage } from './restaurant/dashboard/OwnerDashboardPage';
import { PosPage } from './restaurant/pos/PosPage';
import { OrdersPage } from './restaurant/orders/OrdersPage';
import { FloorTablesPage } from './restaurant/floor/FloorTablesPage';
import { KitchenKdsPage } from './restaurant/kitchen/KitchenKdsPage';
import { MenuCatalogPage } from './restaurant/menu/MenuCatalogPage';
import { StocksPage } from './restaurant/stocks/StocksPage';
import { StaffPage } from './restaurant/staff/StaffPage';
import { CustomersPage } from './restaurant/customers/CustomersPage';
import { ReservationsPage } from './restaurant/reservations/ReservationsPage';
import { QrCodesPage } from './restaurant/qr/QrCodesPage';
import { FinanceReportsPage } from './restaurant/finance/FinanceReportsPage';
import { SettingsPage } from './restaurant/settings/SettingsPage';

// Super-admin Portal
import { SuperAdminDashboardPage } from './superadmin/dashboard/SuperAdminDashboardPage';
import { RestaurantsAdminPage } from './superadmin/restaurants/RestaurantsAdminPage';
import { PlansSubscriptionsPage } from './superadmin/subscriptions/PlansSubscriptionsPage';
import { PlatformBillingPage } from './superadmin/billing/PlatformBillingPage';
import { PlatformUsersPage } from './superadmin/users/PlatformUsersPage';
import { SupportAdminPage } from './superadmin/support/SupportAdminPage';
import { AuditLogPage } from './superadmin/audit/AuditLogPage';
import { PlatformSettingsPage } from './superadmin/settings/PlatformSettingsPage';

function AppIndexRoute() {
  const { user, can } = useAuth();
  if (can('dashboard:read')) return <OwnerDashboardPage />;
  if (user?.role === 'KITCHEN_BAR') return <Navigate to="/app/kitchen" replace />;
  if (user?.role === 'WAITER') return <Navigate to="/app/floor" replace />;
  if (user?.role === 'CASHIER') return <Navigate to="/app/pos" replace />;
  return <Navigate to="/app/orders" replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Showcase Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/fonctionnalites" element={<FeaturesPage />} />
            <Route path="/tarifs" element={<PricingPage />} />
            <Route path="/demonstration" element={<DemoPage />} />
            <Route path="/a-propos" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route
              path="/mentions-legales"
              element={<LegalPage doc="mentions" />}
            />
            <Route
              path="/confidentialite"
              element={<LegalPage doc="confidentialite" />}
            />
            <Route path="/cgu" element={<LegalPage doc="cgu" />} />
            <Route path="/cgv" element={<LegalPage doc="cgv" />} />
            <Route path="/cookies" element={<LegalPage doc="cookies" />} />

            {/* Auth Routes */}
            <Route path="/connexion" element={<LoginPage />} />
            <Route path="/inscription" element={<RegisterPage />} />

            {/* Guest Mobile-First QR Routes */}
            <Route path="/q/:token" element={<QrMenuPage />} />
            <Route
              path="/q/:token/suivi/:orderId"
              element={<QrOrderTrackingPage />}
            />

            {/* Restaurant SaaS Space */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppIndexRoute />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/pos"
              element={
                <ProtectedRoute permission="pos:use">
                  <PosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/orders"
              element={
                <ProtectedRoute permission="orders:read">
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/floor"
              element={
                <ProtectedRoute permission="floor:read">
                  <FloorTablesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/kitchen"
              element={
                <ProtectedRoute permission="kitchen:read">
                  <KitchenKdsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/menu"
              element={
                <ProtectedRoute permission="menu:read">
                  <MenuCatalogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/stocks"
              element={
                <ProtectedRoute permission="stocks:read">
                  <StocksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/staff"
              element={
                <ProtectedRoute permission="staff:read">
                  <StaffPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/customers"
              element={
                <ProtectedRoute permission="customers:read">
                  <CustomersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/reservations"
              element={
                <ProtectedRoute permission="reservations:read">
                  <ReservationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/qr"
              element={
                <ProtectedRoute permission="qr:read">
                  <QrCodesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/finance"
              element={
                <ProtectedRoute permission="finance:read">
                  <FinanceReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/settings"
              element={
                <ProtectedRoute permission="settings:read">
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Super-admin Portal */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/restaurants"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <RestaurantsAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/subscriptions"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <PlansSubscriptionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/billing"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <PlatformBillingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/users"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <PlatformUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/support"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SupportAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/audit"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <AuditLogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/settings"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <PlatformSettingsPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
