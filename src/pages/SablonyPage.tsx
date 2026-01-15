import { useEffect, useState, useRef } from 'react';
import { Button, Card, Input, Modal } from '../components/ui';
import { sablonaService, nastaveniService, revizeService } from '../services/database';
import type { Sablona, Nastaveni, Revize } from '../types';

interface DragItem {
  id: string;
  index: number;
}

export function SablonyPage() {
  const [sablony, setSablony] = useState<Sablona[]>([]);
  const [selectedSablona, setSelectedSablona] = useState<Sablona | null>(null);
  const [nastaveni, setNastaveni] = useState<Nastaveni | null>(null);
  const [previewRevize, setPreviewRevize] = useState<Revize | null>(null);
  const [formData, setFormData] = useState<Partial<Sablona>>({});
  const [activeTab, setActiveTab] = useState<'uvodni' | 'sekce' | 'sloupce' | 'styly'>('uvodni');
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSablonaName, setNewSablonaName] = useState('');
  
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const sablonyData = await sablonaService.getAll();
    setSablony(sablonyData);
    
    const nastaveniData = await nastaveniService.get();
    setNastaveni(nastaveniData || null);
    
    // Načíst první revizi pro náhled
    const revize = await revizeService.getAll();
    if (revize.length > 0) {
      setPreviewRevize(revize[0]);
    } else {
      // Vytvořit demo revizi pro náhled
      setPreviewRevize({
        id: 0,
        cisloRevize: 'REV-2026-001',
        nazev: 'Ukázková revize',
        adresa: 'Příkladná 123, Praha 1',
        objednatel: 'Jan Novák',
        kategorieRevize: 'elektro',
        datum: new Date().toISOString(),
        datumPlatnosti: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        termin: 12,
        datumVypracovani: new Date().toISOString(),
        typRevize: 'pravidelná',
        stav: 'dokončeno',
        vysledek: 'schopno',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    // Pokud nejsou žádné šablony, vytvořit výchozí
    if (sablonyData.length === 0) {
      const defaultSablona = sablonaService.getDefaultSablona();
      await sablonaService.create(defaultSablona);
      const newData = await sablonaService.getAll();
      setSablony(newData);
      if (newData[0]) {
        setSelectedSablona(newData[0]);
        setFormData(newData[0]);
      }
    } else if (!selectedSablona && sablonyData[0]) {
      const vychozi = sablonyData.find(s => s.jeVychozi) || sablonyData[0];
      setSelectedSablona(vychozi);
      setFormData(vychozi);
    }
  };

  const handleSelectSablona = (sablona: Sablona) => {
    setSelectedSablona(sablona);
    setFormData(sablona);
  };

  const handleSave = async () => {
    if (selectedSablona?.id && formData) {
      await sablonaService.update(selectedSablona.id, formData);
      await loadData();
    }
  };

  const handleCreateNew = async () => {
    if (!newSablonaName.trim()) return;
    
    const defaultSablona = sablonaService.getDefaultSablona();
    defaultSablona.nazev = newSablonaName.trim();
    defaultSablona.jeVychozi = false;
    const newId = await sablonaService.create(defaultSablona);
    await loadData();
    const newSablona = await sablonaService.getById(newId);
    if (newSablona) {
      setSelectedSablona(newSablona);
      setFormData(newSablona);
    }
    setIsCreateModalOpen(false);
    setNewSablonaName('');
  };

  const handleDelete = async () => {
    if (selectedSablona?.id && !selectedSablona.jeVychozi && window.confirm('Opravdu chcete smazat tuto šablonu?')) {
      await sablonaService.delete(selectedSablona.id);
      setSelectedSablona(null);
      setFormData({});
      await loadData();
    }
  };

  const handleSetVychozi = async () => {
    if (selectedSablona?.id) {
      await sablonaService.update(selectedSablona.id, { jeVychozi: true });
      await loadData();
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string, index: number) => {
    setDraggedItem({ id, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.index === index) return;
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem || !formData.sekce) return;

    const sortedSekce = [...formData.sekce].sort((a, b) => a.poradi - b.poradi);
    const draggedSekce = sortedSekce[draggedItem.index];
    
    sortedSekce.splice(draggedItem.index, 1);
    sortedSekce.splice(targetIndex, 0, draggedSekce);
    
    const updatedSekce = sortedSekce.map((s, i) => ({ ...s, poradi: i + 1 }));
    setFormData({ ...formData, sekce: updatedSekce });
    setDraggedItem(null);
  };

  const handleToggleSekce = (sekceId: string) => {
    if (formData.sekce) {
      const newSekce = formData.sekce.map(s => 
        s.id === sekceId ? { ...s, enabled: !s.enabled } : s
      );
      setFormData({ ...formData, sekce: newSekce });
    }
  };

  const handleToggleSloupec = (sloupecId: string) => {
    if (formData.sloupceOkruhu) {
      const newSloupce = formData.sloupceOkruhu.map(s => 
        s.id === sloupecId ? { ...s, enabled: !s.enabled } : s
      );
      setFormData({ ...formData, sloupceOkruhu: newSloupce });
    }
  };

  // Render náhled úvodní strany
  const renderPreview = () => {
    if (!formData || !previewRevize) return null;

    const primaryColor = formData.barvaPrimary || '#1e40af';
    const secondaryColor = formData.barvaSecondary || '#64748b';

    // Demo data pro náhled
    const demoRozvadece = [
      { nazev: 'Hlavní rozvaděč', oznaceni: 'HR-1', umisteni: 'Vstupní hala' },
      { nazev: 'Rozvaděč kuchyně', oznaceni: 'RK-1', umisteni: 'Kuchyň' },
    ];
    
    const demoOkruhy = [
      { cislo: '1', jistic: 'B16', nazev: 'Zásuvky obývák', vodic: '3x2.5', izolacniOdpor: '>200', impedanceSmycky: '0.8' },
      { cislo: '2', jistic: 'B10', nazev: 'Osvětlení', vodic: '3x1.5', izolacniOdpor: '>200', impedanceSmycky: '0.5' },
      { cislo: '3', jistic: 'C16', nazev: 'Sporák', vodic: '5x2.5', izolacniOdpor: '>200', impedanceSmycky: '0.9' },
      { cislo: '4', jistic: 'B16', nazev: 'Zásuvky kuchyň', vodic: '3x2.5', izolacniOdpor: '>200', impedanceSmycky: '0.7' },
    ];

    const demoZavady = [
      { popis: 'Chybí kryt zásuvky v koupelně', zavaznost: 'C2' },
      { popis: 'Poškozená izolace vodiče', zavaznost: 'C1' },
    ];

    // Funkce pro render záhlaví stránky
    const renderHeader = () => (
      <div 
        className="px-2 pt-1 pb-1 border-b flex justify-between items-center"
        style={{ borderColor: primaryColor, fontSize: '5px' }}
      >
        <span style={{ color: primaryColor, fontWeight: 'bold' }}>{previewRevize.cisloRevize}</span>
        <span style={{ color: secondaryColor }}>{previewRevize.nazev || 'Název objektu'}</span>
        <span style={{ color: secondaryColor }}>{new Date().toLocaleDateString('cs-CZ')}</span>
      </div>
    );

    // Funkce pro render zápatí stránky
    const renderFooter = (pageNum: number, totalPages: number) => (
      <div 
        className="absolute bottom-0 left-0 right-0 px-2 py-1 border-t flex justify-between"
        style={{ borderColor: secondaryColor, fontSize: '4px', color: secondaryColor }}
      >
        <span>{new Date().toLocaleDateString('cs-CZ')}</span>
        <span>Strana {pageNum} z {totalPages}</span>
        <span>{formData.zapatiCustomText || ''}</span>
      </div>
    );

    // Styl stránky
    const pageStyle = {
      width: '210px', 
      minHeight: '297px',
      fontFamily: formData.fontFamily || 'Arial'
    };

    return (
      <div className="flex flex-col gap-4">
        {/* Strana 1 - Úvodní strana */}
        <div 
          ref={previewRef}
          className="bg-white shadow-xl border border-slate-300 relative"
          style={pageStyle}
        >
          {renderHeader()}

          {/* Obsah stránky */}
          <div className="p-3">
            {/* Firma a technik NAHOŘE vedle sebe */}
            {(formData.uvodniStranaZobrazitFirmu !== false || formData.uvodniStranaZobrazitTechnika !== false) && (
              <div className="grid grid-cols-2 gap-1 mb-2" style={{ fontSize: '4px' }}>
                {formData.uvodniStranaZobrazitFirmu !== false && (
                  <div className="border border-slate-200">
                    <div className="px-1 py-0.5 font-bold text-white" style={{ backgroundColor: primaryColor, fontSize: '3.5px' }}>
                      FIRMA
                    </div>
                    <div className="p-1 flex gap-1">
                      {nastaveni?.logo && (
                        <img 
                          src={nastaveni.logo} 
                          alt="Logo" 
                          className="object-contain"
                          style={{ width: '15px', height: '12px' }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-bold" style={{ fontSize: '4.5px' }}>
                          {nastaveni?.firmaJmeno || 'Název firmy'}
                        </div>
                        <div className="text-slate-500" style={{ fontSize: '3.5px' }}>
                          {nastaveni?.firmaAdresa || 'Adresa firmy'}
                        </div>
                        <div className="text-slate-500" style={{ fontSize: '3.5px' }}>
                          IČO: {nastaveni?.firmaIco || 'XXX'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {formData.uvodniStranaZobrazitTechnika !== false && (
                  <div className="border border-slate-200">
                    <div className="px-1 py-0.5 font-bold text-white" style={{ backgroundColor: primaryColor, fontSize: '3.5px' }}>
                      REVIZNÍ TECHNIK
                    </div>
                    <div className="p-1">
                      <div className="font-bold" style={{ fontSize: '4.5px' }}>
                        {nastaveni?.reviznniTechnikJmeno || 'Jméno technika'}
                      </div>
                      <div className="text-slate-500" style={{ fontSize: '3.5px' }}>
                        Ev. č.: {nastaveni?.reviznniTechnikCisloOpravneni || 'XXX'}
                      </div>
                      <div className="text-slate-500" style={{ fontSize: '3.5px' }}>
                        Tel.: {nastaveni?.kontaktTelefon || ''}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hlavní nadpis */}
            <div 
              className={`text-center mb-2 py-1 ${formData.uvodniStranaNadpisRamecek !== false ? 'border-2' : ''}`}
              style={{ 
                borderColor: formData.uvodniStranaNadpisRamecek !== false ? primaryColor : 'transparent', 
                fontSize: `${Math.max(4, (formData.uvodniStranaNadpisFontSize || 18) / 3)}px` 
              }}
            >
              <span className="font-bold" style={{ color: primaryColor }}>
                {formData.uvodniStranaNadpis || 'ZPRÁVA O REVIZI ELEKTRICKÉ INSTALACE'}
              </span>
            </div>

            {/* Základní údaje - 4 sloupce na řádek */}
            <div className="mb-2" style={{ fontSize: '4.5px' }}>
              <div className="grid grid-cols-4 gap-px bg-slate-300">
                <div className="bg-slate-50 p-1">
                  <span className="text-slate-400 block" style={{ fontSize: '3px' }}>Číslo zprávy:</span>
                  <span className="font-medium" style={{ fontSize: '4px' }}>{previewRevize.cisloRevize}</span>
                </div>
                <div className="bg-slate-50 p-1">
                  <span className="text-slate-400 block" style={{ fontSize: '3px' }}>Druh revize:</span>
                  <span className="font-medium" style={{ fontSize: '4px' }}>{previewRevize.typRevize}</span>
                </div>
                <div className="bg-slate-50 p-1">
                  <span className="text-slate-400 block" style={{ fontSize: '3px' }}>Datum provedení:</span>
                  <span className="font-medium" style={{ fontSize: '4px' }}>{new Date(previewRevize.datum).toLocaleDateString('cs-CZ')}</span>
                </div>
                <div className="bg-slate-50 p-1">
                  <span className="text-slate-400 block" style={{ fontSize: '3px' }}>Platnost do:</span>
                  <span className="font-medium" style={{ fontSize: '4px' }}>{previewRevize.datumPlatnosti ? new Date(previewRevize.datumPlatnosti).toLocaleDateString('cs-CZ') : '-'}</span>
                </div>
              </div>
            </div>

            {/* Údaje o objektu */}
            {formData.uvodniStranaZobrazitObjekt !== false && (
              <div className="mb-2">
                <div 
                  className="px-1 py-0.5 font-bold text-white"
                  style={{ backgroundColor: secondaryColor, fontSize: '4px' }}
                >
                  ÚDAJE O OBJEKTU
                </div>
                <div className="border border-slate-300 p-1" style={{ fontSize: '4.5px' }}>
                  <div className="text-slate-400" style={{ fontSize: '3.5px' }}>Adresa:</div>
                  <div>{previewRevize.adresa}</div>
                </div>
              </div>
            )}

            {/* Vyhodnocení */}
            {formData.uvodniStranaZobrazitVyhodnoceni !== false && (
              <div className="mb-2">
                <div 
                  className="px-1 py-0.5 font-bold text-white"
                  style={{ backgroundColor: secondaryColor, fontSize: '4px' }}
                >
                  VYHODNOCENÍ REVIZE
                </div>
                <div 
                  className="border-2 p-1 text-center font-bold mt-0.5"
                  style={{ 
                    borderColor: '#16a34a',
                    color: '#16a34a',
                    fontSize: '4.5px'
                  }}
                >
                  Elektrická instalace JE SCHOPNA bezpečného provozu
                </div>
              </div>
            )}
          </div>

          {/* Podpisy na spodku stránky */}
          {formData.uvodniStranaZobrazitPodpisy !== false && (
            <div className="absolute left-3 right-3" style={{ bottom: '22px' }}>
              <div className="grid grid-cols-2 gap-2 mt-1" style={{ fontSize: '3.5px' }}>
                <div>
                  <div className="text-slate-500">Revizní technik:</div>
                  <div className="border-b border-slate-400 mt-2 mb-0.5"></div>
                  <div className="text-center text-slate-400" style={{ fontSize: '3px' }}>podpis</div>
                </div>
                <div>
                  <div className="text-slate-500">Objednatel:</div>
                  <div className="border-b border-slate-400 mt-2 mb-0.5"></div>
                  <div className="text-center text-slate-400" style={{ fontSize: '3px' }}>podpis</div>
                </div>
              </div>
            </div>
          )}

          {renderFooter(1, 4)}
        </div>

        {/* Strana 2 - Rozvaděče a okruhy */}
        <div 
          className="bg-white shadow-xl border border-slate-300 relative"
          style={pageStyle}
        >
          {renderHeader()}
          <div className="p-3">
            {/* Nadpis sekce */}
            <div className="mb-2">
              <div className="font-bold" style={{ color: primaryColor, fontSize: '5px' }}>
                2. Rozvaděče a okruhy
              </div>
              <div className="border-b" style={{ borderColor: secondaryColor }}></div>
            </div>

            {/* Demo rozvaděče */}
            {demoRozvadece.map((roz, idx) => (
              <div key={idx} className="mb-3">
                <div className="font-bold mb-1" style={{ fontSize: '4.5px', color: '#374151' }}>
                  {roz.nazev} ({roz.oznaceni})
                </div>
                <div className="text-slate-500 mb-1" style={{ fontSize: '3.5px' }}>
                  Umístění: {roz.umisteni}
                </div>
                
                {/* Tabulka okruhů */}
                <table className="w-full border-collapse" style={{ fontSize: '3.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: primaryColor, color: 'white' }}>
                      <th className="border border-slate-300 p-0.5 text-left">Č.</th>
                      <th className="border border-slate-300 p-0.5 text-left">Jistič</th>
                      <th className="border border-slate-300 p-0.5 text-left">Název</th>
                      <th className="border border-slate-300 p-0.5 text-left">Vodič</th>
                      <th className="border border-slate-300 p-0.5 text-left">Iz. odpor</th>
                      <th className="border border-slate-300 p-0.5 text-left">Imp.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoOkruhy.slice(idx * 2, idx * 2 + 2).map((okr, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="border border-slate-300 p-0.5">{okr.cislo}</td>
                        <td className="border border-slate-300 p-0.5">{okr.jistic}</td>
                        <td className="border border-slate-300 p-0.5">{okr.nazev}</td>
                        <td className="border border-slate-300 p-0.5">{okr.vodic}</td>
                        <td className="border border-slate-300 p-0.5">{okr.izolacniOdpor}</td>
                        <td className="border border-slate-300 p-0.5">{okr.impedanceSmycky}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Sekce provedené úkony */}
            <div className="mt-3 mb-2">
              <div className="font-bold" style={{ color: primaryColor, fontSize: '5px' }}>
                3. Provedené úkony
              </div>
              <div className="border-b mb-1" style={{ borderColor: secondaryColor }}></div>
              <div style={{ fontSize: '3.5px', color: '#374151' }}>
                Prohlídka elektrického zařízení, kontrola dokumentace, měření izolačního odporu, 
                měření impedance smyčky, kontrola proudových chráničů, kontrola spojitosti ochranných vodičů...
              </div>
            </div>
          </div>
          {renderFooter(2, 4)}
        </div>

        {/* Strana 3 - Závěr */}
        <div 
          className="bg-white shadow-xl border border-slate-300 relative"
          style={pageStyle}
        >
          {renderHeader()}
          <div className="p-3">
            {/* Nadpis sekce */}
            <div className="mb-2">
              <div className="font-bold" style={{ color: primaryColor, fontSize: '5px' }}>
                4. Závěr revize
              </div>
              <div className="border-b" style={{ borderColor: secondaryColor }}></div>
            </div>

            {/* Výsledek */}
            <div 
              className="border-2 p-2 text-center font-bold mb-3"
              style={{ borderColor: '#16a34a', color: '#16a34a', fontSize: '5px' }}
            >
              ELEKTRICKÉ ZAŘÍZENÍ JE SCHOPNO BEZPEČNÉHO PROVOZU
            </div>

            {/* Statistiky */}
            <div className="mb-3" style={{ fontSize: '4px', color: '#374151' }}>
              <div>Počet kontrolovaných rozvaděčů: {demoRozvadece.length}</div>
              <div>Počet kontrolovaných okruhů: {demoOkruhy.length}</div>
              <div>Počet zjištěných závad: {demoZavady.length}</div>
            </div>

            {/* Podpisy */}
            <div className="mt-4">
              <div className="font-bold mb-2" style={{ color: primaryColor, fontSize: '5px' }}>
                5. Podpisy
              </div>
              <div className="border-b mb-2" style={{ borderColor: secondaryColor }}></div>
              <div className="grid grid-cols-2 gap-4" style={{ fontSize: '3.5px' }}>
                <div>
                  <div className="text-slate-500">Revizní technik:</div>
                  <div className="font-medium mt-1">{nastaveni?.reviznniTechnikJmeno || 'Jméno technika'}</div>
                  <div className="border-b border-slate-400 mt-4 mb-0.5"></div>
                  <div className="text-center text-slate-400" style={{ fontSize: '3px' }}>podpis</div>
                </div>
                <div>
                  <div className="text-slate-500">Objednatel:</div>
                  <div className="font-medium mt-1">{previewRevize.objednatel}</div>
                  <div className="border-b border-slate-400 mt-4 mb-0.5"></div>
                  <div className="text-center text-slate-400" style={{ fontSize: '3px' }}>podpis</div>
                </div>
              </div>
            </div>
          </div>
          {renderFooter(3, 4)}
        </div>

        {/* Strana 4 - Příloha závady */}
        <div 
          className="bg-white shadow-xl border border-slate-300 relative"
          style={{ ...pageStyle, width: '297px', minHeight: '210px' }}
        >
          <div 
            className="px-2 pt-1 pb-1 border-b flex justify-between items-center"
            style={{ borderColor: primaryColor, fontSize: '5px' }}
          >
            <span style={{ color: primaryColor, fontWeight: 'bold' }}>PŘÍLOHA - Zjištěné závady</span>
            <span style={{ color: secondaryColor }}>{previewRevize.cisloRevize}</span>
          </div>
          <div className="p-3">
            {/* Tabulka závad */}
            <table className="w-full border-collapse" style={{ fontSize: '4px' }}>
              <thead>
                <tr style={{ backgroundColor: primaryColor, color: 'white' }}>
                  <th className="border border-slate-300 p-1 text-left" style={{ width: '5%' }}>Č.</th>
                  <th className="border border-slate-300 p-1 text-left" style={{ width: '50%' }}>Popis závady</th>
                  <th className="border border-slate-300 p-1 text-left" style={{ width: '10%' }}>Závažnost</th>
                  <th className="border border-slate-300 p-1 text-left" style={{ width: '35%' }}>Fotodokumentace</th>
                </tr>
              </thead>
              <tbody>
                {demoZavady.map((z, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="border border-slate-300 p-1">{i + 1}</td>
                    <td className="border border-slate-300 p-1">{z.popis}</td>
                    <td className="border border-slate-300 p-1">
                      <span 
                        className="px-1 py-0.5 rounded text-white"
                        style={{ 
                          backgroundColor: z.zavaznost === 'C1' ? '#ef4444' : z.zavaznost === 'C2' ? '#f59e0b' : '#22c55e',
                          fontSize: '3.5px'
                        }}
                      >
                        {z.zavaznost}
                      </span>
                    </td>
                    <td className="border border-slate-300 p-1">
                      <div className="flex gap-1">
                        <div className="bg-slate-200 rounded" style={{ width: '25px', height: '20px' }}></div>
                        <div className="bg-slate-200 rounded" style={{ width: '25px', height: '20px' }}></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legenda */}
            <div className="mt-3 flex gap-4" style={{ fontSize: '3.5px' }}>
              <div className="flex items-center gap-1">
                <span className="px-1 py-0.5 rounded text-white" style={{ backgroundColor: '#ef4444' }}>C1</span>
                <span>Závada ohrožující bezpečnost</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-1 py-0.5 rounded text-white" style={{ backgroundColor: '#f59e0b' }}>C2</span>
                <span>Závada ohrožující provoz</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-1 py-0.5 rounded text-white" style={{ backgroundColor: '#22c55e' }}>C3</span>
                <span>Doporučení</span>
              </div>
            </div>
          </div>
          <div 
            className="absolute bottom-0 left-0 right-0 px-2 py-1 border-t flex justify-between"
            style={{ borderColor: secondaryColor, fontSize: '4px', color: secondaryColor }}
          >
            <span>{new Date().toLocaleDateString('cs-CZ')}</span>
            <span>Příloha 1 - Strana 4 z 4</span>
            <span>{formData.zapatiCustomText || ''}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Šablony PDF</h1>
          <p className="text-slate-500">Správa a vizuální návrh šablon pro export revizních zpráv</p>
        </div>
        <div className="flex gap-2">
          {selectedSablona && (
            <Button onClick={handleSave}>
              💾 Uložit změny
            </Button>
          )}
          <Button variant="secondary" onClick={() => setIsCreateModalOpen(true)}>
            + Nová šablona
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Seznam šablon */}
        <div className="col-span-12 lg:col-span-2">
          <Card title="Šablony">
            <div className="space-y-2">
              {sablony.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSablona(s)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSablona?.id === s.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{s.nazev}</p>
                    {s.jeVychozi && (
                      <span className="px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-700 shrink-0">
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Editor */}
        <div className="col-span-12 lg:col-span-5">
          {selectedSablona ? (
            <div className="space-y-4">
              {/* Info o šabloně */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <Input
                      value={formData.nazev || ''}
                      onChange={(e) => setFormData({ ...formData, nazev: e.target.value })}
                      className="text-lg font-bold border-0 p-0 bg-transparent"
                    />
                    <Input
                      placeholder="Popis šablony..."
                      value={formData.popis || ''}
                      onChange={(e) => setFormData({ ...formData, popis: e.target.value })}
                      className="text-sm text-slate-500 border-0 p-0 bg-transparent mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    {!selectedSablona.jeVychozi && (
                      <>
                        <Button variant="secondary" size="sm" onClick={handleSetVychozi}>
                          Nastavit výchozí
                        </Button>
                        <Button variant="danger" size="sm" onClick={handleDelete}>
                          🗑️
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {/* Tabs */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {[
                  { id: 'uvodni', label: '📄 Úvodní strana' },
                  { id: 'sekce', label: '📋 Sekce' },
                  { id: 'sloupce', label: '📊 Sloupce' },
                  { id: 'styly', label: '🎨 Styly' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === 'uvodni' && (
                <Card title="Nastavení úvodní strany">
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={formData.uvodniStranaZobrazit !== false}
                        onChange={(e) => setFormData({ ...formData, uvodniStranaZobrazit: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                      <div>
                        <p className="font-medium">Zobrazit úvodní stranu</p>
                        <p className="text-sm text-slate-500">Samostatná první strana s hlavními údaji</p>
                      </div>
                    </label>

                    {formData.uvodniStranaZobrazit !== false && (
                      <>
                        <Input
                          label="Nadpis dokumentu"
                          value={formData.uvodniStranaNadpis || ''}
                          onChange={(e) => setFormData({ ...formData, uvodniStranaNadpis: e.target.value })}
                          placeholder="ZPRÁVA O REVIZI ELEKTRICKÉ INSTALACE"
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Velikost písma nadpisu</label>
                            <input
                              type="range"
                              min="12"
                              max="28"
                              value={formData.uvodniStranaNadpisFontSize || 18}
                              onChange={(e) => setFormData({ ...formData, uvodniStranaNadpisFontSize: parseInt(e.target.value) })}
                              className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                              <span>12</span>
                              <span className="font-medium text-blue-600">{formData.uvodniStranaNadpisFontSize || 18}pt</span>
                              <span>28</span>
                            </div>
                          </div>
                          <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all h-fit self-center
                            ${formData.uvodniStranaNadpisRamecek !== false ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}">
                            <input
                              type="checkbox"
                              checked={formData.uvodniStranaNadpisRamecek !== false}
                              onChange={(e) => setFormData({ ...formData, uvodniStranaNadpisRamecek: e.target.checked })}
                              className="w-4 h-4 rounded"
                            />
                            <div>
                              <span className="font-medium">Rámeček</span>
                              <p className="text-xs text-slate-500">Kolem nadpisu</p>
                            </div>
                          </label>
                        </div>

                        {/* Nastavení rámečků sekcí */}
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-slate-700 mb-2">📐 Rámečky sekcí</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { key: 'uvodniStranaRamecekUdaje', label: 'Základní údaje' },
                              { key: 'uvodniStranaRamecekObjekt', label: 'Údaje o objektu' },
                              { key: 'uvodniStranaRamecekVyhodnoceni', label: 'Vyhodnocení' },
                            ].map(item => (
                              <label 
                                key={item.key}
                                className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all text-xs ${
                                  (formData as any)[item.key] !== false
                                    ? 'border-blue-300 bg-blue-100'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={(formData as any)[item.key] !== false}
                                  onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })}
                                  className="w-3 h-3 rounded"
                                />
                                <span>{item.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { key: 'uvodniStranaZobrazitObjekt', label: 'Údaje o objektu', icon: '🏢' },
                            { key: 'uvodniStranaZobrazitTechnika', label: 'Revizní technik', icon: '👷' },
                            { key: 'uvodniStranaZobrazitFirmu', label: 'Údaje firmy', icon: '🏭' },
                            { key: 'uvodniStranaZobrazitVyhodnoceni', label: 'Vyhodnocení', icon: '✅' },
                          ].map(item => (
                            <label 
                              key={item.key}
                              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm ${
                                (formData as any)[item.key] !== false
                                  ? 'border-blue-300 bg-blue-50'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={(formData as any)[item.key] !== false}
                                onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })}
                                className="w-4 h-4 rounded"
                              />
                              <span>{item.icon}</span>
                              <span>{item.label}</span>
                            </label>
                          ))}
                        </div>

                        {/* Umístění podpisů */}
                        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={formData.uvodniStranaZobrazitPodpisy !== false}
                                onChange={(e) => setFormData({ ...formData, uvodniStranaZobrazitPodpisy: e.target.checked })}
                                className="w-4 h-4 rounded"
                              />
                              <span>✍️ Podpisy</span>
                            </label>
                            {formData.uvodniStranaZobrazitPodpisy !== false && (
                              <select
                                value={formData.podpisyUmisteni || 'uvodni'}
                                onChange={(e) => setFormData({ ...formData, podpisyUmisteni: e.target.value as 'uvodni' | 'posledni' })}
                                className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="uvodni">📄 Na úvodní straně</option>
                                <option value="posledni">📃 Na poslední straně</option>
                              </select>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm font-medium text-slate-700 mb-3">Záhlaví dokumentu</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'zahlaviZobrazitLogo', label: 'Logo', icon: '🖼️' },
                          { key: 'zahlaviZobrazitFirmu', label: 'Firma', icon: '🏢' },
                          { key: 'zahlaviZobrazitTechnika', label: 'Technik', icon: '👤' },
                        ].map(item => (
                          <label 
                            key={item.key}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm ${
                              (formData as any)[item.key]
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={(formData as any)[item.key] || false}
                              onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })}
                              className="w-4 h-4 rounded"
                            />
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-slate-700 mb-3">Zápatí dokumentu</p>
                      <div className="grid grid-cols-2 gap-2">
                        <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${
                          formData.zapatiZobrazitCisloStranky ? 'border-blue-300 bg-blue-50' : 'border-slate-200'
                        }`}>
                          <input
                            type="checkbox"
                            checked={formData.zapatiZobrazitCisloStranky || false}
                            onChange={(e) => setFormData({ ...formData, zapatiZobrazitCisloStranky: e.target.checked })}
                            className="w-4 h-4 rounded"
                          />
                          <span>📑 Číslo stránky</span>
                        </label>
                        <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${
                          formData.zapatiZobrazitDatum ? 'border-blue-300 bg-blue-50' : 'border-slate-200'
                        }`}>
                          <input
                            type="checkbox"
                            checked={formData.zapatiZobrazitDatum || false}
                            onChange={(e) => setFormData({ ...formData, zapatiZobrazitDatum: e.target.checked })}
                            className="w-4 h-4 rounded"
                          />
                          <span>📅 Datum tisku</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'sekce' && (
                <Card title="Sekce dokumentu (přetáhněte pro změnu pořadí)">
                  <div className="space-y-2">
                    {formData.sekce?.sort((a, b) => a.poradi - b.poradi).map((sekce, index) => {
                      const isPriloha = sekce.id === 'zavady';
                      const iconMap: Record<string, string> = {
                        'zakladni-udaje': '📋',
                        'objekt': '🏢',
                        'rozvadece': '⚡',
                        'mereni': '📊',
                        'mistnosti': '🚪',
                        'zaver': '✅',
                        'podpisy': '✍️',
                        'zavady': '📎',
                      };
                      
                      return (
                        <div
                          key={sekce.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, sekce.id, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDrop={(e) => handleDrop(e, index)}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-move ${
                            sekce.enabled 
                              ? 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm' 
                              : 'border-slate-100 bg-slate-50 opacity-60'
                          } ${draggedItem?.id === sekce.id ? 'opacity-50 border-dashed' : ''}
                          ${isPriloha ? 'border-l-4 border-l-amber-400' : ''}`}
                        >
                          <span className="text-slate-400 cursor-grab">⋮⋮</span>
                          <span className="text-lg">{iconMap[sekce.id] || '📄'}</span>
                          <input
                            type="checkbox"
                            checked={sekce.enabled}
                            onChange={() => handleToggleSekce(sekce.id)}
                            className="w-4 h-4 rounded"
                          />
                          <span className={`flex-1 ${sekce.enabled ? '' : 'text-slate-400'}`}>
                            {sekce.nazev}
                          </span>
                          {isPriloha && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                              Na šířku
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    💡 Sekce <strong>Závady</strong> se exportuje na šířku (landscape) jako příloha na konci dokumentu.
                  </div>
                </Card>
              )}

              {activeTab === 'sloupce' && (
                <Card title="Sloupce tabulky okruhů">
                  <p className="text-sm text-slate-500 mb-4">
                    Vyberte sloupce, které se zobrazí v tabulce okruhů
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {formData.sloupceOkruhu?.sort((a, b) => a.poradi - b.poradi).map((sloupec) => (
                      <label
                        key={sloupec.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                          sloupec.enabled ? 'border-blue-200 bg-blue-50' : 'border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={sloupec.enabled}
                          onChange={() => handleToggleSloupec(sloupec.id)}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <span className="text-sm">{sloupec.nazev}</span>
                      </label>
                    ))}
                  </div>
                </Card>
              )}

              {activeTab === 'styly' && (
                <Card title="Styly dokumentu">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Primární barva
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={formData.barvaPrimary || '#1e40af'}
                            onChange={(e) => setFormData({ ...formData, barvaPrimary: e.target.value })}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={formData.barvaPrimary || '#1e40af'}
                            onChange={(e) => setFormData({ ...formData, barvaPrimary: e.target.value })}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Sekundární barva
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={formData.barvaSecondary || '#64748b'}
                            onChange={(e) => setFormData({ ...formData, barvaSecondary: e.target.value })}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={formData.barvaSecondary || '#64748b'}
                            onChange={(e) => setFormData({ ...formData, barvaSecondary: e.target.value })}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Velikost písma: {formData.fontSize || 10}pt
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="14"
                        value={formData.fontSize || 10}
                        onChange={(e) => setFormData({ ...formData, fontSize: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Font
                      </label>
                      <select
                        value={formData.fontFamily || 'Arial'}
                        onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-slate-700 mb-2">Rychlé šablony barev</p>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { name: 'Modrá', primary: '#1e40af', secondary: '#64748b' },
                          { name: 'Zelená', primary: '#166534', secondary: '#4b5563' },
                          { name: 'Červená', primary: '#991b1b', secondary: '#6b7280' },
                          { name: 'Fialová', primary: '#5b21b6', secondary: '#6b7280' },
                          { name: 'Oranžová', primary: '#c2410c', secondary: '#78716c' },
                          { name: 'Černá', primary: '#171717', secondary: '#525252' },
                        ].map(preset => (
                          <button
                            key={preset.name}
                            onClick={() => setFormData({ 
                              ...formData, 
                              barvaPrimary: preset.primary, 
                              barvaSecondary: preset.secondary 
                            })}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-400 transition-colors"
                          >
                            <span 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: preset.primary }}
                            />
                            <span className="text-sm">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <div className="text-center py-12 text-slate-500">
                <p className="text-4xl mb-4">📄</p>
                <p>Vyberte šablonu ze seznamu</p>
                <p className="text-sm mt-1">nebo vytvořte novou</p>
              </div>
            </Card>
          )}
        </div>

        {/* Preview panel */}
        <div className="col-span-12 lg:col-span-5">
          <div className="sticky top-6">
            <Card title="📄 Náhled dokumentu (4 strany)">
              <div 
                className="bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg p-4 overflow-y-auto" 
                style={{ maxHeight: '700px' }}
              >
                <div className="flex flex-col items-center">
                  {renderPreview()}
                </div>
              </div>
              <p className="text-center text-xs text-slate-500 mt-2">
                Scrollujte pro zobrazení všech stran • Obsahuje demo data
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal pro vytvoření nové šablony */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nová šablona"
      >
        <div className="space-y-4">
          <Input
            label="Název šablony"
            value={newSablonaName}
            onChange={(e) => setNewSablonaName(e.target.value)}
            placeholder="Moje nová šablona"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleCreateNew} disabled={!newSablonaName.trim()}>
              Vytvořit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
