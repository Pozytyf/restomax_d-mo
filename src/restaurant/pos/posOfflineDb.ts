import type {
  DiningTable,
  MenuCategory,
  MenuItem,
  Order,
  OrderType,
  PaymentMethod,
} from '../../types';

const DB_NAME = 'restomax_pos_offline';
const DB_VERSION = 1;
const SNAPSHOT_STORE = 'snapshots';
const QUEUE_STORE = 'queue';
const QUEUE_RESTAURANT_INDEX = 'byRestaurant';

export interface PosSnapshot {
  restaurantId: string;
  categories: MenuCategory[];
  items: MenuItem[];
  tables: DiningTable[];
  openOrders: Order[];
  updatedAt: string;
}

export interface OfflineOrderPayload {
  orderType: Extract<OrderType, 'DINE_IN' | 'TAKEAWAY'>;
  tableId: string | null;
  customerName: string;
  discountXof: number;
  idempotencyKey: string;
  items: Array<{
    menuItemId: string;
    optionIds: string[];
    quantity: number;
    notes: string;
  }>;
}

export interface OfflineOrderPreview {
  tableLabel: string | null;
  customerName: string;
  totalXof: number;
  itemsSummary: Array<{
    name: string;
    quantity: number;
    lineTotalXof: number;
  }>;
}

export interface OfflineAttachedPayment {
  amountXof: number;
  method: PaymentMethod;
  idempotencyKey: string;
  reference: string;
  paidAt: string;
}

export interface OfflineCreateOrderEntry {
  localId: string;
  restaurantId: string;
  kind: 'CREATE_ORDER';
  localOrderNumber: string;
  payload: OfflineOrderPayload;
  preview: OfflineOrderPreview;
  pendingPayment: OfflineAttachedPayment | null;
  remoteOrderId?: string | null;
  status: 'PENDING' | 'FAILED';
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

export interface OfflinePayOrderEntry {
  localId: string;
  restaurantId: string;
  kind: 'PAY_ORDER';
  targetOrderId: string;
  targetOrderNumber: string;
  payload: {
    amountXof: number;
    method: PaymentMethod;
    idempotencyKey: string;
  };
  reference: string;
  status: 'PENDING' | 'FAILED';
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

export type OfflineQueueEntry = OfflineCreateOrderEntry | OfflinePayOrderEntry;

// Fallback in-memory storage if IndexedDB is unavailable in restricted contexts
const memorySnapshots = new Map<string, PosSnapshot>();
const memoryQueue = new Map<string, OfflineQueueEntry>();

function getIndexedDbFactory(customFactory?: IDBFactory): IDBFactory | null {
  if (customFactory) return customFactory;
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB;
  }
  if (typeof globalThis !== 'undefined' && 'indexedDB' in globalThis) {
    return (globalThis as { indexedDB?: IDBFactory }).indexedDB ?? null;
  }
  return null;
}

function openPosDb(customFactory?: IDBFactory): Promise<IDBDatabase | null> {
  const factory = getIndexedDbFactory(customFactory);
  if (!factory) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = factory.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'restaurantId' });
        }
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const queueStore = db.createObjectStore(QUEUE_STORE, {
            keyPath: 'localId',
          });
          queueStore.createIndex(QUEUE_RESTAURANT_INDEX, 'restaurantId', {
            unique: false,
          });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function runIdbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error('IndexedDB request failed'));
  });
}

function waitTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error || new Error('IndexedDB transaction failed'));
    tx.onabort = () =>
      reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

export async function savePosSnapshot(
  snapshot: PosSnapshot,
  customFactory?: IDBFactory,
): Promise<void> {
  memorySnapshots.set(snapshot.restaurantId, snapshot);
  const db = await openPosDb(customFactory);
  if (!db) return;

  try {
    const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
    tx.objectStore(SNAPSHOT_STORE).put(snapshot);
    await waitTransaction(tx);
  } finally {
    db.close();
  }
}

export async function loadPosSnapshot(
  restaurantId: string,
  customFactory?: IDBFactory,
): Promise<PosSnapshot | null> {
  const db = await openPosDb(customFactory);
  if (!db) {
    return memorySnapshots.get(restaurantId) ?? null;
  }

  try {
    const tx = db.transaction(SNAPSHOT_STORE, 'readonly');
    const result = await runIdbRequest<PosSnapshot | undefined>(
      tx.objectStore(SNAPSHOT_STORE).get(restaurantId),
    );
    return result ?? memorySnapshots.get(restaurantId) ?? null;
  } finally {
    db.close();
  }
}

export async function putOfflineQueueEntry(
  entry: OfflineQueueEntry,
  customFactory?: IDBFactory,
): Promise<OfflineQueueEntry> {
  memoryQueue.set(entry.localId, entry);
  const db = await openPosDb(customFactory);
  if (!db) return entry;

  try {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).put(entry);
    await waitTransaction(tx);
    return entry;
  } finally {
    db.close();
  }
}

export async function listOfflineQueue(
  restaurantId: string,
  customFactory?: IDBFactory,
): Promise<OfflineQueueEntry[]> {
  const sortFifo = (entries: OfflineQueueEntry[]) =>
    entries
      .filter((e) => e.restaurantId === restaurantId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const db = await openPosDb(customFactory);
  if (!db) {
    return sortFifo(Array.from(memoryQueue.values()));
  }

  try {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const store = tx.objectStore(QUEUE_STORE);
    const index = store.index(QUEUE_RESTAURANT_INDEX);
    const rows = await runIdbRequest<OfflineQueueEntry[]>(
      index.getAll(restaurantId),
    );
    return sortFifo(rows || []);
  } finally {
    db.close();
  }
}

export async function getOfflineQueueEntry(
  localId: string,
  customFactory?: IDBFactory,
): Promise<OfflineQueueEntry | null> {
  const db = await openPosDb(customFactory);
  if (!db) {
    return memoryQueue.get(localId) ?? null;
  }

  try {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const row = await runIdbRequest<OfflineQueueEntry | undefined>(
      tx.objectStore(QUEUE_STORE).get(localId),
    );
    return row ?? null;
  } finally {
    db.close();
  }
}

export async function attachPaymentToOfflineOrder(
  localId: string,
  payment: OfflineAttachedPayment,
  customFactory?: IDBFactory,
): Promise<OfflineCreateOrderEntry | null> {
  const current = await getOfflineQueueEntry(localId, customFactory);
  if (!current || current.kind !== 'CREATE_ORDER') {
    return null;
  }
  const updated: OfflineCreateOrderEntry = {
    ...current,
    pendingPayment: payment,
  };
  await putOfflineQueueEntry(updated, customFactory);
  return updated;
}

export async function removeOfflineQueueEntry(
  localId: string,
  customFactory?: IDBFactory,
): Promise<void> {
  memoryQueue.delete(localId);
  const db = await openPosDb(customFactory);
  if (!db) return;

  try {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).delete(localId);
    await waitTransaction(tx);
  } finally {
    db.close();
  }
}

export function clearMemoryFallback(): void {
  memorySnapshots.clear();
  memoryQueue.clear();
}
