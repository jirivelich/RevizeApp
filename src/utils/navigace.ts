/** Odkazy do navigačních aplikací (bez Reactu – kvůli testům). */

export interface NavCil {
  adresa?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Popisek bodu (název zakázky) – pro systémový výběr aplikace. */
  nazev?: string;
}

export interface NavOdkaz {
  id: 'system' | 'mapy' | 'google' | 'waze' | 'apple';
  nazev: string;
  url: string;
  barva: string;
  pozn?: string;
}

const enc = encodeURIComponent;

/**
 * Odkazy pro daný cíl. Uložená poloha (lat/lng) má přednost před adresou.
 * Android: navíc „Vybrat aplikaci“ (geo: – systém nabídne nainstalované mapy).
 * Apple: navíc Apple Mapy.
 */
export function navigacniOdkazy(cil: NavCil, userAgent = ''): NavOdkaz[] {
  const gps = cil.lat != null && cil.lng != null && Number.isFinite(cil.lat) && Number.isFinite(cil.lng)
    ? { lat: Number(cil.lat.toFixed(6)), lng: Number(cil.lng.toFixed(6)) } : null;
  const adresa = (cil.adresa ?? '').trim();
  const cilText = gps ? `${gps.lat},${gps.lng}` : adresa;
  const android = /Android/i.test(userAgent);
  const apple = /iPhone|iPad|iPod|Macintosh/i.test(userAgent);

  const out: NavOdkaz[] = [];
  if (android) {
    const popisek = enc(cil.nazev || adresa || 'Zakázka');
    out.push({
      id: 'system',
      nazev: 'Vybrat aplikaci v telefonu',
      url: gps ? `geo:${gps.lat},${gps.lng}?q=${gps.lat},${gps.lng}(${popisek})` : `geo:0,0?q=${enc(adresa)}`,
      barva: 'var(--text-secondary)',
    });
  }
  out.push({
    id: 'mapy',
    nazev: 'Mapy.com',
    url: gps
      ? `https://mapy.com/fnc/v1/route?end=${gps.lng},${gps.lat}&routeType=car_fast`
      : `https://mapy.com/fnc/v1/search?query=${enc(adresa)}`,
    barva: '#16a34a',
    pozn: gps ? undefined : 'najde adresu',
  });
  out.push({
    id: 'google',
    nazev: 'Google Mapy',
    url: `https://www.google.com/maps/dir/?api=1&destination=${enc(cilText)}&travelmode=driving`,
    barva: '#2563eb',
  });
  out.push({
    id: 'waze',
    nazev: 'Waze',
    url: gps ? `https://waze.com/ul?ll=${gps.lat},${gps.lng}&navigate=yes` : `https://waze.com/ul?q=${enc(adresa)}&navigate=yes`,
    barva: '#06b6d4',
  });
  if (apple) {
    out.push({ id: 'apple', nazev: 'Apple Mapy', url: `https://maps.apple.com/?daddr=${enc(cilText)}&dirflg=d`, barva: '#64748b' });
  }
  return out;
}
