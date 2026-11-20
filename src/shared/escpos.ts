/**
 * Formateur ESC/POS universel (58mm = 32 col, 80mm = 48 col)
 * Utilisable côté client (WebSerial USB) et côté serveur (relais TCP port 9100).
 */

export interface EscPosReceiptInput {
  paperWidth?: '58mm' | '80mm';
  restaurantName: string;
  restaurantCity?: string;
  restaurantPhone?: string;
  orderNumber: string;
  tableLabel?: string | null;
  customerName?: string;
  createdAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paidAmountXof?: number;
  totalXof: number;
  items: Array<{
    name: string;
    quantity: number;
    lineTotalXof: number;
    optionsSummary?: string;
  }>;
  footerNote?: string;
}

export interface EscPosKitchenTicketInput {
  paperWidth?: '58mm' | '80mm';
  restaurantName: string;
  stationLabel: string;
  orderNumber: string;
  tableLabel?: string | null;
  customerName?: string;
  notes?: string;
  createdAt?: string;
  items: Array<{
    name: string;
    quantity: number;
    optionsSummary?: string;
    notes?: string;
  }>;
}

function normalizeAscii(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—|–/g, '-')
    .replace(/[^\x20-\x7E\n]/g, ' ');
}

function padColumns(left: string, right: string, width: number): string {
  const l = normalizeAscii(left);
  const r = normalizeAscii(right);
  const maxLeft = Math.max(4, width - r.length - 1);
  const trimmedLeft = l.length > maxLeft ? l.slice(0, maxLeft) : l;
  const spaces = Math.max(1, width - trimmedLeft.length - r.length);
  return `${trimmedLeft}${' '.repeat(spaces)}${r}`;
}

function formatXofPlain(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US').replace(/,/g, ' ')} FCFA`;
}

export function buildEscPosReceiptPayload(input: EscPosReceiptInput): {
  previewText: string;
  bytes: Uint8Array;
} {
  const width = input.paperWidth === '58mm' ? 32 : 48;
  const divider = '-'.repeat(width);
  const lines: string[] = [
    normalizeAscii(input.restaurantName).toUpperCase(),
    input.restaurantCity ? normalizeAscii(input.restaurantCity) : '',
    input.restaurantPhone ? `Tel: ${normalizeAscii(input.restaurantPhone)}` : '',
    divider,
    padColumns(`Ticket: ${input.orderNumber}`, input.tableLabel || 'Comptoir', width),
    input.customerName ? `Client: ${normalizeAscii(input.customerName)}` : '',
    input.createdAt
      ? `Date: ${new Date(input.createdAt).toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' })}`
      : '',
    divider,
  ].filter(Boolean);

  for (const it of input.items) {
    lines.push(
      padColumns(`${it.quantity}x ${it.name}`, formatXofPlain(it.lineTotalXof), width),
    );
    if (it.optionsSummary) {
      lines.push(`  + ${normalizeAscii(it.optionsSummary)}`);
    }
  }

  lines.push(divider);
  lines.push(padColumns('TOTAL TTC', formatXofPlain(input.totalXof), width));
  if (typeof input.paidAmountXof === 'number') {
    lines.push(padColumns('REGLE', formatXofPlain(input.paidAmountXof), width));
  }
  if (input.paymentMethod) {
    lines.push(padColumns('MODE', normalizeAscii(input.paymentMethod), width));
  }
  if (input.paymentReference) {
    lines.push(`Ref: ${normalizeAscii(input.paymentReference)}`);
  }
  lines.push(divider);
  lines.push(normalizeAscii(input.footerNote || 'Merci de votre visite - RestoMAX'));

  const previewText = lines.join('\n');
  const bytes = encodeEscPosTextDocument(lines);
  return { previewText, bytes };
}

export function buildEscPosKitchenPayload(input: EscPosKitchenTicketInput): {
  previewText: string;
  bytes: Uint8Array;
} {
  const width = input.paperWidth === '58mm' ? 32 : 48;
  const divider = '='.repeat(width);
  const lines: string[] = [
    `BON ${normalizeAscii(input.stationLabel).toUpperCase()}`,
    normalizeAscii(input.restaurantName),
    divider,
    padColumns(`CMD: ${input.orderNumber}`, input.tableLabel || 'A EMPORTER', width),
    input.customerName ? `Client: ${normalizeAscii(input.customerName)}` : '',
    input.createdAt
      ? `Heure: ${new Date(input.createdAt).toLocaleTimeString('fr-FR', { timeZone: 'Africa/Abidjan', hour: '2-digit', minute: '2-digit' })}`
      : '',
    divider,
  ].filter(Boolean);

  for (const it of input.items) {
    lines.push(`${it.quantity} x ${normalizeAscii(it.name)}`);
    if (it.optionsSummary) {
      lines.push(`  Options: ${normalizeAscii(it.optionsSummary)}`);
    }
    if (it.notes) {
      lines.push(`  Note: ${normalizeAscii(it.notes)}`);
    }
  }

  if (input.notes) {
    lines.push(divider);
    lines.push(`NOTE CMD: ${normalizeAscii(input.notes)}`);
  }
  lines.push(divider);

  return {
    previewText: lines.join('\n'),
    bytes: encodeEscPosTextDocument(lines),
  };
}

export function encodeEscPosTextDocument(lines: string[]): Uint8Array {
  const chunks: number[] = [
    0x1b, 0x40, // ESC @ Initialize
    0x1b, 0x61, 0x01, // Center header
    0x1b, 0x45, 0x01, // Bold on
  ];

  const encoder = new TextEncoder();
  lines.forEach((line, index) => {
    if (index === 1) {
      chunks.push(0x1b, 0x45, 0x00); // Bold off after first title
    }
    if (index === 3) {
      chunks.push(0x1b, 0x61, 0x00); // Left align body
    }
    const encoded = encoder.encode(`${normalizeAscii(line)}\n`);
    for (const b of encoded) {
      chunks.push(b);
    }
  });

  // Feed 4 lines + GS V 66 0 (partial cut)
  chunks.push(0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00);
  return new Uint8Array(chunks);
}
