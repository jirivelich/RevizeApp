/**
 * Plánování trasy na mapě → vzdálenost v km (doprava v nabídce / faktuře).
 *
 * Mapa: OpenStreetMap (Leaflet), hledání adres: Nominatim, výpočet trasy: OSRM.
 * Vše jsou veřejné služby bez klíče; dotazy posílá přímo prohlížeč uživatele.
 * Klik do mapy přidá průjezdní bod, body jdou přetáhnout, klik na průjezdní bod ho odebere.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button, Input, Modal } from './ui';
import { najdiAdresu, OSM_DLAZDICE, OSM_ATRIBUCE, type Bod } from '../utils/mapy';

export interface TrasaVysledek {
  /** Kilometry celkem (tam, nebo tam i zpět), zaokrouhlené na celé km. */
  km: number;
  tamIZpet: boolean;
  /** Sazba za km v Kč. */
  sazba: number;
  odkud: string;
  kam: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPouzit: (v: TrasaVysledek) => void;
  vychoziOdkud?: string;
  vychoziKam?: string;
  /** Výchozí sazba Kč/km (z ceníku, jinak 12). */
  vychoziSazba?: number;
}


const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const STRED_CR: L.LatLngExpression = [49.8, 15.5];

async function spoctiTrasu(body: Bod[]): Promise<{ km: number; minut: number; cara: [number, number][] }> {
  const souradnice = body.map(b => `${b.lng.toFixed(6)},${b.lat.toFixed(6)}`).join(';');
  const res = await fetch(`${OSRM}/${souradnice}?overview=full&geometries=geojson`);
  if (!res.ok) throw new Error('Výpočet trasy selhal');
  const data = await res.json() as { code: string; routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] };
  const r = data.routes?.[0];
  if (data.code !== 'Ok' || !r) throw new Error('Trasu se nepodařilo najít');
  return { km: r.distance / 1000, minut: r.duration / 60, cara: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]) };
}

/** Značka bodu (bez obrázků – Leaflet ikony se ve Vite špatně načítají). */
function ikona(text: string, barva: string, mala = false) {
  const s = mala ? 14 : 26;
  return L.divIcon({
    className: '',
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    html: `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${barva};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);color:#fff;font:700 12px/22px system-ui;text-align:center">${text}</div>`,
  });
}

const fmtKm = (n: number) => new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 }).format(n);

export function TrasaModal({ isOpen, onClose, onPouzit, vychoziOdkud = '', vychoziKam = '', vychoziSazba = 12 }: Props) {
  const [sazba, setSazba] = useState(String(vychoziSazba));
  const [odkud, setOdkud] = useState(vychoziOdkud);
  const [kam, setKam] = useState(vychoziKam);
  const [start, setStart] = useState<Bod | null>(null);
  const [cil, setCil] = useState<Bod | null>(null);
  const [pres, setPres] = useState<Bod[]>([]);
  const [trasa, setTrasa] = useState<{ km: number; minut: number; cara: [number, number][] } | null>(null);
  const [tamIZpet, setTamIZpet] = useState(true);
  const [rucneKm, setRucneKm] = useState('');
  const [chyba, setChyba] = useState<string | null>(null);
  const [hledam, setHledam] = useState(false);

  const mapEl = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const vrstva = useRef<L.LayerGroup | null>(null);

  // Při otevření převzít výchozí adresy
  useEffect(() => {
    if (!isOpen) return;
    setOdkud(vychoziOdkud);
    setKam(vychoziKam);
    setSazba(String(vychoziSazba));
    setStart(null); setCil(null); setPres([]); setTrasa(null); setRucneKm(''); setChyba(null);
  }, [isOpen, vychoziOdkud, vychoziKam, vychoziSazba]);

  // Vytvoření mapy (až je modal v DOM)
  useEffect(() => {
    if (!isOpen || !mapEl.current) return;
    const m = L.map(mapEl.current, { zoomControl: true }).setView(STRED_CR, 7);
    L.tileLayer(OSM_DLAZDICE, { maxZoom: 19, attribution: OSM_ATRIBUCE }).addTo(m);
    vrstva.current = L.layerGroup().addTo(m);
    mapa.current = m;
    // Modal se animuje – přepočítat velikost
    const t = setTimeout(() => m.invalidateSize(), 200);
    return () => { clearTimeout(t); m.remove(); mapa.current = null; vrstva.current = null; };
  }, [isOpen]);

  // Klik do mapy: bez startu → start, bez cíle → cíl, jinak průjezdní bod
  const startRef = useRef(start); startRef.current = start;
  const cilRef = useRef(cil); cilRef.current = cil;
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const klik = (e: L.LeafletMouseEvent) => {
      const b = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (!startRef.current) setStart(b);
      else if (!cilRef.current) setCil(b);
      else setPres(p => [...p, b]);
    };
    m.on('click', klik);
    return () => { m.off('click', klik); };
  }, [isOpen]);

  // Přepočet trasy při změně bodů
  useEffect(() => {
    if (!start || !cil) { setTrasa(null); return; }
    let zruseno = false;
    setChyba(null);
    spoctiTrasu([start, ...pres, cil])
      .then(t => { if (!zruseno) setTrasa(t); })
      .catch(e => { if (!zruseno) { setTrasa(null); setChyba((e as Error).message); } });
    return () => { zruseno = true; };
  }, [start, cil, pres]);

  // Vykreslení bodů a trasy
  useEffect(() => {
    const g = vrstva.current;
    if (!g) return;
    g.clearLayers();
    const pridej = (b: Bod, icon: L.DivIcon, title: string, onMove: (b: Bod) => void, onClick?: () => void) => {
      const mk = L.marker([b.lat, b.lng], { draggable: true, icon, title }).addTo(g);
      mk.on('dragend', () => { const p = mk.getLatLng(); onMove({ lat: p.lat, lng: p.lng }); });
      if (onClick) mk.on('click', onClick);
    };
    if (trasa) L.polyline(trasa.cara, { color: '#2563eb', weight: 5, opacity: 0.85 }).addTo(g);
    if (start) pridej(start, ikona('A', '#16a34a'), 'Odkud (přetažením posunete)', setStart);
    if (cil) pridej(cil, ikona('B', '#dc2626'), 'Kam (přetažením posunete)', setCil);
    pres.forEach((b, i) => pridej(b, ikona('', '#2563eb', true), 'Průjezdní bod – kliknutím odeberete',
      nb => setPres(p => p.map((x, j) => (j === i ? nb : x))),
      () => setPres(p => p.filter((_, j) => j !== i))));
  }, [start, cil, pres, trasa]);

  // Přiblížit na trasu / body po vyhledání
  const priblizit = useCallback((body: Bod[]) => {
    const m = mapa.current;
    if (!m || !body.length) return;
    if (body.length === 1) m.setView([body[0].lat, body[0].lng], 13);
    else m.fitBounds(L.latLngBounds(body.map(b => [b.lat, b.lng] as [number, number])), { padding: [40, 40] });
  }, []);

  const vyhledat = async () => {
    setChyba(null);
    setHledam(true);
    try {
      const [a, b] = await Promise.all([odkud.trim() ? najdiAdresu(odkud) : null, kam.trim() ? najdiAdresu(kam) : null]);
      if (odkud.trim() && !a) throw new Error(`Adresu „${odkud}“ se nepodařilo najít – zkuste ji upřesnit nebo klikněte do mapy.`);
      if (kam.trim() && !b) throw new Error(`Adresu „${kam}“ se nepodařilo najít – zkuste ji upřesnit nebo klikněte do mapy.`);
      if (a) setStart(a.bod);
      if (b) setCil(b.bod);
      setPres([]);
      priblizit([a?.bod, b?.bod].filter((x): x is Bod => !!x));
    } catch (e) {
      setChyba((e as Error).message || 'Vyhledání selhalo');
    } finally {
      setHledam(false);
    }
  };

  // Při otevření s vyplněnými adresami rovnou vyhledat
  const autoHledano = useRef(false);
  useEffect(() => {
    if (!isOpen) { autoHledano.current = false; return; }
    if (autoHledano.current || !vychoziOdkud.trim() || !vychoziKam.trim()) return;
    // Příznak až v časovači – úklid efektu (StrictMode) časovač zruší a další běh ho naplánuje znovu
    const t = setTimeout(() => { autoHledano.current = true; void vyhledat(); }, 250);
    return () => clearTimeout(t);
    // vyhledat se mění s každým renderem; stačí jednou po otevření
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, vychoziOdkud, vychoziKam]);

  const jednaCesta = trasa?.km ?? null;
  const vypocteno = jednaCesta !== null ? Math.round(jednaCesta * (tamIZpet ? 2 : 1)) : null;
  const rucne = Number(rucneKm.replace(',', '.'));
  const vysledneKm = rucneKm.trim() && Number.isFinite(rucne) && rucne > 0 ? Math.round(rucne) : vypocteno;
  const sazbaCislo = Math.max(0, Number(sazba.replace(',', '.')) || 0);
  const kc = (n: number) => new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 2 }).format(n);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Doprava – trasa na mapě"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button disabled={!vysledneKm} onClick={() => vysledneKm && onPouzit({ km: vysledneKm, tamIZpet, sazba: sazbaCislo, odkud: odkud.trim(), kam: kam.trim() })}>
            {vysledneKm ? `Použít ${vysledneKm} km` : 'Použít'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <Input label="Odkud (A)" value={odkud} onChange={e => setOdkud(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void vyhledat(); } }} />
          <Input label="Kam (B)" value={kam} onChange={e => setKam(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void vyhledat(); } }} />
          <Button variant="secondary" disabled={hledam || (!odkud.trim() && !kam.trim())} onClick={() => void vyhledat()}>
            {hledam ? 'Hledám…' : 'Najít na mapě'}
          </Button>
        </div>

        <div ref={mapEl} className="h-[340px] sm:h-[420px] w-full rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden z-0" />
        <p className="m-0 text-xs text-[var(--text-secondary)]">
          Klikem do mapy přidáte průjezdní bod (trasa jím povede), body A, B i průjezdní jdou přetáhnout, klik na průjezdní bod ho odebere.
          {pres.length > 0 && (
            <button type="button" onClick={() => setPres([])} className="ml-2 font-medium text-[var(--primary-text)] hover:underline">Zrušit průjezdní body ({pres.length})</button>
          )}
        </p>

        {chyba && <p role="alert" className="m-0 text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] rounded-[var(--radius-md)] px-3 py-2">{chyba}</p>}

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-[var(--radius-md)] bg-[var(--bg-faint)] border border-[var(--border)] px-4 py-3">
          <div>
            <p className="m-0 text-xs text-[var(--text-secondary)]">Trasa tam</p>
            <p className="m-0 text-[17px] font-bold tabular-nums text-[var(--text)]">
              {jednaCesta !== null ? `${fmtKm(jednaCesta)} km` : '—'}
              {trasa && <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">≈ {Math.round(trasa.minut)} min</span>}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--text)] min-h-[40px]">
            <input type="checkbox" className="w-4 h-4 accent-[var(--primary)]" checked={tamIZpet} onChange={e => setTamIZpet(e.target.checked)} />
            Tam i zpět
          </label>
          <div>
            <p className="m-0 text-xs text-[var(--text-secondary)]">Do nabídky</p>
            <p className="m-0 text-[17px] font-bold tabular-nums text-[var(--primary-text)]">{vysledneKm ? `${vysledneKm} km` : '—'}</p>
          </div>
          <div className="w-32">
            <Input label="Upravit ručně (km)" inputMode="decimal" placeholder={vypocteno ? String(vypocteno) : ''} value={rucneKm} onChange={e => setRucneKm(e.target.value)} />
          </div>
          <div className="w-28">
            <Input label="Sazba (Kč/km)" inputMode="decimal" value={sazba} onChange={e => setSazba(e.target.value)} />
          </div>
          <div className="ml-auto text-right">
            <p className="m-0 text-xs text-[var(--text-secondary)]">Cena dopravy</p>
            <p className="m-0 text-[17px] font-bold tabular-nums text-[var(--text)]">
              {vysledneKm ? `${kc(vysledneKm * sazbaCislo)} Kč` : '—'}
            </p>
            {vysledneKm ? <p className="m-0 text-[11px] text-[var(--text-muted)] tabular-nums">{vysledneKm} km × {kc(sazbaCislo)} Kč</p> : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default TrasaModal;
