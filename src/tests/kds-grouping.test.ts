import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countKdsStatuses,
  groupKdsOrders,
  groupKdsOrdersByPrepTime,
} from '../restaurant/kitchen/kdsGrouping.ts';
import type { Order } from '../types/index.ts';

function makeOrder(partial: Partial<Order>): Order {
  return {
    id: partial.id || 'ord_1',
    restaurantId: 'rest_1',
    orderNumber: partial.orderNumber || 'CMD-1001',
    orderType: partial.orderType || 'DINE_IN',
    tableId: partial.tableId ?? null,
    tableLabel: partial.tableLabel ?? null,
    tableZone: partial.tableZone ?? null,
    customerName: partial.customerName || 'Client',
    status: partial.status || 'PENDING',
    subtotalXof: 10000,
    discountXof: 0,
    taxXof: 1500,
    totalXof: 10000,
    paidXof: 0,
    notes: '',
    createdByUserId: null,
    createdAt: partial.createdAt || '2026-11-20T10:00:00.000Z',
    updatedAt: partial.updatedAt || '2026-11-20T10:00:00.000Z',
    items: partial.items || [],
  };
}

const labels = {
  takeawayGroup: 'À emporter',
  unassignedGroup: 'Comptoir / Sans table',
};

const sampleOrders: Order[] = [
  makeOrder({
    id: 'ord_1',
    orderNumber: 'CMD-1001',
    status: 'PENDING',
    tableId: 'tbl_1',
    tableLabel: 'Table 01',
    tableZone: 'Terrasse Lagune',
    createdAt: '2026-11-20T10:05:00.000Z',
    items: [
      {
        id: 'oi_1',
        orderId: 'ord_1',
        menuItemId: 'm1',
        name: 'Capitaine grillé',
        station: 'KITCHEN',
        unitPriceXof: 12500,
        optionsSummary: '',
        optionsDeltaXof: 0,
        quantity: 2,
        lineTotalXof: 25000,
        notes: '',
        prepStatus: 'PENDING',
      },
      {
        id: 'oi_2',
        orderId: 'ord_1',
        menuItemId: 'm2',
        name: 'Bissap Menthe',
        station: 'BAR',
        unitPriceXof: 3000,
        optionsSummary: '',
        optionsDeltaXof: 0,
        quantity: 1,
        lineTotalXof: 3000,
        notes: '',
        prepStatus: 'PENDING',
      },
    ],
  }),
  makeOrder({
    id: 'ord_2',
    orderNumber: 'CMD-1002',
    status: 'IN_PREPARATION',
    orderType: 'QR_TABLE',
    tableId: 'tbl_1',
    tableLabel: 'Table 01',
    tableZone: 'Terrasse Lagune',
    createdAt: '2026-11-20T10:08:00.000Z',
    items: [
      {
        id: 'oi_3',
        orderId: 'ord_2',
        menuItemId: 'm1',
        name: 'Capitaine grillé',
        station: 'KITCHEN',
        unitPriceXof: 12500,
        optionsSummary: '',
        optionsDeltaXof: 0,
        quantity: 1,
        lineTotalXof: 12500,
        notes: '',
        prepStatus: 'PREPARING',
      },
    ],
  }),
  makeOrder({
    id: 'ord_3',
    orderNumber: 'CMD-1003',
    status: 'READY',
    tableId: 'tbl_2',
    tableLabel: 'Table 02',
    tableZone: 'Terrasse Lagune',
    createdAt: '2026-11-20T10:02:00.000Z',
    items: [
      {
        id: 'oi_4',
        orderId: 'ord_3',
        menuItemId: 'm2',
        name: 'Bissap Menthe',
        station: 'BAR',
        unitPriceXof: 3000,
        optionsSummary: '',
        optionsDeltaXof: 0,
        quantity: 2,
        lineTotalXof: 6000,
        notes: '',
        prepStatus: 'READY',
      },
    ],
  }),
  makeOrder({
    id: 'ord_4',
    orderNumber: 'CMD-1004',
    status: 'PENDING',
    orderType: 'TAKEAWAY',
    tableId: null,
    tableLabel: null,
    tableZone: null,
    createdAt: '2026-11-20T10:18:00.000Z',
    items: [
      {
        id: 'oi_5',
        orderId: 'ord_4',
        menuItemId: 'm3',
        name: 'Alloco doré',
        station: 'KITCHEN',
        unitPriceXof: 3500,
        optionsSummary: '',
        optionsDeltaXof: 0,
        quantity: 1,
        lineTotalXof: 3500,
        notes: '',
        prepStatus: 'PENDING',
      },
    ],
  }),
];

test('groupKdsOrders groups by TABLE and aggregates batch prep quantities', () => {
  const groups = groupKdsOrders(sampleOrders, 'ALL', 'TABLE', labels);
  assert.equal(groups.length, 3);

  // Oldest ticket is Table 02 (10:02)
  assert.equal(groups[0].title, 'Table 02');
  assert.equal(groups[0].orders.length, 1);

  // Next is Table 01 (10:05) with 2 orders combined
  assert.equal(groups[1].title, 'Table 01');
  assert.equal(groups[1].subtitle, 'Terrasse Lagune');
  assert.equal(groups[1].orders.length, 2);
  assert.equal(groups[1].totalItemsCount, 4);

  const capitaineBatch = groups[1].batchSummary.find(
    (b) => b.name === 'Capitaine grillé',
  );
  assert.equal(capitaineBatch?.totalQuantity, 3);

  // Last is Takeaway
  assert.equal(groups[2].title, 'À emporter');
});

test('groupKdsOrders groups by ZONE and filters by station', () => {
  const barGroups = groupKdsOrders(sampleOrders, 'BAR', 'ZONE', labels);
  assert.equal(barGroups.length, 1);
  assert.equal(barGroups[0].title, 'Terrasse Lagune');
  assert.equal(barGroups[0].orders.length, 2);
  assert.equal(barGroups[0].totalItemsCount, 3);
  assert.equal(barGroups[0].batchSummary[0].name, 'Bissap Menthe');
  assert.equal(barGroups[0].batchSummary[0].totalQuantity, 3);
});

test('groupKdsOrders in NONE mode keeps individual tickets', () => {
  const tickets = groupKdsOrders(sampleOrders, 'KITCHEN', 'NONE', labels);
  assert.equal(tickets.length, 3);
  assert.deepEqual(
    tickets.map((t) => t.title),
    ['CMD-1001', 'CMD-1002', 'CMD-1004'],
  );
});

test('groupKdsOrdersByPrepTime buckets orders into CRITICAL, ACTIVE and FRESH tiers and counts statuses', () => {
  // Reference time: 10:20:00Z
  // ord_3 (10:02) -> 18 min -> CRITICAL
  // ord_1 (10:05) -> 15 min -> CRITICAL
  // ord_2 (10:08) -> 12 min -> ACTIVE
  // ord_4 (10:18) -> 2 min  -> FRESH
  const nowMs = new Date('2026-11-20T10:20:00.000Z').getTime();
  const buckets = groupKdsOrdersByPrepTime(sampleOrders, 'ALL', 'ALL', nowMs);

  assert.equal(buckets.length, 3);
  assert.equal(buckets[0].tier, 'CRITICAL');
  assert.deepEqual(
    buckets[0].orders.map((o) => o.order.orderNumber),
    ['CMD-1003', 'CMD-1001'],
  );
  assert.equal(buckets[1].tier, 'ACTIVE');
  assert.deepEqual(
    buckets[1].orders.map((o) => o.order.orderNumber),
    ['CMD-1002'],
  );
  assert.equal(buckets[2].tier, 'FRESH');
  assert.deepEqual(
    buckets[2].orders.map((o) => o.order.orderNumber),
    ['CMD-1004'],
  );

  const counts = countKdsStatuses(sampleOrders, 'ALL');
  assert.deepEqual(counts, {
    ALL: 4,
    PENDING: 2,
    IN_PREPARATION: 1,
    READY: 1,
  });

  const readyOnly = groupKdsOrdersByPrepTime(
    sampleOrders,
    'ALL',
    'READY',
    nowMs,
  );
  assert.equal(readyOnly[0].orders.length, 1);
  assert.equal(readyOnly[0].orders[0].order.orderNumber, 'CMD-1003');
  assert.equal(readyOnly[1].orders.length, 0);
  assert.equal(readyOnly[2].orders.length, 0);
});
