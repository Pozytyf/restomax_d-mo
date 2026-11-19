export type Role =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'MANAGER'
  | 'CASHIER'
  | 'WAITER'
  | 'KITCHEN_BAR';

export type Permission =
  | 'dashboard:read'
  | 'orders:read'
  | 'orders:write'
  | 'pos:use'
  | 'pos:pay'
  | 'pos:refund'
  | 'floor:read'
  | 'floor:write'
  | 'kitchen:read'
  | 'kitchen:write'
  | 'menu:read'
  | 'menu:write'
  | 'stocks:read'
  | 'stocks:write'
  | 'staff:read'
  | 'staff:manage'
  | 'customers:read'
  | 'customers:write'
  | 'reservations:read'
  | 'reservations:write'
  | 'qr:read'
  | 'qr:manage'
  | 'finance:read'
  | 'reports:read'
  | 'settings:read'
  | 'settings:write'
  | 'superadmin:all';

export type RestaurantStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'DELETED';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'QR_TABLE';
export type OrderStatus =
  | 'PENDING'
  | 'IN_PREPARATION'
  | 'READY'
  | 'SERVED'
  | 'PAID'
  | 'CANCELLED';
export type StationType = 'KITCHEN' | 'BAR';
export type PaymentMethod =
  | 'CASH'
  | 'ORANGE_MONEY'
  | 'MTN_MOMO'
  | 'WAVE'
  | 'CARD';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  restaurantId: string | null;
  restaurantName: string | null;
  restaurantSlug: string | null;
  restaurantStatus: RestaurantStatus | null;
  permissions: Permission[];
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  tagline: string;
  priceMonthlyXof: number;
  priceYearlyXof: number;
  trialDays: number;
  maxTables: number;
  maxStaff: number;
  maxMenuItems: number;
  isDemoPricing: boolean;
  isFeatured: boolean;
  features: string[];
  active: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  timezone: string;
  taxRatePercent: number;
  serviceFeePercent: number;
  openingHours: string;
  paydunyaMode: 'TEST' | 'LIVE';
  paydunyaConfigured: boolean;
  status: RestaurantStatus;
  createdAt: string;
  planName?: string;
  subscriptionStatus?: string;
  ownerName?: string;
  ownerEmail?: string;
  ordersCount?: number;
  monthlyVolumeXof?: number;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  station: StationType;
  sortOrder: number;
  active: boolean;
}

export interface MenuOption {
  id: string;
  label: string;
  priceDeltaXof: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  categoryName?: string;
  station?: StationType;
  name: string;
  description: string;
  priceXof: number;
  costPriceXof: number;
  imageUrl: string | null;
  available: boolean;
  sortOrder: number;
  options: MenuOption[];
}

export interface DiningTable {
  id: string;
  restaurantId: string;
  zone: string;
  label: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  qrToken?: string;
  qrVersion?: number;
  qrStatus?: 'ACTIVE' | 'REVOKED';
  activeOrderId?: string | null;
  activeOrderTotalXof?: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  station: StationType;
  unitPriceXof: number;
  optionsSummary: string;
  optionsDeltaXof: number;
  quantity: number;
  lineTotalXof: number;
  notes: string;
  prepStatus: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';
}

export interface Order {
  id: string;
  restaurantId: string;
  orderNumber: string;
  orderType: OrderType;
  tableId: string | null;
  tableLabel?: string | null;
  customerName: string;
  status: OrderStatus;
  subtotalXof: number;
  discountXof: number;
  taxXof: number;
  totalXof: number;
  paidXof: number;
  notes: string;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface PaymentRecord {
  id: string;
  restaurantId: string;
  orderId: string;
  orderNumber?: string;
  amountXof: number;
  method: PaymentMethod;
  status: 'PAID' | 'REFUNDED' | 'FAILED';
  mode: 'TEST' | 'LIVE';
  reference: string;
  createdAt: string;
}

export interface StockItem {
  id: string;
  restaurantId: string;
  name: string;
  unit: string;
  quantity: number;
  minThreshold: number;
  unitCostXof: number;
  supplierName: string;
  updatedAt: string;
}

export interface StockAlertSettings {
  restaurantId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  recipientEmails: string;
  resolvedRecipients: string[];
  updatedAt: string;
}

export interface RestaurantNotification {
  id: string;
  restaurantId: string;
  type: string;
  title: string;
  message: string;
  stockId: string | null;
  emailDispatched: boolean;
  emailRecipients: string;
  emailStatus: 'SENT' | 'QUEUED_NO_SMTP' | 'SKIPPED' | 'FAILED';
  isRead: boolean;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  customPermissions: Permission[];
  createdAt: string;
}

export interface CustomerProfile {
  id: string;
  restaurantId: string;
  fullName: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  totalSpentXof: number;
  visitsCount: number;
  preferences: string;
  createdAt: string;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  reservedAt: string;
  tableId: string | null;
  tableLabel?: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'CANCELLED';
  notes: string;
}

export interface SupportTicket {
  id: string;
  restaurantId: string | null;
  restaurantName?: string;
  createdByEmail: string;
  subject: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  messages: Array<{
    id: string;
    author: string;
    role: string;
    body: string;
    createdAt: string;
  }>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorEmail: string;
  actorRole: string;
  restaurantId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}
