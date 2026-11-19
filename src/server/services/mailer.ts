import nodemailer from 'nodemailer';

export interface CriticalStockEmailPayload {
  restaurantName: string;
  stockName: string;
  quantity: number;
  minThreshold: number;
  unit: string;
  supplierName: string;
  recipients: string[];
}

export interface EmailDispatchResult {
  dispatched: boolean;
  status: 'SENT' | 'QUEUED_NO_SMTP' | 'SKIPPED' | 'FAILED';
  recipients: string[];
}

export async function sendCriticalStockAlertEmail(
  payload: CriticalStockEmailPayload,
): Promise<EmailDispatchResult> {
  const cleanRecipients = Array.from(
    new Set(
      payload.recipients
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@')),
    ),
  );

  if (cleanRecipients.length === 0) {
    return {
      dispatched: false,
      status: 'SKIPPED',
      recipients: [],
    };
  }

  const smtpHost = process.env.SMTP_HOST?.trim();
  if (!smtpHost) {
    // Aucun serveur SMTP configuré dans cet environnement : journalisation propre sans bloquer le flux métier
    return {
      dispatched: false,
      status: 'QUEUED_NO_SMTP',
      recipients: cleanRecipients,
    };
  }

  try {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
      secure,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });

    const from = process.env.SMTP_FROM || 'Resto’MAX Alertes <alertes@restomax.ci>';
    const subject = `[Resto’MAX] Alerte réapprovisionnement : ${payload.stockName} (${payload.restaurantName})`;
    const text = [
      `Bonjour,`,
      ``,
      `L'ingrédient "${payload.stockName}" de votre établissement "${payload.restaurantName}" a atteint son seuil critique de réapprovisionnement.`,
      `- Stock actuel : ${payload.quantity} ${payload.unit}`,
      `- Seuil minimal configuré : ${payload.minThreshold} ${payload.unit}`,
      `- Fournisseur associé : ${payload.supplierName || 'Non renseigné'}`,
      ``,
      `Veuillez planifier un réapprovisionnement depuis votre module Stocks & Achats Resto’MAX.`,
    ].join('\n');

    const html = `
      <div style="font-family: Inter, Arial, sans-serif; color: #182333; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #182333; color: #ffffff; padding: 18px 24px;">
          <p style="margin: 0; font-size: 12px; color: #FF8738; font-weight: 700;">RESTO’MAX · ALERTE STOCK CRITIQUE</p>
          <h2 style="margin: 6px 0 0; font-size: 18px;">${payload.restaurantName}</h2>
        </div>
        <div style="padding: 24px; background: #ffffff;">
          <p style="margin-top: 0; font-size: 14px;">L’ingrédient <strong>${payload.stockName}</strong> a atteint son seuil critique de réapprovisionnement :</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
            <tr>
              <td style="padding: 8px 0; color: #64748B;">Stock actuel</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #E05252;">${payload.quantity} ${payload.unit}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748B; border-top: 1px solid #f1f5f9;">Seuil minimal</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; border-top: 1px solid #f1f5f9;">${payload.minThreshold} ${payload.unit}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748B; border-top: 1px solid #f1f5f9;">Fournisseur</td>
              <td style="padding: 8px 0; text-align: right; border-top: 1px solid #f1f5f9;">${payload.supplierName || 'Non renseigné'}</td>
            </tr>
          </table>
          <p style="margin-bottom: 0; font-size: 12px; color: #64748B;">Connectez-vous à votre espace Stocks & Achats Resto’MAX pour enregistrer l’approvisionnement.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from,
      to: cleanRecipients.join(', '),
      subject,
      text,
      html,
    });

    return {
      dispatched: true,
      status: 'SENT',
      recipients: cleanRecipients,
    };
  } catch {
    return {
      dispatched: false,
      status: 'FAILED',
      recipients: cleanRecipients,
    };
  }
}
