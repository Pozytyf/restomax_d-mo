import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../services/api.ts';
import {
  attachPaymentToOfflineOrder,
  clearMemoryFallback,
  listOfflineQueue,
  loadPosSnapshot,
  putOfflineQueueEntry,
  removeOfflineQueueEntry,
  savePosSnapshot,
  type OfflineCreateOrderEntry,
  type OfflinePayOrderEntry,
  type PosSnapshot,
} from '../restaurant/pos/posOfflineDb.ts';
import { syncOfflinePosQueue } from '../restaurant/pos/posOfflineSync.ts';

// Minimal in-memory IDBFactory mock exercising posOfflineDb.ts's IndexedDB code paths
function createMockIdbFactory(): IDBFactory {
  const stores = new Map<
    string,
    { keyPath: string; rows: Map<string, Record<string, unknown>> }
  >();

  function makeReq<T>(executor: () => T): IDBRequest<T> {
    const req = {
      onsuccess: null as ((ev: Event) => void) | null,
      onerror: null as ((ev: Event) => void) | null,
      result: undefined as unknown as T,
      error: null as DOMException | null,
    };
    queueMicrotask(() => {
      try {
        req.result = executor();
        req.onsuccess?.(new Event('success'));
      } catch (err) {
        req.error = err as DOMException;
        req.onerror?.(new Event('error'));
      }
    });
    return req as unknown as IDBRequest<T>;
  }

  const factory = {
    open(): IDBOpenDBRequest {
      const req: Record<string, unknown> = {
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };

      const dbApi = {
        objectStoreNames: {
          contains: (name: string) => stores.has(name),
        },
        createObjectStore(name: string, opts: { keyPath: string }) {
          if (!stores.has(name)) {
            stores.set(name, { keyPath: opts.keyPath, rows: new Map() });
          }
          return {
            createIndex: () => ({}),
          };
        },
        transaction(storeName: string) {
          const tx: Record<string, unknown> = {
            oncomplete: null,
            onerror: null,
            onabort: null,
            objectStore() {
              const store = stores.get(storeName)!;
              return {
                put(val: Record<string, unknown>) {
                  return makeReq(() => {
                    const k = String(val[store.keyPath]);
                    store.rows.set(k, structuredClone(val));
                    queueMicrotask(() => {
                      (tx.oncomplete as (() => void) | null)?.();
                    });
                    return k;
                  });
                },
                get(key: string) {
                  return makeReq(() => {
                    const found = store.rows.get(String(key));
                    return found ? structuredClone(found) : undefined;
                  });
                },
                delete(key: string) {
                  return makeReq(() => {
                    store.rows.delete(String(key));
                    queueMicrotask(() => {
                      (tx.oncomplete as (() => void) | null)?.();
                    });
                    return undefined;
                  });
                },
                index() {
                  return {
                    getAll(restaurantId: string) {
                      return makeReq(() =>
                        Array.from(store.rows.values())
                          .filter((r) => r.restaurantId === restaurantId)
                          .map((r) => structuredClone(r)),
                      );
                    },
                  };
                },
              };
            },
          };
          return tx as unknown as IDBTransaction;
        },
        close: () => {},
      };

      req.result = dbApi;
      queueMicrotask(() => {
        (req.onupgradeneeded as (() => void) | null)?.();
        (req.onsuccess as (() => void) | null)?.();
      });

      return req as unknown as IDBOpenDBRequest;
    },
  };

  return factory as unknown as IDBFactory;
}

test('POS IndexedDB snapshot isolates restaurants and hydrates cached menu/tables', async () => {
  clearMemoryFallback();
  const idb = createMockIdbFactory();

  const snapshot1: PosSnapshot = {
    restaurantId: 'rest_1',
    categories: [
      {
        id: 'cat_1',
        restaurantId: 'rest_1',
        name: 'Grillades',
        station: 'KITCHEN',
        sortOrder: 1,
        active: true,
      },
    ],
    items: [
      {
        id: 'itm_1',
        restaurantId: 'rest_1',
        categoryId: 'cat_1',
        categoryName: 'Grillades',
        name: 'Poulet Braisé',
        description: '',
        priceXof: 5500,
        costPriceXof: 2200,
        imageUrl: null,
        available: true,
        sortOrder: 1,
        options: [],
      },
    ],
    tables: [
      {
        id: 'tbl_1',
        restaurantId: 'rest_1',
        zone: 'Terrasse',
        label: 'T1',
        capacity: 4,
        status: 'AVAILABLE',
      },
    ],
    openOrders: [],
    updatedAt: '2026-11-19T12:00:00.000Z',
  };

  await savePosSnapshot(snapshot1, idb);

  const loaded1 = await loadPosSnapshot('rest_1', idb);
  assert.ok(loaded1);
  assert.equal(loaded1.items.length, 1);
  assert.equal(loaded1.items[0].name, 'Poulet Braisé');
  assert.equal(loaded1.tables[0].label, 'T1');

  const loaded2 = await loadPosSnapshot('rest_other', idb);
  assert.equal(loaded2, null);
});

test('POS offline order + immediate payment syncs FIFO on reconnect and recovers from mid-sync drop', async () => {
  clearMemoryFallback();
  const idb = createMockIdbFactory();

  const orderEntry: OfflineCreateOrderEntry = {
    localId: 'offline-pos-100',
    restaurantId: 'rest_1',
    kind: 'CREATE_ORDER',
    localOrderNumber: 'HL-101-A1B2',
    payload: {
      orderType: 'DINE_IN',
      tableId: 'tbl_1',
      customerName: 'Awa Koné',
      discountXof: 0,
      idempotencyKey: 'pos-idem-100',
      items: [
        { menuItemId: 'itm_1', optionIds: [], quantity: 2, notes: '' },
      ],
    },
    preview: {
      tableLabel: 'T1 (Terrasse)',
      customerName: 'Awa Koné',
      totalXof: 11000,
      itemsSummary: [{ name: 'Poulet Braisé', quantity: 2, lineTotalXof: 11000 }],
    },
    pendingPayment: null,
    status: 'PENDING',
    attempts: 0,
    lastError: null,
    createdAt: '2026-11-19T12:01:00.000Z',
  };

  await putOfflineQueueEntry(orderEntry, idb);
  const withPayment = await attachPaymentToOfflineOrder(
    orderEntry.localId,
    {
      amountXof: 11000,
      method: 'WAVE',
      idempotencyKey: 'pay-idem-100',
      reference: 'HL-WAVE-991122',
      paidAt: '2026-11-19T12:01:30.000Z',
    },
    idb,
  );
  assert.ok(withPayment?.pendingPayment);

  // First sync attempt: order creation succeeds, then network drops before /pay!
  const calls: Array<{ path: string; body: unknown }> = [];
  let dropOnPay = true;

  const firstRes = await syncOfflinePosQueue('rest_1', {
    idbFactory: idb,
    fetchFn: async <T>(path: string, options?: RequestInit): Promise<T> => {
      const parsed = options?.body ? JSON.parse(String(options.body)) : {};
      calls.push({ path, body: parsed });

      if (path === '/api/restaurant/orders') {
        return {
          order: { id: 'ord_srv_100', orderNumber: 'CMD-1042', totalXof: 11000 },
        } as T;
      }
      if (path === '/api/restaurant/orders/ord_srv_100/pay' && dropOnPay) {
        throw new TypeError('Failed to fetch');
      }
      return {
        payment: { amountXof: 11000, reference: 'TEST-WAVE-555' },
      } as T;
    },
  });

  assert.equal(firstRes.abortedOffline, true);
  assert.equal(firstRes.syncedCount, 0);
  assert.equal(firstRes.remainingCount, 1);

  // Verify remoteOrderId was persisted so second sync does NOT recreate the order
  const queuedAfterDrop = await listOfflineQueue('rest_1', idb);
  assert.equal(queuedAfterDrop.length, 1);
  assert.equal(
    (queuedAfterDrop[0] as OfflineCreateOrderEntry).remoteOrderId,
    'ord_srv_100',
  );

  // Second sync attempt once connection is back: only /pay is called!
  dropOnPay = false;
  calls.length = 0;

  const secondRes = await syncOfflinePosQueue('rest_1', {
    idbFactory: idb,
    fetchFn: async <T>(path: string, options?: RequestInit): Promise<T> => {
      const parsed = options?.body ? JSON.parse(String(options.body)) : {};
      calls.push({ path, body: parsed });
      return {
        payment: { amountXof: 11000, reference: 'TEST-WAVE-555' },
      } as T;
    },
  });

  assert.equal(secondRes.abortedOffline, false);
  assert.equal(secondRes.syncedCount, 1);
  assert.equal(secondRes.remainingCount, 0);
  assert.deepEqual(calls, [
    {
      path: '/api/restaurant/orders/ord_srv_100/pay',
      body: {
        amountXof: 11000,
        method: 'WAVE',
        idempotencyKey: 'pay-idem-100',
      },
    },
  ]);
});

test('POS offline sync isolates 4xx business errors without blocking remaining valid queue items', async () => {
  clearMemoryFallback();
  const idb = createMockIdbFactory();

  const badPay: OfflinePayOrderEntry = {
    localId: 'offline-pay-bad',
    restaurantId: 'rest_1',
    kind: 'PAY_ORDER',
    targetOrderId: 'ord_already_paid',
    targetOrderNumber: 'CMD-1001',
    payload: {
      amountXof: 5000,
      method: 'CASH',
      idempotencyKey: 'pay-bad-1',
    },
    reference: 'HL-CASH-111111',
    status: 'PENDING',
    attempts: 0,
    lastError: null,
    createdAt: '2026-11-19T12:00:00.000Z',
  };

  const validOrder: OfflineCreateOrderEntry = {
    localId: 'offline-pos-good',
    restaurantId: 'rest_1',
    kind: 'CREATE_ORDER',
    localOrderNumber: 'HL-102-Z9Y8',
    payload: {
      orderType: 'TAKEAWAY',
      tableId: null,
      customerName: 'À emporter',
      discountXof: 0,
      idempotencyKey: 'pos-good-2',
      items: [{ menuItemId: 'itm_1', optionIds: [], quantity: 1, notes: '' }],
    },
    preview: {
      tableLabel: null,
      customerName: 'À emporter',
      totalXof: 5500,
      itemsSummary: [{ name: 'Poulet Braisé', quantity: 1, lineTotalXof: 5500 }],
    },
    pendingPayment: null,
    status: 'PENDING',
    attempts: 0,
    lastError: null,
    createdAt: '2026-11-19T12:02:00.000Z',
  };

  await putOfflineQueueEntry(badPay, idb);
  await putOfflineQueueEntry(validOrder, idb);

  const res = await syncOfflinePosQueue('rest_1', {
    idbFactory: idb,
    fetchFn: async <T>(path: string): Promise<T> => {
      if (path.includes('ord_already_paid')) {
        throw new ApiError('Cette commande est déjà intégralement payée.', 409);
      }
      return {
        order: { id: 'ord_srv_good', orderNumber: 'CMD-1043', totalXof: 5500 },
      } as T;
    },
  });

  assert.equal(res.syncedCount, 1);
  assert.equal(res.failedCount, 1);
  assert.equal(res.remainingCount, 1);
  assert.deepEqual(res.syncedOrderNumbers, ['CMD-1043']);

  const remaining = await listOfflineQueue('rest_1', idb);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].status, 'FAILED');
  assert.equal(
    remaining[0].lastError,
    'Cette commande est déjà intégralement payée.',
  );

  // Removing the failed entry clears the queue cleanly
  await removeOfflineQueueEntry(remaining[0].localId, idb);
  assert.equal((await listOfflineQueue('rest_1', idb)).length, 0);
});
