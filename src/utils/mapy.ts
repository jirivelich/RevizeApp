/** Sdílené pro mapy (OpenStreetMap): podklad a hledání adres (Nominatim). */

export type Bod = { lat: number; lng: number };

export const OSM_DLAZDICE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATRIBUCE = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/** Najde adresu (ČR a okolní státy); nenalezeno = null. */
export async function najdiAdresu(q: string): Promise<{ bod: Bod; nazev: string } | null> {
  const url = `${NOMINATIM}?format=json&limit=1&countrycodes=cz,sk,de,at,pl&accept-language=cs&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Vyhledání adresy selhalo');
  const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  if (!data.length) return null;
  return { bod: { lat: Number(data[0].lat), lng: Number(data[0].lon) }, nazev: data[0].display_name };
}
