import { Link } from 'react-router-dom';
import type { Revize, Firma, Nastaveni, Zakaznik } from '../../types';

interface InfoTabProps {
  revize: Revize;
  formData: Partial<Revize>;
  setFormData: (data: Partial<Revize>) => void;
  firmy: Firma[];
  selectedFirmaId: string;
  setSelectedFirmaId: (id: string) => void;
  nastaveni: Nastaveni | null;
  zakaznici: Zakaznik[];
  selectedZakaznikId: string;
  setSelectedZakaznikId: (id: string) => void;
}

export function InfoTab({
  revize, formData, setFormData,
  firmy, selectedFirmaId, setSelectedFirmaId,
  nastaveni, zakaznici, selectedZakaznikId, setSelectedZakaznikId,
}: InfoTabProps) {
  return (
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm max-w-4xl mx-auto">

      {/* Záhlaví */}
      <div className="flex items-center px-4 py-2 bg-slate-50 border-b border-slate-200">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Revizní zpráva č. {revize.cisloRevize}</span>
      </div>

      {/* ═══ SEKCE 1: IDENTIFIKACE ═══ */}
      <div className="bg-slate-800 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Identifikace revize</div>
      <table className="w-full text-sm border-collapse">
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="w-[180px] px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Číslo revize</td>
            <td className="px-4 py-2">
              <input className="w-full bg-slate-100 px-2 py-1 rounded text-sm border border-slate-300 cursor-not-allowed" value={formData.cisloRevize || ''} disabled />
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Název objektu</td>
            <td className="px-4 py-2">
              <input className="w-full px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.nazev || ''} onChange={(e) => setFormData({ ...formData, nazev: e.target.value })} />
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Adresa objektu</td>
            <td className="px-4 py-2">
              <input className="w-full px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.adresa || ''} onChange={(e) => setFormData({ ...formData, adresa: e.target.value })} />
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Kategorie</td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {formData.kategorieRevize === 'elektro' ? 'Elektrické instalace' :
                   formData.kategorieRevize === 'hromosvod' ? 'Hromosvody' :
                   formData.kategorieRevize === 'stroje' ? 'Strojní zařízení' : 'Elektro'}
                </span>
                <span className="text-xs text-slate-400">Nastaveno při vytvoření</span>
              </div>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Typ revize</td>
            <td className="px-4 py-2">
              <select className="px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.typRevize || ''} onChange={(e) => setFormData({ ...formData, typRevize: e.target.value as any })}>
                <option value="pravidelná">Pravidelná</option>
                <option value="výchozí">Výchozí</option>
                <option value="mimořádná">Mimořádná</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ SEKCE 2: OBJEDNATEL ═══ */}
      <div className="bg-slate-800 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Objednatel / Provozovatel</div>
      <table className="w-full text-sm border-collapse">
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="w-[180px] px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Objednatel</td>
            <td className="px-4 py-2">
              <input className="w-full px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Nebo vyberte zákazníka níže" value={formData.objednatel || ''} onChange={(e) => setFormData({ ...formData, objednatel: e.target.value })} />
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Ze zákazníků</td>
            <td className="px-4 py-2">
              <select className="w-full px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={selectedZakaznikId} onChange={(e) => {
                const zakaznikId = e.target.value;
                setSelectedZakaznikId(zakaznikId);
                if (zakaznikId) { const zakaznik = zakaznici.find(z => z.id === parseInt(zakaznikId)); if (zakaznik) setFormData({ ...formData, objednatel: zakaznik.nazev, zakaznikId: zakaznik.id }); }
                else { setFormData({ ...formData, zakaznikId: undefined }); }
              }}>
                <option value="">-- Vyberte zákazníka --</option>
                {zakaznici.filter(z => z.id !== undefined).map(z => <option key={z.id} value={z.id!.toString()}>{z.nazev}{z.adresa ? ` (${z.adresa})` : ''}</option>)}
              </select>
              {selectedZakaznikId && (() => {
                const zakaznik = zakaznici.find(z => z.id === parseInt(selectedZakaznikId));
                return zakaznik ? (
                  <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-500 bg-blue-50 rounded p-2">
                    {zakaznik.adresa && <span>Adresa: {zakaznik.adresa}</span>}
                    {zakaznik.ico && <span>IČO: {zakaznik.ico}</span>}
                    {zakaznik.kontaktOsoba && <span>Kontakt: {zakaznik.kontaktOsoba}</span>}
                    {zakaznik.telefon && <span>Tel: {zakaznik.telefon}</span>}
                  </div>
                ) : null;
              })()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ SEKCE 3: TERMÍNY ═══ */}
      <div className="bg-slate-800 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Termíny a data</div>
      <table className="w-full text-sm border-collapse">
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="w-[180px] px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Datum revize</td>
            <td className="px-4 py-2"><input type="date" className="px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.datum || ''} onChange={(e) => setFormData({ ...formData, datum: e.target.value })} /></td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Datum dokončení</td>
            <td className="px-4 py-2"><input type="date" className="px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.datumDokonceni || ''} onChange={(e) => setFormData({ ...formData, datumDokonceni: e.target.value })} /></td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Datum vypracování</td>
            <td className="px-4 py-2"><input type="date" className="px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.datumVypracovani || ''} onChange={(e) => setFormData({ ...formData, datumVypracovani: e.target.value })} /></td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Lhůta platnosti</td>
            <td className="px-4 py-2">
              <select className="px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={String(formData.termin || 36)} onChange={(e) => setFormData({ ...formData, termin: parseInt(e.target.value) })}>
                <option value="6">6 měsíců</option><option value="12">1 rok</option><option value="24">2 roky</option><option value="36">3 roky</option><option value="48">4 roky</option><option value="60">5 let</option>
              </select>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Platnost do</td>
            <td className="px-4 py-2"><span className={`font-medium ${formData.datumPlatnosti ? '' : 'text-slate-400'}`}>{formData.datumPlatnosti ? new Date(formData.datumPlatnosti).toLocaleDateString('cs-CZ') : 'Vypočítá se při dokončení'}</span></td>
          </tr>
        </tbody>
      </table>

      {/* ═══ SEKCE 4: STAV ═══ */}
      <div className="bg-slate-800 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Stav a výsledek revize</div>
      <table className="w-full text-sm border-collapse">
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="w-[180px] px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Stav</td>
            <td className="px-4 py-2">
              <select className="px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.stav || ''} onChange={(e) => setFormData({ ...formData, stav: e.target.value as any })}>
                <option value="rozpracováno">Rozpracováno</option><option value="dokončeno">Dokončeno</option><option value="schváleno">Schváleno</option>
              </select>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Výsledek</td>
            <td className="px-4 py-2">
              <select className="px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.vysledek || ''} onChange={(e) => setFormData({ ...formData, vysledek: e.target.value as any })}>
                <option value="">-- Nevyplněno --</option><option value="schopno">Schopno provozu</option><option value="neschopno">Neschopno provozu</option><option value="podmíněně schopno">Podmíněně schopno</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ SEKCE 5: FIRMA ═══ */}
      <div className="bg-slate-800 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Firma provádějící revizi</div>
      <div className="p-4 space-y-3 border-b border-slate-200">
        <select className="w-full px-2 py-1.5 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={selectedFirmaId} onChange={(e) => {
          const firmaId = e.target.value;
          setSelectedFirmaId(firmaId);
          if (firmaId === '') { setFormData({ ...formData, firmaJmeno: '', firmaIco: '', firmaAdresa: '', firmaDic: '' }); }
          else { const firma = firmy.find(f => f.id?.toString() === firmaId); if (firma) setFormData({ ...formData, firmaJmeno: firma.nazev, firmaIco: firma.ico || '', firmaAdresa: firma.adresa || '', firmaDic: firma.dic || '' }); }
        }}>
          <option value="">Použít firmu z nastavení</option>
          {firmy.map(f => <option key={f.id} value={f.id!.toString()}>{f.nazev}</option>)}
        </select>
        <table className="w-full text-sm border border-slate-200 rounded overflow-hidden">
          <tbody>
            <tr className="border-b border-slate-200"><td className="w-[140px] px-3 py-1.5 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200 text-xs">Název firmy</td><td className="px-3 py-1.5"><input className="w-full px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Ponechte prázdné → firma z nastavení" value={formData.firmaJmeno || ''} onChange={(e) => setFormData({ ...formData, firmaJmeno: e.target.value })} /></td></tr>
            <tr className="border-b border-slate-200"><td className="px-3 py-1.5 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200 text-xs">IČO</td><td className="px-3 py-1.5"><input className="w-full px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.firmaIco || ''} onChange={(e) => setFormData({ ...formData, firmaIco: e.target.value })} /></td></tr>
            <tr className="border-b border-slate-200"><td className="px-3 py-1.5 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200 text-xs">Adresa</td><td className="px-3 py-1.5"><input className="w-full px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.firmaAdresa || ''} onChange={(e) => setFormData({ ...formData, firmaAdresa: e.target.value })} /></td></tr>
            <tr><td className="px-3 py-1.5 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200 text-xs">DIČ</td><td className="px-3 py-1.5"><input className="w-full px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.firmaDic || ''} onChange={(e) => setFormData({ ...formData, firmaDic: e.target.value })} /></td></tr>
          </tbody>
        </table>
        {selectedFirmaId === '' && nastaveni && (nastaveni.firmaJmeno || nastaveni.firmaIco) && (
          <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">📋 Z nastavení: <strong>{nastaveni.firmaJmeno}</strong> | IČO: {nastaveni.firmaIco || '—'} | {nastaveni.firmaAdresa || '—'}</div>
        )}
        {selectedFirmaId === '' && (!nastaveni || (!nastaveni.firmaJmeno && !nastaveni.firmaIco)) && (
          <p className="text-xs text-amber-600">⚠️ Nemáte výchozí firmu. <Link to="/nastaveni" className="underline font-medium">Nastavení</Link></p>
        )}
        {firmy.length === 0 && <p className="text-xs text-amber-600">💡 Tip: Seznam firem → <Link to="/firmy" className="underline font-medium">Firmy</Link></p>}
      </div>
    </div>
  );
}
