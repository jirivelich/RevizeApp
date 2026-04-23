import { useState, useRef } from 'react';
import { Button, Card, Select, Modal } from '../../components/ui';
import { zavadaService, revizeService } from '../../services/database';
import { useCreateZavada, useUpdateZavada, useDeleteZavada } from '../../hooks/useQueries';
import type { Zavada, Rozvadec, Mistnost, ZavadaKatalog } from '../../types';

interface ZavadyTabProps {
  zavady: Zavada[];
  rozvadece: Rozvadec[];
  mistnosti: Mistnost[];
  katalogZavad: ZavadaKatalog[];
  revizeId: number;
  onReload: () => void;
}

export function ZavadyTab({ zavady, rozvadece, mistnosti, katalogZavad, revizeId, onReload: _onReload }: ZavadyTabProps) {
  const createZavada = useCreateZavada();
  const updateZavada = useUpdateZavada();
  const deleteZavada = useDeleteZavada();
  const [isZavadaModalOpen, setIsZavadaModalOpen] = useState(false);
  const [editingZavada, setEditingZavada] = useState<Zavada | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedKatalogZavada, setSelectedKatalogZavada] = useState<string>('');
  const [inlineMode, setInlineMode] = useState(false);
  const [inlineDraft, setInlineDraft] = useState({
    popis: '',
    zavaznost: 'C2' as Zavada['zavaznost'],
    stav: 'otevřená' as Zavada['stav'],
    poznamka: '',
  });
  const inlinePopisRef = useRef<HTMLInputElement>(null);
  const inlineZavaznostRef = useRef<HTMLSelectElement>(null);
  const inlineStavRef = useRef<HTMLSelectElement>(null);
  const inlinePoznamkaRef = useRef<HTMLInputElement>(null);
  const [zavadaFormData, setZavadaFormData] = useState({
    popis: '',
    zavaznost: 'C2' as Zavada['zavaznost'],
    stav: 'otevřená' as Zavada['stav'],
    rozvadecId: undefined as number | undefined,
    mistnostId: undefined as number | undefined,
    poznamka: '',
    fotky: [] as string[],
  });

  const resetZavadaForm = () => {
    setZavadaFormData({ popis: '', zavaznost: 'C2', stav: 'otevřená', rozvadecId: undefined, mistnostId: undefined, poznamka: '', fotky: [] });
    setEditingZavada(null);
    setSelectedKatalogZavada('');
  };

  const handleSelectFromKatalog = (katalogId: string) => {
    setSelectedKatalogZavada(katalogId);
    if (katalogId) {
      const zavada = katalogZavad.find(z => z.id?.toString() === katalogId);
      if (zavada) {
        setZavadaFormData(prev => ({
          ...prev,
          popis: zavada.popis,
          zavaznost: zavada.zavaznost,
          poznamka: zavada.norma
            ? `${zavada.norma}${zavada.clanek ? ` ${zavada.clanek}` : ''}${zavada.zneniClanku ? `\n${zavada.zneniClanku}` : ''}`
            : '',
        }));
      }
    }
  };

  const updateRevizeVysledek = async (rId: number) => {
    const zavadyRevize = await zavadaService.getByRevize(rId);
    const hasC1orC2 = zavadyRevize.some(z => (z.zavaznost === 'C1' || z.zavaznost === 'C2') && z.stav !== 'vyřešená');
    if (hasC1orC2) {
      await revizeService.update(rId, { vysledek: 'neschopno' });
    } else {
      await revizeService.update(rId, { vysledek: 'schopno' });
    }
  };

  const handleAddZavada = async (e: React.FormEvent) => {
    e.preventDefault();
    const onDone = async () => {
      await updateRevizeVysledek(revizeId);
      setIsZavadaModalOpen(false);
      resetZavadaForm();
    };
    if (editingZavada?.id) {
      updateZavada.mutate(
        { id: editingZavada.id, data: { ...zavadaFormData, revizeId, datumVyreseni: zavadaFormData.stav === 'vyřešená' ? new Date() : undefined } },
        { onSuccess: onDone }
      );
    } else {
      createZavada.mutate(
        { ...zavadaFormData, revizeId, datumZjisteni: new Date() } as any,
        { onSuccess: onDone }
      );
    }
  };

  const handleEditZavada = (zavada: Zavada) => {
    setEditingZavada(zavada);
    setZavadaFormData({
      popis: zavada.popis, zavaznost: zavada.zavaznost, stav: zavada.stav,
      rozvadecId: zavada.rozvadecId, mistnostId: zavada.mistnostId,
      poznamka: zavada.poznamka || '', fotky: zavada.fotky || [],
    });
    setIsZavadaModalOpen(true);
  };

  const handleDeleteZavada = (zavadaId: number) => {
    if (window.confirm('Opravdu chcete smazat tuto závadu?')) {
      deleteZavada.mutate(
        { id: zavadaId, revizeId },
        { onSuccess: () => updateRevizeVysledek(revizeId) }
      );
    }
  };

  const handleInlineSave = () => {
    if (!inlineDraft.popis.trim()) return;
    createZavada.mutate(
      { ...inlineDraft, revizeId, datumZjisteni: new Date(), fotky: [] } as any,
      {
        onSuccess: async () => {
          await updateRevizeVysledek(revizeId);
          setInlineDraft({ popis: '', zavaznost: 'C2', stav: 'otevřená', poznamka: '' });
          setTimeout(() => inlinePopisRef.current?.focus(), 50);
        },
      }
    );
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent, field: 'popis' | 'zavaznost' | 'stav' | 'poznamka') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInlineSave();
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      if (field === 'popis') { e.preventDefault(); inlineZavaznostRef.current?.focus(); }
      else if (field === 'zavaznost') { e.preventDefault(); inlineStavRef.current?.focus(); }
      else if (field === 'stav') { e.preventDefault(); inlinePoznamkaRef.current?.focus(); }
      else if (field === 'poznamka') { e.preventDefault(); handleInlineSave(); }
    }
  };

  return (
    <>
    <Card
      title="Závady"
      actions={
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={inlineMode ? 'primary' : 'secondary'}
            className="hidden md:inline-flex"
            onClick={() => {
              const next = !inlineMode;
              setInlineMode(next);
              if (next) setTimeout(() => inlinePopisRef.current?.focus(), 80);
            }}
          >
            {inlineMode ? '← Karty' : '⌨ Hromadný vstup'}
          </Button>
          {!inlineMode && (
            <Button size="sm" onClick={() => { resetZavadaForm(); setIsZavadaModalOpen(true); }}>+ Přidat závadu</Button>
          )}
        </div>
      }
    >
      {inlineMode ? (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-medium)] text-xs text-[var(--text-muted)] uppercase tracking-wide">
                <th className="text-left py-2 pr-3 font-medium">Popis závady</th>
                <th className="text-left py-2 pr-3 font-medium w-20">Závažnost</th>
                <th className="text-left py-2 pr-3 font-medium w-28">Stav</th>
                <th className="text-left py-2 pr-3 font-medium w-52">Poznámka / Norma</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {zavady.map((z) => (
                <tr key={z.id} className="border-b border-[var(--border-subtle)] border-l-2 border-l-transparent hover:border-l-[#759d2f] hover:bg-[rgba(117,157,47,0.03)] group">
                  <td className="py-2 pr-3 font-medium">{z.popis}</td>
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      z.zavaznost === 'C1' ? 'bg-red-100 text-red-700' :
                      z.zavaznost === 'C2' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>{z.zavaznost}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      z.stav === 'vyřešená' ? 'bg-green-100 text-green-700' :
                      z.stav === 'v řešení' ? 'bg-[var(--bg-accent)] text-[var(--nav-text-active)]' :
                      'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                    }`}>{z.stav}</span>
                  </td>
                  <td className="py-2 pr-3 text-xs text-[var(--text-muted)] italic truncate max-w-[200px]">{z.poznamka || '—'}</td>
                  <td className="py-2">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        title="Upravit (vč. fotek)"
                        onClick={() => handleEditZavada(z)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)]"
                      >✎</button>
                      <button
                        type="button"
                        title="Smazat"
                        onClick={() => handleDeleteZavada(z.id!)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-100 text-[var(--text-secondary)] hover:text-red-600"
                      >✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {/* Draft row */}
              <tr className="bg-[var(--bg-accent)] border-b border-[var(--border)]">
                <td className="py-1.5 pr-3">
                  <input
                    ref={inlinePopisRef}
                    type="text"
                    value={inlineDraft.popis}
                    onChange={(e) => setInlineDraft(d => ({ ...d, popis: e.target.value }))}
                    onKeyDown={(e) => handleInlineKeyDown(e, 'popis')}
                    placeholder="Popis nové závady..."
                    className="w-full px-2 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color)]"
                  />
                </td>
                <td className="py-1.5 pr-3">
                  <select
                    ref={inlineZavaznostRef}
                    value={inlineDraft.zavaznost}
                    onChange={(e) => setInlineDraft(d => ({ ...d, zavaznost: e.target.value as Zavada['zavaznost'] }))}
                    onKeyDown={(e) => handleInlineKeyDown(e, 'zavaznost')}
                    className="w-full px-1.5 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color)]"
                  >
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                    <option value="C3">C3</option>
                  </select>
                </td>
                <td className="py-1.5 pr-3">
                  <select
                    ref={inlineStavRef}
                    value={inlineDraft.stav}
                    onChange={(e) => setInlineDraft(d => ({ ...d, stav: e.target.value as Zavada['stav'] }))}
                    onKeyDown={(e) => handleInlineKeyDown(e, 'stav')}
                    className="w-full px-1.5 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color)]"
                  >
                    <option value="otevřená">Otevřená</option>
                    <option value="v řešení">V řešení</option>
                    <option value="vyřešená">Vyřešená</option>
                  </select>
                </td>
                <td className="py-1.5 pr-3">
                  <input
                    ref={inlinePoznamkaRef}
                    type="text"
                    value={inlineDraft.poznamka}
                    onChange={(e) => setInlineDraft(d => ({ ...d, poznamka: e.target.value }))}
                    onKeyDown={(e) => handleInlineKeyDown(e, 'poznamka')}
                    placeholder="Norma, poznámka..."
                    className="w-full px-2 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color)]"
                  />
                </td>
                <td className="py-1.5">
                  <button
                    type="button"
                    title="Uložit (Enter)"
                    disabled={!inlineDraft.popis.trim() || createZavada.isPending}
                    onClick={handleInlineSave}
                    className="w-7 h-7 flex items-center justify-center rounded bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-base"
                  >↵</button>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-[var(--text-secondary)] mt-2 select-none">
            <kbd className="px-1 bg-[var(--bg-hover)] rounded border border-[var(--border-medium)] text-[10px]">Tab</kbd> přechod &nbsp;·&nbsp;
            <kbd className="px-1 bg-[var(--bg-hover)] rounded border border-[var(--border-medium)] text-[10px]">Enter</kbd> uložit řádek &nbsp;·&nbsp;
            ✎ upravit vč. fotek
          </p>
        </div>
      ) : zavady.length > 0 ? (
        <div className="space-y-4">
          {zavady.map((z) => (
            <div key={z.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-medium)]">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{z.popis}</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    z.stav === 'vyřešená' ? 'bg-green-100 text-green-700' :
                      z.stav === 'v řešení' ? 'bg-[var(--bg-accent)] text-[var(--nav-text-active)]' :
                    'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                  }`}>{z.stav}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Zjištěno: {new Date(z.datumZjisteni).toLocaleDateString('cs-CZ')}
                  {z.datumVyreseni && ` • Vyřešeno: ${new Date(z.datumVyreseni).toLocaleDateString('cs-CZ')}`}
                </p>
                {z.rozvadecId && (
                  <p className="text-[10px] text-[var(--text-secondary)]">Rozvaděč: {rozvadece.find(r => r.id === z.rozvadecId)?.nazev || 'Neznámý'}</p>
                )}
                {z.poznamka && <p className="text-xs text-[var(--text-muted)] mt-1 italic">{z.poznamka}</p>}
                {Array.isArray(z.fotky) && z.fotky.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {z.fotky.slice(0, 4).map((foto, index) => (
                      <img key={index} src={foto} alt={`Foto ${index + 1}`}
                        className="w-12 h-12 object-cover rounded border border-[var(--border-medium)] cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setLightboxImage(foto)} />
                    ))}
                    {Array.isArray(z.fotky) && z.fotky.length > 4 && (
                      <span className="w-12 h-12 flex items-center justify-center bg-[var(--bg-hover)] rounded text-sm font-medium text-[var(--text-secondary)]">+{z.fotky.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  z.zavaznost === 'C1' ? 'bg-red-100 text-red-700' :
                  z.zavaznost === 'C2' ? 'bg-orange-500/10 text-orange-400' :
                  'bg-amber-500/10 text-amber-400'
                }`}>{z.zavaznost}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => handleEditZavada(z)}>Upravit</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDeleteZavada(z.id!)}>Smazat</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-[var(--text-muted)] py-8 text-sm">Žádné závady nebyly zaznamenány. Přidejte první kliknutím na tlačítko výše.</p>
      )}
    </Card>

    {/* Modal pro závady */}
    <Modal
      isOpen={isZavadaModalOpen}
      onClose={() => { setIsZavadaModalOpen(false); resetZavadaForm(); }}
      title={editingZavada ? 'Upravit závadu' : 'Přidat závadu'}
      size="lg"
      footer={
        <>
          <Button size="sm" variant="secondary" onClick={() => { setIsZavadaModalOpen(false); resetZavadaForm(); }}>Zrušit</Button>
          <Button size="sm" onClick={handleAddZavada}>{editingZavada ? 'Uložit změny' : 'Přidat'}</Button>
        </>
      }
    >
      <form onSubmit={handleAddZavada} className="space-y-3">
        {!editingZavada && katalogZavad.length > 0 && (
          <div className="p-2 bg-[var(--bg-accent)] rounded-lg border border-[var(--border-medium)]">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Vybrat z katalogu závad</label>
            <Select
              value={selectedKatalogZavada}
              onChange={(e) => handleSelectFromKatalog(e.target.value)}
              options={[
                { value: '', label: '-- Vlastní závada --' },
                ...katalogZavad.map(z => ({ value: z.id!.toString(), label: `[${z.zavaznost}] ${z.popis}${z.norma ? ` (${z.norma})` : ''}` }))
              ]}
            />
            {selectedKatalogZavada && <p className="text-xs text-[var(--primary)] mt-1">Popis a závažnost budou předvyplněny z katalogu. Můžete je upravit.</p>}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Popis závady *</label>
          <textarea value={zavadaFormData.popis} onChange={(e) => setZavadaFormData({ ...zavadaFormData, popis: e.target.value })}
            className="w-full px-2 py-1.5 border rounded-lg border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color)] text-sm" rows={2} placeholder="Popešte zjištěnou závadu..." required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Závažnost" value={zavadaFormData.zavaznost} onChange={(e) => setZavadaFormData({ ...zavadaFormData, zavaznost: e.target.value as any })}
            options={[{ value: 'C1', label: 'C1 - Kritická' }, { value: 'C2', label: 'C2 - Vážná' }, { value: 'C3', label: 'C3 - Drobná' }]} />
          <Select label="Stav" value={zavadaFormData.stav} onChange={(e) => setZavadaFormData({ ...zavadaFormData, stav: e.target.value as any })}
            options={[{ value: 'otevřená', label: 'Otevřená' }, { value: 'v řešení', label: 'V řešení' }, { value: 'vyřešená', label: 'Vyřešená' }]} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Rozvaděč (volitelné)" value={zavadaFormData.rozvadecId?.toString() || ''}
            onChange={(e) => setZavadaFormData({ ...zavadaFormData, rozvadecId: e.target.value ? parseInt(e.target.value) : undefined })}
            options={[{ value: '', label: '-- Nevybráno --' }, ...rozvadece.map(r => ({ value: r.id!.toString(), label: r.nazev }))]} />
          <Select label="Místnost (volitelné)" value={zavadaFormData.mistnostId?.toString() || ''}
            onChange={(e) => setZavadaFormData({ ...zavadaFormData, mistnostId: e.target.value ? parseInt(e.target.value) : undefined })}
            options={[{ value: '', label: '-- Nevybráno --' }, ...mistnosti.map(m => ({ value: m.id!.toString(), label: m.nazev }))]} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Poznámka / Odkaz na normu</label>
          <textarea value={zavadaFormData.poznamka} onChange={(e) => setZavadaFormData({ ...zavadaFormData, poznamka: e.target.value })}
            className="w-full px-2 py-1.5 border rounded-lg border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color)] text-xs" rows={3} placeholder="Volitelná poznámka nebo odkaz na normu/zákon..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text)] mb-1">Fotky</label>
          <input type="file" accept="image/*" multiple
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                Array.from(files).forEach(file => {
                  const reader = new FileReader();
                  reader.onloadend = () => { setZavadaFormData(prev => ({ ...prev, fotky: [...prev.fotky, reader.result as string] })); };
                  reader.readAsDataURL(file);
                });
              }
            }}
            className="w-full text-sm text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-[var(--bg-accent)] file:text-[var(--primary)] hover:file:bg-[var(--bg-accent)]"
          />
          {zavadaFormData.fotky.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {zavadaFormData.fotky.map((foto, i) => (
                <div key={i} className="relative group">
                  <img src={foto} alt={`Foto ${i + 1}`}
                    className="w-16 h-16 object-cover rounded border border-[var(--border-medium)] cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setLightboxImage(foto)} />
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); setZavadaFormData(prev => ({ ...prev, fotky: prev.fotky.filter((_, idx) => idx !== i) })); }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>

    {/* Lightbox pro zvětšení fotek */}
    {lightboxImage && (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
        <div className="relative max-w-4xl max-h-[90vh]">
          <img src={lightboxImage} alt="Zvětšená fotka" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightboxImage(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-[var(--surface)] rounded-full shadow-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]">✕</button>
        </div>
      </div>
    )}
    </>
  );
}
