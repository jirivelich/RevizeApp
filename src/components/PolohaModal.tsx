/**
 * Výběr polohy zakázky na mapě (OpenStreetMap). Najde adresu, špendlík jde přetáhnout
 * nebo přesunout klikem do mapy. Uložená poloha pak slouží pro navigaci (přesnější než adresa,
 * např. u trafostanice nebo haly bez čísla popisného).
 */
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button, Modal } from './ui';
import { najdiAdresu, OSM_DLAZDICE, OSM_ATRIBUCE, type Bod } from '../utils/mapy';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUlozit: (bod: Bod) => void;
  adresa: string;
  /** Už uložená poloha (má přednost před hledáním adresy). */
  poloha?: Bod | null;
}

const spendlik = L.divIcon({
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  html: `<svg width="30" height="30" viewBox="0 0 24 24" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="#dc2626" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>`,
});

export function PolohaModal({ isOpen, onClose, onUlozit, adresa, poloha }: Props) {
  const [bod, setBod] = useState<Bod | null>(poloha ?? null);
  const [stav, setStav] = useState<string | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const znacka = useRef<L.Marker | null>(null);
  // Počáteční poloha – jen při otevření (rodič ji předává jako nový objekt při každém renderu)
  const pocatek = useRef(poloha ?? null);

  useEffect(() => {
    if (!isOpen || !mapEl.current) return;
    const p0 = pocatek.current;
    const m = L.map(mapEl.current).setView(p0 ? [p0.lat, p0.lng] : [49.8, 15.5], p0 ? 17 : 7);
    L.tileLayer(OSM_DLAZDICE, { maxZoom: 19, attribution: OSM_ATRIBUCE }).addTo(m);
    m.on('click', e => setBod({ lat: e.latlng.lat, lng: e.latlng.lng }));
    mapa.current = m;
    const t = setTimeout(() => m.invalidateSize(), 200);
    return () => { clearTimeout(t); m.remove(); mapa.current = null; znacka.current = null; };
  }, [isOpen]);

  // Bez uložené polohy: najít adresu
  useEffect(() => {
    if (!isOpen) return;
    const p0 = pocatek.current;
    setBod(p0);
    if (p0 || !adresa.trim()) { setStav(p0 ? null : 'Klikněte do mapy na místo zakázky.'); return; }
    let zruseno = false;
    setStav('Hledám adresu…');
    najdiAdresu(adresa)
      .then(r => {
        if (zruseno) return;
        if (!r) { setStav(`Adresu „${adresa}“ se nepodařilo najít – klikněte do mapy na místo zakázky.`); return; }
        setBod(r.bod);
        setStav('Podle adresy. Zkontrolujte místo – špendlík jde přetáhnout nebo přesunout klikem.');
        mapa.current?.setView([r.bod.lat, r.bod.lng], 17);
      })
      .catch(() => { if (!zruseno) setStav('Vyhledání adresy selhalo – klikněte do mapy na místo zakázky.'); });
    return () => { zruseno = true; };
  }, [isOpen, adresa]);

  // Značka
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    if (!bod) { znacka.current?.remove(); znacka.current = null; return; }
    if (!znacka.current) {
      const mk = L.marker([bod.lat, bod.lng], { draggable: true, icon: spendlik, title: 'Místo zakázky' }).addTo(m);
      mk.on('dragend', () => { const p = mk.getLatLng(); setBod({ lat: p.lat, lng: p.lng }); });
      znacka.current = mk;
    } else {
      znacka.current.setLatLng([bod.lat, bod.lng]);
    }
  }, [bod]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Poloha zakázky"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button disabled={!bod} onClick={() => bod && onUlozit(bod)}>Uložit polohu</Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <p className="m-0 text-sm text-[var(--text)]">{adresa || 'Bez adresy'}</p>
        <div ref={mapEl} className="h-[360px] w-full rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden z-0" />
        <p className="m-0 text-xs text-[var(--text-secondary)]">
          {stav ?? 'Špendlík jde přetáhnout nebo přesunout klikem do mapy.'}
          {bod && <span className="ml-2 tabular-nums text-[var(--text-muted)]">{bod.lat.toFixed(5)}, {bod.lng.toFixed(5)}</span>}
        </p>
      </div>
    </Modal>
  );
}

export default PolohaModal;
