import { apiFetch, isConnectivityError } from '../../services/api';
import {
  listOfflineQueue,
  putOfflineQueueEntry,
  removeOfflineQueueEntry,
  type OfflineQueueEntry,
} from './posOfflineDb';

export type SyncApiFetch = <T>(path: string, options?: RequestInit) => Promise<T>;

export interface PosSyncResult {
  syncedCount: number;
  failedCount: number;
  remainingCount: number;
  abortedOffline: boolean;
  syncedOrderNumbers: string[];
}

interface CreateOrderResponse {
  order: {
    id: string;
    orderNumber?: string;
    order_number?: string;
    totalXof?: number;
    total_xof?: number;
  };
}

interface PayOrderResponse {
  payment: {
    amountXof?: number;
    amount_xof?: number;
    reference: string;
  };
}

export async function syncOfflinePosQueue(
  restaurantId: string,
  options: {
    includeFailed?: boolean;
    fetchFn?: SyncApiFetch;
    idbFactory?: IDBFactory;
  } = {},
): Promise<PosSyncResult> {
  const fetchFn = options.fetchFn ?? apiFetch;
  const includeFailed = Boolean(options.includeFailed);
  const allEntries = await listOfflineQueue(restaurantId, options.idbFactory);
  const candidates = allEntries.filter(
    (entry) => includeFailed || entry.status === 'PENDING',
  );

  let syncedCount = 0;
  let failedCount = 0;
  let abortedOffline = false;
  const syncedOrderNumbers: string[] = [];

  for (const entry of candidates) {
    let currentEntry: OfflineQueueEntry = entry;
    try {
      if (currentEntry.kind === 'CREATE_ORDER') {
        let remoteOrderId = currentEntry.remoteOrderId || null;
        let resolvedOrderNumber = currentEntry.localOrderNumber;

        if (!remoteOrderId) {
          const created = await fetchFn<CreateOrderResponse>(
            '/api/restaurant/orders',
            {
              method: 'POST',
              body: JSON.stringify(currentEntry.payload),
            },
          );
          remoteOrderId = created.order.id;
          resolvedOrderNumber =
            created.order.orderNumber ||
            created.order.order_number ||
            currentEntry.localOrderNumber;

          // Persist remoteOrderId immediately in case payment call fails mid-way
          if (currentEntry.pendingPayment) {
            currentEntry = {
              ...currentEntry,
              remoteOrderId,
              status: 'PENDING',
              lastError: null,
            };
            await putOfflineQueueEntry(currentEntry, options.idbFactory);
          }
        }

        if (currentEntry.pendingPayment && remoteOrderId) {
          await fetchFn<PayOrderResponse>(
            `/api/restaurant/orders/${remoteOrderId}/pay`,
            {
              method: 'POST',
              body: JSON.stringify({
                amountXof: currentEntry.pendingPayment.amountXof,
                method: currentEntry.pendingPayment.method,
                idempotencyKey: currentEntry.pendingPayment.idempotencyKey,
              }),
            },
          );
        }

        await removeOfflineQueueEntry(currentEntry.localId, options.idbFactory);
        syncedCount += 1;
        syncedOrderNumbers.push(resolvedOrderNumber);
      } else if (currentEntry.kind === 'PAY_ORDER') {
        await fetchFn<PayOrderResponse>(
          `/api/restaurant/orders/${currentEntry.targetOrderId}/pay`,
          {
            method: 'POST',
            body: JSON.stringify(currentEntry.payload),
          },
        );
        await removeOfflineQueueEntry(currentEntry.localId, options.idbFactory);
        syncedCount += 1;
        syncedOrderNumbers.push(currentEntry.targetOrderNumber);
      }
    } catch (err) {
      if (isConnectivityError(err)) {
        const updated: OfflineQueueEntry = {
          ...currentEntry,
          status: 'PENDING',
          attempts: currentEntry.attempts + 1,
          lastError: 'Connexion perdue pendant la synchronisation.',
        };
        await putOfflineQueueEntry(updated, options.idbFactory);
        abortedOffline = true;
        break;
      }

      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Erreur de validation lors de la synchronisation.';
      const failedEntry: OfflineQueueEntry = {
        ...currentEntry,
        status: 'FAILED',
        attempts: currentEntry.attempts + 1,
        lastError: errorMessage,
      };
      await putOfflineQueueEntry(failedEntry, options.idbFactory);
      failedCount += 1;
    }
  }

  const remaining = await listOfflineQueue(restaurantId, options.idbFactory);
  return {
    syncedCount,
    failedCount,
    remainingCount: remaining.length,
    abortedOffline,
    syncedOrderNumbers,
  };
}
