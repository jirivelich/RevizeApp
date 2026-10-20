import QRCode from 'qrcode';

export interface SpaydVstup {
  iban: string;
  castka: number;
  vs?: string;
  zprava?: string;
  mena?: string;
}

/** Odstraní diakritiku a znak hvězdička (oddělovač SPAYD). */
function cistyText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\*/g, '')
    .trim();
}

/** Sestaví řetězec SPAYD (český standard QR platby). */
export function sestavSpayd({ iban, castka, vs, zprava, mena = 'CZK' }: SpaydVstup): string {
  const parts = [
    'SPD*1.0',
    `ACC:${iban.replace(/\s+/g, '').toUpperCase()}`,
    `AM:${castka.toFixed(2)}`,
    `CC:${mena.toUpperCase()}`,
  ];
  const cisloVs = (vs ?? '').replace(/\D/g, '').slice(0, 10);
  if (cisloVs) parts.push(`X-VS:${cisloVs}`);
  const msg = zprava ? cistyText(zprava).slice(0, 60).trim() : '';
  if (msg) parts.push(`MSG:${msg}`);
  return parts.join('*');
}

/** Vygeneruje PNG data URL s QR kódem. */
export function qrDataUrl(spayd: string): Promise<string> {
  return QRCode.toDataURL(spayd, { errorCorrectionLevel: 'M', margin: 1, width: 300 });
}
