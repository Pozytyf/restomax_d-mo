import type { Order, OrderItem, OrderStatus } from '../../types';

export type KdsGroupMode = 'TIME' | 'TABLE' | 'ZONE' | 'NONE';
export type KdsStationFilter = 'ALL' | 'KITCHEN' | 'BAR';
export type KdsStatusFilter = 'ALL' | 'PENDING' | 'IN_PREPARATION' | 'READY';
export type KdsPrepTimeTier = 'CRITICAL' | 'ACTIVE' | 'FRESH';

export interface KdsBatchedItemSummary {
  key: string;
  name: string;
  station: OrderItem['station'];
  optionsSummary: string;
  totalQuantity: number;
}

export interface KdsOrderWithVisibleItems {
  order: Order;
  visibleItems: OrderItem[];
}

export interface KdsOrderGroup {
  groupKey: string;
  title: string;
  subtitle: string | null;
  prepTier: KdsPrepTimeTier;
  oldestCreatedAtMs: number;
  totalItemsCount: number;
  orders: KdsOrderWithVisibleItems[];
  batchSummary: KdsBatchedItemSummary[];
}

export interface KdsPrepTimeBucket {
  tier: KdsPrepTimeTier;
  orders: KdsOrderWithVisibleItems[];
  totalItemsCount: number;
  oldestCreatedAtMs: number | null;
}

export interface KdsGroupingLabels {
  takeawayGroup: string;
  unassignedGroup: string;
  prepTierCritical?: string;
  prepTierActive?: string;
  prepTierFresh?: string;
}

export function getElapsedMinutes(
  createdAt: string,
  nowMs: number = Date.now(),
): number {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return 1;
  return Math.max(1, Math.round((nowMs - createdMs) / 60000));
}

export function getPrepTimeTier(elapsedMinutes: number): KdsPrepTimeTier {
  if (elapsedMinutes >= 15) return 'CRITICAL';
  if (elapsedMinutes >= 5) return 'ACTIVE';
  return 'FRESH';
}

export function filterKdsOrders(
  orders: Order[],
  stationFilter: KdsStationFilter,
  statusFilter: KdsStatusFilter = 'ALL',
): KdsOrderWithVisibleItems[] {
  const filtered: KdsOrderWithVisibleItems[] = [];
  for (const order of orders) {
    if (statusFilter !== 'ALL' && order.status !== statusFilter) {
      continue;
    }
    const visibleItems =
      stationFilter === 'ALL'
        ? order.items
        : order.items.filter((i) => i.station === stationFilter);
    if (visibleItems.length > 0) {
      filtered.push({ order, visibleItems });
    }
  }
  return filtered;
}

export function countKdsStatuses(
  orders: Order[],
  stationFilter: KdsStationFilter,
): Record<'ALL' | 'PENDING' | 'IN_PREPARATION' | 'READY', number> {
  const counts = {
    ALL: 0,
    PENDING: 0,
    IN_PREPARATION: 0,
    READY: 0,
  };
  const visible = filterKdsOrders(orders, stationFilter, 'ALL');
  counts.ALL = visible.length;
  for (const { order } of visible) {
    if (
      order.status === 'PENDING' ||
      order.status === 'IN_PREPARATION' ||
      order.status === 'READY'
    ) {
      counts[order.status as Extract<OrderStatus, 'PENDING' | 'IN_PREPARATION' | 'READY'>] += 1;
    }
  }
  return counts;
}

export function groupKdsOrdersByPrepTime(
  orders: Order[],
  stationFilter: KdsStationFilter,
  statusFilter: KdsStatusFilter = 'ALL',
  nowMs: number = Date.now(),
): KdsPrepTimeBucket[] {
  const filtered = filterKdsOrders(orders, stationFilter, statusFilter);
  const buckets: Record<KdsPrepTimeTier, KdsPrepTimeBucket> = {
    CRITICAL: {
      tier: 'CRITICAL',
      orders: [],
      totalItemsCount: 0,
      oldestCreatedAtMs: null,
    },
    ACTIVE: {
      tier: 'ACTIVE',
      orders: [],
      totalItemsCount: 0,
      oldestCreatedAtMs: null,
    },
    FRESH: {
      tier: 'FRESH',
      orders: [],
      totalItemsCount: 0,
      oldestCreatedAtMs: null,
    },
  };

  for (const entry of filtered) {
    const elapsed = getElapsedMinutes(entry.order.createdAt, nowMs);
    const tier = getPrepTimeTier(elapsed);
    const bucket = buckets[tier];
    const createdMs = new Date(entry.order.createdAt).getTime();
    const validMs = Number.isFinite(createdMs) ? createdMs : nowMs;
    const itemsQty = entry.visibleItems.reduce((sum, it) => sum + it.quantity, 0);

    bucket.orders.push(entry);
    bucket.totalItemsCount += itemsQty;
    if (bucket.oldestCreatedAtMs === null || validMs < bucket.oldestCreatedAtMs) {
      bucket.oldestCreatedAtMs = validMs;
    }
  }

  const orderedTiers: KdsPrepTimeTier[] = ['CRITICAL', 'ACTIVE', 'FRESH'];
  return orderedTiers.map((tier) => {
    const b = buckets[tier];
    b.orders.sort(
      (a, bEntry) =>
        new Date(a.order.createdAt).getTime() -
        new Date(bEntry.order.createdAt).getTime(),
    );
    return b;
  });
}

export function groupKdsOrders(
  orders: Order[],
  stationFilter: KdsStationFilter,
  groupMode: KdsGroupMode,
  labels: KdsGroupingLabels,
  statusFilter: KdsStatusFilter = 'ALL',
  nowMs: number = Date.now(),
): KdsOrderGroup[] {
  const filtered = filterKdsOrders(orders, stationFilter, statusFilter);
  const map = new Map<string, KdsOrderGroup>();

  for (const entry of filtered) {
    const { order, visibleItems } = entry;
    const elapsed = getElapsedMinutes(order.createdAt, nowMs);
    const tier = getPrepTimeTier(elapsed);
    let groupKey: string;
    let title: string;
    let subtitle: string | null = null;

    if (groupMode === 'TIME') {
      groupKey = `time:${tier}`;
      title =
        tier === 'CRITICAL'
          ? labels.prepTierCritical || '≥ 15 min'
          : tier === 'ACTIVE'
            ? labels.prepTierActive || '5–14 min'
            : labels.prepTierFresh || '< 5 min';
      subtitle = null;
    } else if (groupMode === 'NONE') {
      groupKey = `order:${order.id}`;
      title = order.orderNumber;
      subtitle = order.tableLabel || order.customerName;
    } else if (groupMode === 'TABLE') {
      if (order.tableId || order.tableLabel) {
        groupKey = `table:${order.tableId || order.tableLabel}`;
        title = order.tableLabel || order.customerName;
        subtitle = order.tableZone || null;
      } else if (order.orderType === 'TAKEAWAY') {
        groupKey = 'table:TAKEAWAY';
        title = labels.takeawayGroup;
        subtitle = null;
      } else {
        groupKey = 'table:UNASSIGNED';
        title = labels.unassignedGroup;
        subtitle = null;
      }
    } else {
      if (order.tableZone) {
        groupKey = `zone:${order.tableZone}`;
        title = order.tableZone;
      } else if (order.orderType === 'TAKEAWAY') {
        groupKey = 'zone:TAKEAWAY';
        title = labels.takeawayGroup;
      } else {
        groupKey = 'zone:UNASSIGNED';
        title = labels.unassignedGroup;
      }
    }

    const createdMs = new Date(order.createdAt).getTime();
    const validCreatedMs = Number.isFinite(createdMs) ? createdMs : nowMs;
    const itemCount = visibleItems.reduce((sum, it) => sum + it.quantity, 0);

    let group = map.get(groupKey);
    if (!group) {
      group = {
        groupKey,
        title,
        subtitle,
        prepTier: tier,
        oldestCreatedAtMs: validCreatedMs,
        totalItemsCount: 0,
        orders: [],
        batchSummary: [],
      };
      map.set(groupKey, group);
    }

    group.orders.push(entry);
    group.totalItemsCount += itemCount;
    if (validCreatedMs < group.oldestCreatedAtMs) {
      group.oldestCreatedAtMs = validCreatedMs;
      group.prepTier = getPrepTimeTier(
        Math.max(1, Math.round((nowMs - validCreatedMs) / 60000)),
      );
    }
    if (!group.subtitle && order.tableZone && groupMode === 'TABLE') {
      group.subtitle = order.tableZone;
    }
  }

  const groups = Array.from(map.values());

  for (const group of groups) {
    group.orders.sort(
      (a, b) =>
        new Date(a.order.createdAt).getTime() -
        new Date(b.order.createdAt).getTime(),
    );

    const summaryMap = new Map<string, KdsBatchedItemSummary>();
    for (const { visibleItems } of group.orders) {
      for (const item of visibleItems) {
        const key = `${item.station}:${item.name}:${item.optionsSummary || ''}`;
        const existing = summaryMap.get(key);
        if (existing) {
          existing.totalQuantity += item.quantity;
        } else {
          summaryMap.set(key, {
            key,
            name: item.name,
            station: item.station,
            optionsSummary: item.optionsSummary || '',
            totalQuantity: item.quantity,
          });
        }
      }
    }
    group.batchSummary = Array.from(summaryMap.values());
  }

  groups.sort((a, b) => a.oldestCreatedAtMs - b.oldestCreatedAtMs);
  return groups;
}
