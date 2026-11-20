import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Database,
  Keyboard,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RestaurantLayout } from '../RestaurantLayout';
import { useAuth } from '../../app/providers/AuthProvider';
import { apiFetch, isConnectivityError } from '../../services/api';
import { useToast } from '../../components/Toast';
import { getActiveIntlLocale } from '../../i18n';
import { formatFcfa, getPaymentMethodLabel } from '../../utils/format';
import { executeThermalPrint } from '../../utils/thermalPrint';
import {
  attachPaymentToOfflineOrder,
  listOfflineQueue,
  loadPosSnapshot,
  putOfflineQueueEntry,
  removeOfflineQueueEntry,
  savePosSnapshot,
  type OfflineCreateOrderEntry,
  type OfflinePayOrderEntry,
  type OfflineQueueEntry,
} from './posOfflineDb';
import { syncOfflinePosQueue } from './posOfflineSync';
import type {
  DiningTable,
  MenuCategory,
  MenuItem,
  Order,
  PaymentMethod,
} from '../../types';

interface CartLine {
  key: string;
  menuItem: MenuItem;
  optionIds: string[];
  optionsLabel: string;
  optionsDeltaXof: number;
  quantity: number;
  notes: string;
}

function formatCacheTime(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString(getActiveIntlLocale(), {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function PosPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || 'default';

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const wasOnlineRef = useRef(isOnline);

  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableId, setTableId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [discountXof, setDiscountXof] = useState<number>(0);
  const [cart, setCart] = useState<CartLine[]>([]);

  const [payModalOrder, setPayModalOrder] = useState<Order | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [receipt, setReceipt] = useState<{
    orderNumber: string;
    totalXof: number;
    paidAmount: number;
    method: PaymentMethod;
    reference: string;
    offlinePending?: boolean;
    tableLabel?: string | null;
    customerName?: string;
    items?: Array<{ name: string; quantity: number; lineTotalXof?: number }>;
  } | null>(null);
  const [printingThermal, setPrintingThermal] = useState(false);
  const [busy, setBusy] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const customerInputRef = useRef<HTMLInputElement | null>(null);

  const refreshQueue = useCallback(async () => {
    const entries = await listOfflineQueue(restaurantId);
    setOfflineQueue(entries);
    return entries;
  }, [restaurantId]);

  const fetchOnlineData = useCallback(async () => {
    const [m, tRes, o] = await Promise.all([
      apiFetch<{ categories: MenuCategory[]; items: MenuItem[] }>(
        '/api/restaurant/menu',
      ),
      apiFetch<{ tables: DiningTable[] }>('/api/restaurant/tables'),
      apiFetch<{ orders: Order[] }>('/api/restaurant/orders'),
    ]);

    const availableItems = m.items.filter((i) => i.available);
    const activeOrders = o.orders.filter(
      (ord) => ord.status !== 'PAID' && ord.status !== 'CANCELLED',
    );
    const now = new Date().toISOString();

    setCategories(m.categories);
    setItems(availableItems);
    setTables(tRes.tables);
    setOpenOrders(activeOrders);
    setIsOnline(true);
    wasOnlineRef.current = true;
    setCachedAt(now);

    await savePosSnapshot({
      restaurantId,
      categories: m.categories,
      items: availableItems,
      tables: tRes.tables,
      openOrders: activeOrders,
      updatedAt: now,
    });
  }, [restaurantId]);

  const runSync = useCallback(
    async (includeFailed = false) => {
      if (syncingRef.current) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return;
      }

      const currentQueue = await listOfflineQueue(restaurantId);
      const hasWork = currentQueue.some(
        (entry) => includeFailed || entry.status === 'PENDING',
      );
      if (!hasWork) return;

      syncingRef.current = true;
      setSyncing(true);
      try {
        const res = await syncOfflinePosQueue(restaurantId, { includeFailed });
        await refreshQueue();

        if (res.syncedCount > 0) {
          await fetchOnlineData().catch(() => {});
          notify(t('pos.toastSynced', { count: res.syncedCount }), 'success');
        }

        if (res.abortedOffline) {
          wasOnlineRef.current = false;
          setIsOnline(false);
        } else if (res.failedCount > 0) {
          notify(t('pos.toastSyncErrors', { count: res.failedCount }), 'error');
        }
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    },
    [fetchOnlineData, notify, refreshQueue, restaurantId, t],
  );

  const loadData = useCallback(async () => {
    try {
      await fetchOnlineData();
      const pending = await refreshQueue();
      if (pending.some((e) => e.status === 'PENDING')) {
        void runSync(false);
      }
    } catch (err) {
      if (isConnectivityError(err)) {
        if (wasOnlineRef.current) {
          notify(t('pos.toastDroppedOffline'), 'info');
        }
        wasOnlineRef.current = false;
        setIsOnline(false);
      }
    }
  }, [fetchOnlineData, notify, refreshQueue, runSync, t]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [snapshot, queueEntries] = await Promise.all([
        loadPosSnapshot(restaurantId),
        listOfflineQueue(restaurantId),
      ]);
      if (!active) return;

      if (snapshot) {
        setCategories(snapshot.categories);
        setItems(snapshot.items);
        setTables(snapshot.tables);
        setOpenOrders(snapshot.openOrders);
        setCachedAt(snapshot.updatedAt);
      }
      setOfflineQueue(queueEntries);
      await loadData();
    })();

    return () => {
      active = false;
    };
  }, [loadData, restaurantId]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      wasOnlineRef.current = true;
      notify(t('pos.toastReconnected'), 'info');
      void loadData();
    };

    const handleOffline = () => {
      if (wasOnlineRef.current) {
        notify(t('pos.toastOfflineMode'), 'info');
      }
      wasOnlineRef.current = false;
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadData, notify, t]);

  const pendingCount = useMemo(
    () => offlineQueue.filter((e) => e.status === 'PENDING').length,
    [offlineQueue],
  );
  const failedCount = useMemo(
    () => offlineQueue.filter((e) => e.status === 'FAILED').length,
    [offlineQueue],
  );

  useEffect(() => {
    if (isOnline && pendingCount === 0) return;

    const timer = window.setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return;
      }
      void loadData();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [isOnline, loadData, pendingCount]);

  const addToCart = (item: MenuItem) => {
    const key = item.id;
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          key,
          menuItem: item,
          optionIds: [],
          optionsLabel: '',
          optionsDeltaXof: 0,
          quantity: 1,
          notes: '',
        },
      ];
    });
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.key === key ? { ...c, quantity: c.quantity + delta } : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const grossTotal = cart.reduce(
    (acc, c) =>
      acc + (c.menuItem.priceXof + c.optionsDeltaXof) * c.quantity,
    0,
  );
  const netTotal = Math.max(0, grossTotal - Math.max(0, discountXof));

  const persistOrderOffline = async (
    idempotencyKey: string,
    payImmediately: boolean,
  ) => {
    const resolvedTableId =
      orderType === 'DINE_IN' && tableId ? tableId : null;
    const selectedTable = resolvedTableId
      ? tables.find((tbl) => tbl.id === resolvedTableId) || null
      : null;
    const resolvedCustomer =
      customerName.trim() ||
      (orderType === 'TAKEAWAY'
        ? t('pos.defaultTakeawayCustomer')
        : t('pos.defaultDineInCustomer'));
    const shortCode = Math.floor(100 + Math.random() * 900);
    const localOrderNumber = `HL-${shortCode}-${idempotencyKey.slice(-4).toUpperCase()}`;
    const localId = `offline-${idempotencyKey}`;

    const entry: OfflineCreateOrderEntry = {
      localId,
      restaurantId,
      kind: 'CREATE_ORDER',
      localOrderNumber,
      payload: {
        orderType,
        tableId: resolvedTableId,
        customerName: resolvedCustomer,
        discountXof: Math.max(0, discountXof),
        idempotencyKey,
        items: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          optionIds: c.optionIds,
          quantity: c.quantity,
          notes: c.notes,
        })),
      },
      preview: {
        tableLabel: selectedTable
          ? `${selectedTable.label} (${selectedTable.zone})`
          : null,
        customerName: resolvedCustomer,
        totalXof: netTotal,
        itemsSummary: cart.map((c) => ({
          name: c.menuItem.name,
          quantity: c.quantity,
          lineTotalXof: (c.menuItem.priceXof + c.optionsDeltaXof) * c.quantity,
        })),
      },
      pendingPayment: null,
      status: 'PENDING',
      attempts: 0,
      lastError: null,
      createdAt: new Date().toISOString(),
    };

    await putOfflineQueueEntry(entry);
    await refreshQueue();

    setCart([]);
    setDiscountXof(0);
    setCustomerName('');
    notify(
      t('pos.toastSavedOffline', { orderNumber: localOrderNumber }),
      'info',
    );

    if (payImmediately) {
      setPayModalOrder({
        id: entry.localId,
        restaurantId,
        orderNumber: entry.localOrderNumber,
        orderType: entry.payload.orderType,
        tableId: entry.payload.tableId,
        tableLabel: entry.preview.tableLabel,
        customerName: entry.preview.customerName,
        status: 'PENDING',
        subtotalXof: netTotal,
        discountXof: entry.payload.discountXof,
        taxXof: 0,
        totalXof: netTotal,
        paidXof: 0,
        notes: '',
        createdByUserId: null,
        createdAt: entry.createdAt,
        updatedAt: entry.createdAt,
        items: [],
      });
      setPayAmount(netTotal);
    }
  };

  const submitOrder = async (payImmediately: boolean) => {
    if (cart.length === 0) return;
    setBusy(true);
    const idempotencyKey = `pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    try {
      if (!isOnline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        await persistOrderOffline(idempotencyKey, payImmediately);
        return;
      }

      const res = await apiFetch<{
        order: { id: string; orderNumber: string; totalXof: number };
      }>('/api/restaurant/orders', {
        method: 'POST',
        body: JSON.stringify({
          orderType,
          tableId: orderType === 'DINE_IN' && tableId ? tableId : null,
          customerName:
            customerName.trim() ||
            (orderType === 'TAKEAWAY'
              ? t('pos.defaultTakeawayCustomer')
              : t('pos.defaultDineInCustomer')),
          discountXof: Math.max(0, discountXof),
          idempotencyKey,
          items: cart.map((c) => ({
            menuItemId: c.menuItem.id,
            optionIds: c.optionIds,
            quantity: c.quantity,
            notes: c.notes,
          })),
        }),
      });

      const submittedItems = cart.map((c) => ({
        name: c.menuItem.name,
        quantity: c.quantity,
        lineTotalXof: (c.menuItem.priceXof + c.optionsDeltaXof) * c.quantity,
      }));
      const selectedTbl =
        orderType === 'DINE_IN' && tableId
          ? tables.find((tbl) => tbl.id === tableId)
          : null;

      setCart([]);
      setDiscountXof(0);
      setCustomerName('');
      notify(
        t('pos.toastSentKitchen', { orderNumber: res.order.orderNumber }),
        'success',
      );
      void loadData();

      if (payImmediately) {
        setPayModalOrder({
          id: res.order.id,
          orderNumber: res.order.orderNumber,
          totalXof: res.order.totalXof,
          paidXof: 0,
          tableLabel: selectedTbl ? selectedTbl.label : null,
          customerName: customerName.trim() || undefined,
          items: submittedItems.map((si, idx) => ({
            id: `tmp-${idx}`,
            orderId: res.order.id,
            menuItemId: '',
            name: si.name,
            station: 'KITCHEN',
            unitPriceXof: si.lineTotalXof,
            optionsSummary: '',
            optionsDeltaXof: 0,
            quantity: si.quantity,
            lineTotalXof: si.lineTotalXof,
            notes: '',
            prepStatus: 'PENDING',
          })),
        } as Order);
        setPayAmount(res.order.totalXof);
      }
    } catch (err) {
      if (isConnectivityError(err)) {
        wasOnlineRef.current = false;
        setIsOnline(false);
        await persistOrderOffline(idempotencyKey, payImmediately);
      } else {
        notify(
          err instanceof Error ? err.message : t('pos.orderCreateError'),
          'error',
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const persistPaymentOffline = async (
    targetOrder: Order,
    idempotencyKey: string,
  ) => {
    const offlineRef = `HL-${payMethod.slice(0, 4)}-${Math.floor(100000 + Math.random() * 900000)}`;

    if (targetOrder.id.startsWith('offline-')) {
      await attachPaymentToOfflineOrder(targetOrder.id, {
        amountXof: payAmount,
        method: payMethod,
        idempotencyKey,
        reference: offlineRef,
        paidAt: new Date().toISOString(),
      });
    } else {
      const entry: OfflinePayOrderEntry = {
        localId: `offline-pay-${idempotencyKey}`,
        restaurantId,
        kind: 'PAY_ORDER',
        targetOrderId: targetOrder.id,
        targetOrderNumber: targetOrder.orderNumber,
        payload: {
          amountXof: payAmount,
          method: payMethod,
          idempotencyKey,
        },
        reference: offlineRef,
        status: 'PENDING',
        attempts: 0,
        lastError: null,
        createdAt: new Date().toISOString(),
      };
      await putOfflineQueueEntry(entry);
    }

    await refreshQueue();
    notify(
      t('pos.toastPaidOffline', {
        amount: formatFcfa(payAmount),
        ref: offlineRef,
      }),
      'info',
    );
    setReceipt({
      orderNumber: targetOrder.orderNumber,
      totalXof: targetOrder.totalXof,
      paidAmount: payAmount,
      method: payMethod,
      reference: offlineRef,
      offlinePending: true,
      tableLabel: targetOrder.tableLabel,
      customerName: targetOrder.customerName,
      items: targetOrder.items?.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        lineTotalXof: it.lineTotalXof,
      })),
    });
    setPayModalOrder(null);
  };

  const handlePayOrder = async () => {
    if (!payModalOrder) return;
    setBusy(true);
    const idempotencyKey = `pay-${payModalOrder.id}-${Date.now()}`;

    try {
      if (
        payModalOrder.id.startsWith('offline-') ||
        !isOnline ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
      ) {
        await persistPaymentOffline(payModalOrder, idempotencyKey);
        return;
      }

      const res = await apiFetch<{
        payment: {
          amountXof: number;
          method: PaymentMethod;
          reference: string;
          fullyPaid: boolean;
        };
      }>(`/api/restaurant/orders/${payModalOrder.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          amountXof: payAmount,
          method: payMethod,
          idempotencyKey,
        }),
      });

      notify(
        t('pos.toastPaidOnline', {
          amount: formatFcfa(res.payment.amountXof),
          ref: res.payment.reference,
        }),
        'success',
      );
      setReceipt({
        orderNumber: payModalOrder.orderNumber,
        totalXof: payModalOrder.totalXof,
        paidAmount: res.payment.amountXof,
        method: res.payment.method,
        reference: res.payment.reference,
        tableLabel: payModalOrder.tableLabel,
        customerName: payModalOrder.customerName,
        items: payModalOrder.items?.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          lineTotalXof: it.lineTotalXof,
        })),
      });
      setPayModalOrder(null);
      void loadData();
    } catch (err) {
      if (isConnectivityError(err)) {
        wasOnlineRef.current = false;
        setIsOnline(false);
        await persistPaymentOffline(payModalOrder, idempotencyKey);
      } else {
        notify(
          err instanceof Error ? err.message : t('pos.paymentError'),
          'error',
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteOfflineEntry = async (localId: string) => {
    await removeOfflineQueueEntry(localId);
    await refreshQueue();
    notify(t('pos.toastRemovedOffline'), 'info');
  };

  const pendingPayTotalsByOrderId = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of offlineQueue) {
      if (entry.kind === 'PAY_ORDER') {
        map.set(
          entry.targetOrderId,
          (map.get(entry.targetOrderId) || 0) + entry.payload.amountXof,
        );
      }
    }
    return map;
  }, [offlineQueue]);

  const offlineOrders = useMemo(
    () =>
      offlineQueue.filter(
        (e): e is OfflineCreateOrderEntry => e.kind === 'CREATE_ORDER',
      ),
    [offlineQueue],
  );

  const offlinePayments = useMemo(
    () =>
      offlineQueue.filter(
        (e): e is OfflinePayOrderEntry => e.kind === 'PAY_ORDER',
      ),
    [offlineQueue],
  );

  const filteredItems = items.filter((it) => {
    const matchCat = selectedCat === 'ALL' || it.categoryId === selectedCat;
    const matchSearch = it.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleNewCustomerShortcut = useCallback(() => {
    setPayModalOrder(null);
    setReceipt(null);
    setCart([]);
    setDiscountXof(0);
    setTableId('');
    setCustomerName('');
    setOrderType('DINE_IN');
    notify(t('pos.toastNewCustomerReady'), 'info');
    window.setTimeout(() => {
      customerInputRef.current?.focus();
    }, 0);
  }, [notify, t]);

  const handleCancelShortcut = useCallback(() => {
    if (payModalOrder) {
      setPayModalOrder(null);
      return;
    }
    if (receipt) {
      setReceipt(null);
      return;
    }
    if (cart.length > 0 || customerName || discountXof > 0 || tableId) {
      setCart([]);
      setDiscountXof(0);
      setCustomerName('');
      setTableId('');
      notify(t('pos.toastTicketCancelled'), 'info');
    }
  }, [
    cart.length,
    customerName,
    discountXof,
    notify,
    payModalOrder,
    receipt,
    t,
    tableId,
  ]);

  const shortcutHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  shortcutHandlerRef.current = (e: KeyboardEvent) => {
    const key = e.key;
    const target = e.target as HTMLElement | null;
    const isTypingInField =
      target !== null &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable);

    if (key === 'F1') {
      e.preventDefault();
      handleNewCustomerShortcut();
      return;
    }

    if (key === 'F2') {
      e.preventDefault();
      if (busy) return;
      if (payModalOrder) {
        if (payAmount > 0) {
          void handlePayOrder();
        }
        return;
      }
      if (cart.length > 0) {
        void submitOrder(true);
      }
      return;
    }

    if (key === 'F3') {
      e.preventDefault();
      handleCancelShortcut();
      return;
    }

    if (key === 'F4') {
      e.preventDefault();
      if (!busy && !payModalOrder && cart.length > 0) {
        void submitOrder(false);
      }
      return;
    }

    if (key === 'Escape') {
      if (payModalOrder || receipt) {
        e.preventDefault();
        setPayModalOrder(null);
        setReceipt(null);
      }
      return;
    }

    if (key === '/' && !isTypingInField && !payModalOrder && !receipt) {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  };

  useEffect(() => {
    const listener = (e: KeyboardEvent) => shortcutHandlerRef.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  return (
    <RestaurantLayout title={t('pos.title')} onRealtimeEvent={loadData}>
      {/* Keyboard Shortcuts Bar */}
      <div
        data-testid="pos-shortcuts-bar"
        className="mb-4 px-3.5 py-2.5 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--rm-ink-muted)]"
      >
        <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--rm-ink)]">
          <Keyboard className="w-3.5 h-3.5 text-[#FF8738]" />
          {t('pos.shortcutsBarLabel')}
        </span>
        <button
          type="button"
          onClick={handleNewCustomerShortcut}
          className="inline-flex items-center gap-1.5 hover:text-[var(--rm-ink)] cursor-pointer"
        >
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--rm-surface-muted)] border border-[var(--rm-border)] font-mono text-[11px] font-bold text-[var(--rm-ink)]">
            F1
          </kbd>
          <span>{t('pos.shortcutNewClient')}</span>
        </button>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--rm-surface-muted)] border border-[var(--rm-border)] font-mono text-[11px] font-bold text-[var(--rm-ink)]">
            F2
          </kbd>
          <span>{t('pos.shortcutValidate')}</span>
        </span>
        <button
          type="button"
          onClick={handleCancelShortcut}
          className="inline-flex items-center gap-1.5 hover:text-[var(--rm-ink)] cursor-pointer"
        >
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--rm-surface-muted)] border border-[var(--rm-border)] font-mono text-[11px] font-bold text-[var(--rm-ink)]">
            F3
          </kbd>
          <span>{t('pos.shortcutCancel')}</span>
        </button>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--rm-surface-muted)] border border-[var(--rm-border)] font-mono text-[11px] font-bold text-[var(--rm-ink)]">
            F4
          </kbd>
          <span>{t('pos.shortcutKitchen')}</span>
        </span>
        <span className="hidden sm:inline-flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--rm-surface-muted)] border border-[var(--rm-border)] font-mono text-[11px] font-bold text-[var(--rm-ink)]">
            /
          </kbd>
          <span>{t('pos.shortcutSearch')}</span>
        </span>
      </div>

      {/* Offline / Pending Queue Banner */}
      {(!isOnline || offlineQueue.length > 0) && (
        <div
          className={`mb-5 rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
            !isOnline
              ? 'bg-[#FF8738]/10 border-[#FF8738]/40 text-[var(--rm-ink)]'
              : failedCount > 0
                ? 'bg-[#E05252]/10 border-[#E05252]/40 text-[var(--rm-ink)]'
                : 'bg-[#14B8A6]/10 border-[#14B8A6]/40 text-[var(--rm-ink)]'
          }`}
        >
          <div className="flex items-start gap-3">
            {!isOnline ? (
              <WifiOff className="w-5 h-5 text-[#FF8738] shrink-0 mt-0.5" />
            ) : failedCount > 0 ? (
              <AlertTriangle className="w-5 h-5 text-[#E05252] shrink-0 mt-0.5" />
            ) : (
              <CloudUpload className="w-5 h-5 text-[#14B8A6] shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-sm">
                {!isOnline
                  ? t('pos.offlineBannerTitle')
                  : t('pos.pendingBannerTitle', { count: offlineQueue.length })}
              </p>
              <p className="text-[var(--rm-ink-muted)]">
                {cachedAt
                  ? t('pos.cachedAt', { time: formatCacheTime(cachedAt) })
                  : t('pos.cacheReady')}
                {pendingCount > 0 &&
                  t('pos.pendingAutoSend', { count: pendingCount })}
                {failedCount > 0 && t('pos.failedCount', { count: failedCount })}
              </p>
            </div>
          </div>

          {isOnline && offlineQueue.length > 0 && (
            <button
              type="button"
              disabled={syncing}
              onClick={() => void runSync(true)}
              className="px-3.5 py-2 rounded-lg bg-[#182333] dark:bg-[#FF8738] hover:bg-[#223044] dark:hover:bg-[#F07322] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 shrink-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`}
              />
              <span>{syncing ? t('pos.syncing') : t('pos.syncNow')}</span>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Catalog + Offline Queue + Open Bills */}
        <div className="lg:col-span-8 space-y-5">
          {/* Search & Category Tabs */}
          <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[var(--rm-ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('pos.searchPlaceholder')}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-ink)] placeholder:text-[var(--rm-ink-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
                />
              </div>
              {cachedAt && (
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[var(--rm-ink-muted)] px-2.5 py-1.5 rounded-lg bg-[var(--rm-surface-muted)] border border-[var(--rm-border)] shrink-0">
                  <Database className="w-3.5 h-3.5 text-[#14B8A6]" />
                  <span>
                    {t('pos.cacheChip', { time: formatCacheTime(cachedAt) })}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCat('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCat === 'ALL'
                    ? 'bg-[#182333] dark:bg-[#FF8738] text-white'
                    : 'bg-[var(--rm-surface-muted)] text-[var(--rm-ink-muted)] hover:text-[var(--rm-ink)]'
                }`}
              >
                {t('pos.allMenu')}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCat(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedCat === c.id
                      ? 'bg-[#182333] dark:bg-[#FF8738] text-white'
                      : 'bg-[var(--rm-surface-muted)] text-[var(--rm-ink-muted)] hover:text-[var(--rm-ink)]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {filteredItems.length === 0 ? (
            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-8 text-center text-xs text-[var(--rm-ink-muted)]">
              {items.length === 0 && !isOnline
                ? t('pos.emptyOfflineCatalog')
                : t('pos.emptySearchCatalog')}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredItems.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => addToCart(it)}
                  className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] hover:border-[#FF8738] p-4 text-left transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <p className="text-xs text-[var(--rm-ink-muted)]">
                      {it.categoryName}
                    </p>
                    <p className="mt-1 font-bold text-sm text-[var(--rm-ink)] line-clamp-2">
                      {it.name}
                    </p>
                  </div>
                  <p className="mt-3 text-sm font-extrabold text-[#FF8738] tabular-nums">
                    {formatFcfa(it.priceXof)}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Queued Offline Orders & Payments */}
          {offlineQueue.length > 0 && (
            <div className="bg-[var(--rm-surface)] rounded-xl border border-[#FF8738]/40 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[var(--rm-ink)]">
                  {t('pos.offlineQueueTitle', { count: offlineQueue.length })}
                </h2>
                <span className="text-[11px] font-semibold text-[#FF8738]">
                  {t('pos.indexedDbStorage')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {offlineOrders.map((ord) => (
                  <div
                    key={ord.localId}
                    className="p-3.5 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-muted)] flex flex-col justify-between gap-2.5"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-xs font-bold text-[var(--rm-ink)]">
                          {ord.localOrderNumber} ·{' '}
                          {ord.preview.tableLabel || ord.preview.customerName}
                        </p>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            ord.status === 'FAILED'
                              ? 'bg-[#E05252]/15 text-[#E05252]'
                              : 'bg-[#FF8738]/15 text-[#FF8738]'
                          }`}
                        >
                          {ord.status === 'FAILED'
                            ? t('pos.toVerify')
                            : t('pos.pendingStatus')}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--rm-ink-muted)] line-clamp-1">
                        {ord.preview.itemsSummary
                          .map((i) => `${i.quantity}× ${i.name}`)
                          .join(', ')}
                      </p>
                      <p className="text-xs text-[var(--rm-ink)] font-bold tabular-nums">
                        {formatFcfa(ord.preview.totalXof)}
                        {ord.pendingPayment && (
                          <span className="ml-2 text-[11px] font-semibold text-[#14B8A6]">
                            {t('pos.paidBadge', {
                              method: getPaymentMethodLabel(
                                ord.pendingPayment.method,
                              ),
                            })}
                          </span>
                        )}
                      </p>
                      {ord.lastError && (
                        <p className="text-[11px] text-[#E05252]">
                          {ord.lastError}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {!ord.pendingPayment && ord.status !== 'FAILED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayModalOrder({
                              id: ord.localId,
                              restaurantId,
                              orderNumber: ord.localOrderNumber,
                              orderType: ord.payload.orderType,
                              tableId: ord.payload.tableId,
                              tableLabel: ord.preview.tableLabel,
                              customerName: ord.preview.customerName,
                              status: 'PENDING',
                              subtotalXof: ord.preview.totalXof,
                              discountXof: ord.payload.discountXof,
                              taxXof: 0,
                              totalXof: ord.preview.totalXof,
                              paidXof: 0,
                              notes: '',
                              createdByUserId: null,
                              createdAt: ord.createdAt,
                              updatedAt: ord.createdAt,
                              items: [],
                            });
                            setPayAmount(ord.preview.totalXof);
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#182333] dark:bg-[#223044] hover:bg-[#FF8738] text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {t('pos.collectBtn')}
                        </button>
                      )}
                      {ord.status === 'FAILED' && (
                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteOfflineEntry(ord.localId)
                          }
                          className="py-1.5 px-2.5 rounded-lg border border-[#E05252]/40 text-[#E05252] hover:bg-[#E05252]/10 text-xs font-semibold cursor-pointer"
                        >
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {offlinePayments.map((pay) => (
                  <div
                    key={pay.localId}
                    className="p-3.5 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-muted)] flex flex-col justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-xs font-bold text-[var(--rm-ink)]">
                          {t('pos.offlinePayLabel', {
                            orderNumber: pay.targetOrderNumber,
                          })}
                        </p>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            pay.status === 'FAILED'
                              ? 'bg-[#E05252]/15 text-[#E05252]'
                              : 'bg-[#14B8A6]/15 text-[#14B8A6]'
                          }`}
                        >
                          {pay.status === 'FAILED'
                            ? t('pos.syncErrorStatus')
                            : t('pos.paymentPendingStatus')}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[var(--rm-ink)] tabular-nums">
                        {formatFcfa(pay.payload.amountXof)} ·{' '}
                        {getPaymentMethodLabel(pay.payload.method)}
                      </p>
                      {pay.lastError && (
                        <p className="text-[11px] text-[#E05252]">
                          {pay.lastError}
                        </p>
                      )}
                    </div>
                    {pay.status === 'FAILED' && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleDeleteOfflineEntry(pay.localId)
                        }
                        className="self-start py-1 px-2.5 rounded-lg border border-[#E05252]/40 text-[#E05252] hover:bg-[#E05252]/10 text-xs font-semibold cursor-pointer"
                      >
                        {t('common.delete')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open Bills Ready to Settle */}
          {openOrders.length > 0 && (
            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
              <h2 className="text-sm font-bold text-[var(--rm-ink)] mb-3">
                {t('pos.openBillsTitle')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {openOrders.map((ord) => {
                  const queuedPay = pendingPayTotalsByOrderId.get(ord.id) || 0;
                  const due = Math.max(0, ord.totalXof - ord.paidXof - queuedPay);
                  return (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-muted)] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-[var(--rm-ink)]">
                          {ord.orderNumber} ·{' '}
                          {ord.tableLabel || ord.customerName}
                        </p>
                        <p className="text-xs text-[var(--rm-ink-muted)] mt-0.5 tabular-nums">
                          {t('pos.remainingDue')}
                          <strong>{formatFcfa(due)}</strong> /{' '}
                          {formatFcfa(ord.totalXof)}
                        </p>
                        {queuedPay > 0 && (
                          <p className="text-[11px] text-[#14B8A6] font-semibold mt-0.5">
                            {t('pos.queuedPayNotice', {
                              amount: formatFcfa(queuedPay),
                            })}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={due <= 0}
                        onClick={() => {
                          setPayModalOrder({
                            ...ord,
                            paidXof: ord.paidXof + queuedPay,
                          });
                          setPayAmount(due);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#182333] dark:bg-[#223044] hover:bg-[#FF8738] dark:hover:bg-[#FF8738] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                      >
                        {due <= 0 ? t('pos.pendingWaitBtn') : t('pos.collectBtn')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Active Ticket Cart */}
        <div className="lg:col-span-4">
          <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 sticky top-20 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--rm-ink)]">
                {t('pos.newTicketTitle')}
              </h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-[#E05252] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('pos.clearCart')}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderType('DINE_IN')}
                className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  orderType === 'DINE_IN'
                    ? 'bg-[#182333] dark:bg-[#FF8738] text-white'
                    : 'bg-[var(--rm-surface-muted)] text-[var(--rm-ink-muted)] hover:text-[var(--rm-ink)]'
                }`}
              >
                {t('common.dineIn')}
              </button>
              <button
                type="button"
                onClick={() => setOrderType('TAKEAWAY')}
                className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  orderType === 'TAKEAWAY'
                    ? 'bg-[#182333] dark:bg-[#FF8738] text-white'
                    : 'bg-[var(--rm-surface-muted)] text-[var(--rm-ink-muted)] hover:text-[var(--rm-ink)]'
                }`}
              >
                {t('common.takeaway')}
              </button>
            </div>

            {orderType === 'DINE_IN' && (
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border)] text-xs bg-[var(--rm-surface)] text-[var(--rm-ink)]"
              >
                <option value="">{t('pos.selectTableOptional')}</option>
                {tables.map((tbl) => (
                  <option key={tbl.id} value={tbl.id}>
                    {tbl.label} ({tbl.zone})
                  </option>
                ))}
              </select>
            )}

            <input
              ref={customerInputRef}
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t('pos.customerNameOptional')}
              className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-ink)] placeholder:text-[var(--rm-ink-muted)] text-xs"
            />

            <div className="border-t border-b border-[var(--rm-border-subtle)] py-3 max-h-64 overflow-y-auto space-y-2.5">
              {cart.length === 0 ? (
                <p className="text-xs text-[var(--rm-ink-muted)] text-center py-6">
                  {t('pos.cartEmptyHint')}
                </p>
              ) : (
                cart.map((c) => (
                  <div
                    key={c.key}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[var(--rm-ink)] truncate">
                        {c.menuItem.name}
                      </p>
                      <p className="text-[var(--rm-ink-muted)] tabular-nums">
                        {formatFcfa(c.menuItem.priceXof)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQty(c.key, -1)}
                        className="w-6 h-6 rounded border border-[var(--rm-border)] flex items-center justify-center hover:bg-[var(--rm-surface-hover)] text-[var(--rm-ink)] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-[var(--rm-ink)] tabular-nums">
                        {c.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(c.key, 1)}
                        className="w-6 h-6 rounded border border-[var(--rm-border)] flex items-center justify-center hover:bg-[var(--rm-surface-hover)] text-[var(--rm-ink)] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--rm-ink-muted)]">
                  {t('pos.discountLabel')}
                </span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={discountXof}
                  onChange={(e) => setDiscountXof(Number(e.target.value) || 0)}
                  className="w-28 px-2 py-1 rounded border border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-right tabular-nums"
                />
              </div>
              <div className="flex items-center justify-between text-base font-extrabold text-[var(--rm-ink)] pt-2 border-t border-[var(--rm-border-subtle)]">
                <span>{t('common.totalTtc')}</span>
                <span className="tabular-nums">{formatFcfa(netTotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                disabled={busy || cart.length === 0}
                onClick={() => submitOrder(true)}
                className="w-full py-2.5 px-3 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <span>
                  {isOnline
                    ? t('pos.sendAndPayOnline')
                    : t('pos.saveAndPayOffline')}
                </span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/20 font-mono text-[10px]">
                  F2
                </kbd>
              </button>
              <button
                type="button"
                disabled={busy || cart.length === 0}
                onClick={() => submitOrder(false)}
                className="w-full py-2.5 px-3 rounded-lg bg-[#182333] hover:bg-[#223044] dark:bg-[#223044] dark:hover:bg-[#2D4059] dark:border dark:border-[var(--rm-border)] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <span>
                  {isOnline
                    ? t('pos.sendToKitchenOnline')
                    : t('pos.saveOfflineOpenTab')}
                </span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/15 font-mono text-[10px]">
                  F4
                </kbd>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {payModalOrder && (
        <div className="fixed inset-0 z-50 bg-[#0B1220]/70 flex items-center justify-center p-4">
          <div className="bg-[var(--rm-surface)] rounded-2xl border border-[var(--rm-border)] max-w-md w-full p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-[#FF8738]">
                {payModalOrder.id.startsWith('offline-') || !isOnline
                  ? t('pos.payModalOfflineSub')
                  : t('pos.payModalOnlineSub')}
              </p>
              <h3 className="text-lg font-bold text-[var(--rm-ink)] mt-1">
                {t('pos.payModalOrderTitle', {
                  orderNumber: payModalOrder.orderNumber,
                })}
              </h3>
              <p className="text-xs text-[var(--rm-ink-muted)] mt-1 tabular-nums">
                {t('pos.payModalTotals', {
                  total: formatFcfa(payModalOrder.totalXof),
                  paid: formatFcfa(payModalOrder.paidXof),
                })}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('pos.payAmountLabel')}
              </label>
              <input
                type="number"
                min={100}
                max={Math.max(0, payModalOrder.totalXof - payModalOrder.paidXof)}
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-base font-bold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-2">
                {t('pos.payMethodLabel')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    'CASH',
                    'WAVE',
                    'ORANGE_MONEY',
                    'MTN_MOMO',
                    'CARD',
                  ] as PaymentMethod[]
                ).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayMethod(m)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                      payMethod === m
                        ? 'bg-[#182333] dark:bg-[#FF8738] text-white border-[#182333] dark:border-[#FF8738]'
                        : 'bg-[var(--rm-surface)] text-[var(--rm-ink)] border-[var(--rm-border)] hover:bg-[var(--rm-surface-hover)]'
                    }`}
                  >
                    {getPaymentMethodLabel(m)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPayModalOrder(null)}
                className="flex-1 py-2.5 rounded-lg border border-[var(--rm-border-input)] text-xs font-semibold text-[var(--rm-ink)] hover:bg-[var(--rm-surface-hover)] cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <span>{t('common.cancel')}</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--rm-surface-muted)] border border-[var(--rm-border)] font-mono text-[10px]">
                  F3
                </kbd>
              </button>
              <button
                type="button"
                disabled={busy || payAmount <= 0}
                onClick={handlePayOrder}
                className="flex-1 py-2.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <span>{t('pos.confirmPaymentBtn')}</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/20 font-mono text-[10px]">
                  F2
                </kbd>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 z-50 bg-[#0B1220]/70 flex items-center justify-center p-4">
          <div className="bg-[var(--rm-surface)] rounded-2xl border border-[var(--rm-border)] max-w-sm w-full p-6 space-y-4">
            <div className="text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-[#14B8A6] mx-auto" />
              <h3 className="text-base font-bold text-[var(--rm-ink)]">
                {t('pos.receiptTitle')}
              </h3>
              <p className="text-xs font-mono text-[var(--rm-ink-muted)]">
                {t('pos.receiptRef', { ref: receipt.reference })}
              </p>
              {receipt.offlinePending && (
                <p className="text-[11px] font-semibold text-[#FF8738]">
                  {t('pos.receiptOfflineNote')}
                </p>
              )}
            </div>
            <div className="border-t border-b border-dashed border-[var(--rm-border-input)] py-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--rm-ink-muted)]">
                  {t('pos.receiptOrder')}
                </span>
                <span className="font-mono font-bold text-[var(--rm-ink)]">
                  {receipt.orderNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--rm-ink-muted)]">
                  {t('pos.receiptMethod')}
                </span>
                <span className="text-[var(--rm-ink)]">
                  {getPaymentMethodLabel(receipt.method)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--rm-ink-muted)]">
                  {t('pos.receiptPaidAmount')}
                </span>
                <span className="font-bold text-[var(--rm-ink)] tabular-nums">
                  {formatFcfa(receipt.paidAmount)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 no-print">
              <button
                type="button"
                data-testid="pos-thermal-print-btn"
                disabled={printingThermal}
                onClick={async () => {
                  setPrintingThermal(true);
                  try {
                    const out = await executeThermalPrint({
                      kind: 'RECEIPT',
                      orderNumber: receipt.orderNumber,
                      tableLabel: receipt.tableLabel,
                      customerName: receipt.customerName,
                      paymentMethod: getPaymentMethodLabel(receipt.method),
                      paymentReference: receipt.reference,
                      paidAmountXof: receipt.paidAmount,
                      totalXof: receipt.totalXof,
                      items:
                        receipt.items && receipt.items.length > 0
                          ? receipt.items
                          : [
                              {
                                name: receipt.orderNumber,
                                quantity: 1,
                                lineTotalXof: receipt.totalXof,
                              },
                            ],
                    });
                    if (out.dispatchedVia === 'NETWORK') {
                      notify(
                        t('pos.thermalPrintNetworkSent', {
                          bytes: out.networkResult?.bytesSent || 0,
                        }),
                        'success',
                      );
                    } else if (out.dispatchedVia === 'WEB_SERIAL') {
                      notify(t('pos.thermalPrintUsbSent'), 'success');
                    } else {
                      notify(t('pos.thermalPrintBrowserFallback'), 'info');
                    }
                  } catch (err) {
                    notify(
                      err instanceof Error
                        ? err.message
                        : t('pos.thermalPrintError'),
                      'error',
                    );
                  } finally {
                    setPrintingThermal(false);
                  }
                }}
                className="flex-1 py-2 px-3 rounded-lg border border-[var(--rm-border-input)] text-[var(--rm-ink)] hover:border-[#FF8738] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5 text-[#FF8738]" />
                <span>{t('pos.thermalPrintBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="flex-1 py-2 px-3 rounded-lg bg-[#182333] dark:bg-[#223044] text-white text-xs font-semibold cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}
