import { apiFetch } from '../services/api';

interface SerialPortLike {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  writable?: {
    getWriter: () => {
      write: (chunk: Uint8Array) => Promise<void>;
      releaseLock: () => void;
    };
  };
}

interface NavigatorWithSerial extends Navigator {
  serial?: {
    requestPort: () => Promise<SerialPortLike>;
  };
}

export interface ThermalPrintPayload {
  kind: 'RECEIPT' | 'KITCHEN';
  orderNumber: string;
  tableLabel?: string | null;
  customerName?: string;
  stationLabel?: string;
  notes?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paidAmountXof?: number;
  totalXof?: number;
  items: Array<{
    name: string;
    quantity: number;
    lineTotalXof?: number;
    optionsSummary?: string;
    notes?: string;
  }>;
  sendNetwork?: boolean;
  printerHost?: string;
  printerPort?: number;
}

export interface ThermalPrintResponse {
  ok: boolean;
  mode: 'BROWSER' | 'NETWORK_ESCPOS' | 'WEB_SERIAL';
  paperWidth: '58mm' | '80mm';
  previewText: string;
  base64Bytes: string;
  networkResult: { ok: boolean; bytesSent: number; error?: string } | null;
}

function decodeBase64ToBytes(b64: string): Uint8Array {
  const binary = window.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function supportsWebSerial(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean((navigator as NavigatorWithSerial).serial)
  );
}

export async function printViaWebSerial(bytes: Uint8Array): Promise<void> {
  const nav = navigator as NavigatorWithSerial;
  if (!nav.serial) {
    throw new Error('WebSerial non pris en charge par ce navigateur.');
  }
  const port = await nav.serial.requestPort();
  await port.open({ baudRate: 9600 });
  try {
    const writer = port.writable?.getWriter();
    if (!writer) {
      throw new Error('Port série non accessible en écriture.');
    }
    try {
      await writer.write(bytes);
    } finally {
      writer.releaseLock();
    }
  } finally {
    await port.close().catch(() => {});
  }
}

export async function executeThermalPrint(
  payload: ThermalPrintPayload,
): Promise<ThermalPrintResponse & { dispatchedVia: 'NETWORK' | 'WEB_SERIAL' | 'BROWSER' }> {
  const res = await apiFetch<ThermalPrintResponse>('/api/restaurant/print/escpos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res.mode === 'NETWORK_ESCPOS') {
    if (res.networkResult?.ok) {
      return { ...res, dispatchedVia: 'NETWORK' };
    }
    throw new Error(
      res.networkResult?.error ||
        'Impossible de joindre l’imprimante thermique réseau.',
    );
  }

  if (res.mode === 'WEB_SERIAL') {
    if (!supportsWebSerial()) {
      window.print();
      return { ...res, dispatchedVia: 'BROWSER' };
    }
    const bytes = decodeBase64ToBytes(res.base64Bytes);
    await printViaWebSerial(bytes);
    return { ...res, dispatchedVia: 'WEB_SERIAL' };
  }

  window.print();
  return { ...res, dispatchedVia: 'BROWSER' };
}
