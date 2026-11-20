export interface DashboardData {
  kpis: {
    totalRevenueXof: number;
    collectedXof: number;
    expensesXof: number;
    ordersCount: number;
    avgBasketXof: number;
    pendingOrdersCount: number;
    tablesTotal: number;
    tablesOccupied: number;
    tablesReserved: number;
  };
  revenueSeries: Array<{ day: string; revenue_xof: number; orders: number }>;
  topItems: Array<{ name: string; qty: number; revenue_xof: number }>;
  lowStocks: Array<{
    id: string;
    name: string;
    unit: string;
    quantity: number;
    min_threshold: number;
    supplier_name: string;
  }>;
  paymentBreakdown: Array<{ method: string; total_xof: number; count: number }>;
  recentOrders: Array<{
    id: string;
    order_number: string;
    order_type: string;
    customer_name: string;
    status: string;
    total_xof: number;
    paid_xof: number;
    created_at: string;
    table_label: string | null;
  }>;
  staffActivity: Array<{
    actor_email: string;
    actor_role: string;
    action: string;
    details: string;
    created_at: string;
  }>;
}

export interface FinanceOverviewData {
  summary: {
    grossSalesXof: number;
    collectedXof: number;
    taxCollectedXof: number;
    cogsXof: number;
    expensesXof: number;
    netEstimatedMarginXof: number;
  };
  today: {
    date: string;
    revenueXof: number;
    collectedXof: number;
    ordersCount: number;
    avgBasketXof: number;
  };
  byMethod: Array<{ method: string; amountXof: number; count: number }>;
}

export type DashboardWidgetId =
  | 'daily-revenue'
  | 'active-orders'
  | 'stock-alerts'
  | 'kpi-overview'
  | 'realtime-finance'
  | 'sales-chart'
  | 'financial-summary'
  | 'top-items'
  | 'staff-activity'
  | 'recent-orders';

export interface DashboardWidgetDefinition {
  id: DashboardWidgetId;
  titleKey: string;
  descriptionKey?: string;
  colSpanClass: string;
  requiresFinance?: boolean;
}

export interface DashboardWidgetPreference {
  id: DashboardWidgetId;
  visible: boolean;
  order: number;
}
