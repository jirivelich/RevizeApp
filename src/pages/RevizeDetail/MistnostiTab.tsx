import { useState, useEffect } from 'react';
import { Button, Card, Input, Select, Modal, BottomSheet } from '../../components/ui';
import { TW } from './tw';
import { zarizeniService } from '../../services/database';
import { useCreateMistnost, useUpdateMistnost, useDeleteMistnost } from '../../hooks/useQueries';
import type { Mistnost, Zarizeni } from '../../types';

interface MistnostiTabProps {
  mistnosti: Mistnost[];
  zarizeniCounts: Record<number, number>;
  revizeId: number;
  onReload: () => void;
}

export function MistnostiTab({ mistnosti, zarizeniCounts: propCounts, revizeId, onReload: _onReload }: MistnostiTabProps) {
  const createMistnost = useCreateMistnost();
  const updateMistnost = useUpdateMistnost();
  const deleteMistnost = useDeleteMistnost();
  const [selectedMistnost, setSelectedMistnost] = useState<Mistnost | null>(null);
  const [zarizeni, setZarizeni] = useState<Zarizeni[]>([]);
  const [isMistnostModalOpen, setIsMistnostModalOpen] = useState(false);
  const [editingMistnost, setEditingMistnost] = useState<Mistnost | null>(null);
  const [isZarizeniModalOpen, setIsZarizeniModalOpen] = useState(false);
  const [editingZarizeni, setEditingZarizeni] = useState<Zarizeni | null>(null);

  const [isZarizeniSheetOpen, setIsZarizeniSheetOpen] = useState(false);
  const [zarizeniCounts, setZarizeniCounts] = useState<Record<number, number>>(propCounts);

  const [mistnostFormData, setMistnostFormData] = useState({
    nazev: '', patro: '', poznamka: ''
  });

  const [zarizeniFormData, setZarizeniFormData] = useState({
    nazev: '', oznaceni: '', pocetKs: 1,
    trida: 'I' as Zarizeni['trida'], prikonW: undefined as number | undefined,
    ochranaPredDotykem: '', stav: 'nekontrolováno' as Zarizeni['stav'], poznamka: '',
  });

  // Sync counts from parent
  useEffect(() => { setZarizeniCounts(propCounts); }, [propCounts]);

  const handleSelectMistnost = async (mistnost: Mistnost) => {
    if (selectedMistnost?.id === mistnost.id) {
      setSelectedMistnost(null);
      setZarizeni([]);
    } else {
      setSelectedMistnost(mistnost);
      if (mistnost.id) {
        const zarizeniData = await zarizeniService.getByMistnost(mistnost.id);
        setZarizeni(zarizeniData);
      }
    }
  };

  // Místnosti CRUD
  const resetMistnostForm = () => {
    setMistnostFormData({ nazev: '', patro: '', poznamka: '' });
    setEditingMistnost(null);
  };

  const handleAddMistnost = async (e: React.FormEvent) => {
    e.preventDefault();
    const onDone = () => {
      setIsMistnostModalOpen(false);
      resetMistnostForm();
    };
    if (editingMistnost?.id) {
      updateMistnost.mutate(
        { id: editingMistnost.id, data: { ...mistnostFormData, revizeId } },
        { onSuccess: onDone }
      );
    } else {
      createMistnost.mutate(
        { ...mistnostFormData, revizeId } as any,
        {
          onSuccess: (newId) => {
            onDone();
            // Auto-select the newly created místnost
            setSelectedMistnost({
              id: newId as unknown as number,
              nazev: mistnostFormData.nazev,
              patro: mistnostFormData.patro,
              poznamka: mistnostFormData.poznamka,
              revizeId,
            });
            setZarizeni([]);
          },
        }
      );
    }
  };

  const handleEditMistnost = (mistnost: Mistnost) => {
    setEditingMistnost(mistnost);
    setMistnostFormData({
      nazev: mistnost.nazev, patro: mistnost.patro || '',
      poznamka: mistnost.poznamka || ''
    });
    setIsMistnostModalOpen(true);
  };

  const handleDeleteMistnost = (mistnostId: number) => {
    if (window.confirm('Opravdu chcete smazat tuto místnost včetně všech zařízení?')) {
      deleteMistnost.mutate(
        { id: mistnostId, revizeId },
        {
          onSuccess: () => {
            if (selectedMistnost?.id === mistnostId) {
              setSelectedMistnost(null);
              setZarizeni([]);
            }
          },
        }
      );
    }
  };

  // Zařízení CRUD
  const resetZarizeniForm = () => {
    setZarizeniFormData({ nazev: '', oznaceni: '', pocetKs: 1, trida: 'I', prikonW: undefined, ochranaPredDotykem: '', stav: 'nekontrolováno', poznamka: '' });
    setEditingZarizeni(null);
  };

  const saveZarizeni = async () => {
    if (!selectedMistnost?.id) return;
    if (editingZarizeni?.id) {
      await zarizeniService.update(editingZarizeni.id, zarizeniFormData);
    } else {
      await zarizeniService.create({ ...zarizeniFormData, mistnostId: selectedMistnost.id });
    }
    setIsZarizeniModalOpen(false);
    setIsZarizeniSheetOpen(false);
    resetZarizeniForm();
    const zarizeniData = await zarizeniService.getByMistnost(selectedMistnost.id);
    setZarizeni(zarizeniData);
    setZarizeniCounts(prev => ({ ...prev, [selectedMistnost.id!]: zarizeniData.length }));
  };

  const handleAddZarizeni = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveZarizeni();
  };

  const handleEditZarizeni = (zar: Zarizeni) => {
    setEditingZarizeni(zar);
    setZarizeniFormData({
      nazev: zar.nazev, oznaceni: zar.oznaceni || '', pocetKs: zar.pocetKs || 1,
      trida: zar.trida || 'I', prikonW: zar.prikonW, ochranaPredDotykem: zar.ochranaPredDotykem || '',
      stav: zar.stav, poznamka: zar.poznamka || '',
    });
    if (window.innerWidth < 640) {
      setIsZarizeniSheetOpen(true);
    } else {
      setIsZarizeniModalOpen(true);
    }
  };

  const handleDeleteZarizeni = async (zarizeniId: number) => {
    if (window.confirm('Opravdu chcete smazat toto zařízení?')) {
      await zarizeniService.delete(zarizeniId);
      if (selectedMistnost?.id) {
        const zarizeniData = await zarizeniService.getByMistnost(selectedMistnost.id);
        setZarizeni(zarizeniData);
        setZarizeniCounts(prev => ({ ...prev, [selectedMistnost.id!]: zarizeniData.length }));
      }
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Seznam místností - levá strana */}
      <div className="lg:col-span-1">
        <Card title="Místnosti" actions={<Button size="sm" onClick={() => setIsMistnostModalOpen(true)}>+ Přidat</Button>}>
          {mistnosti.length > 0 ? (
            <div className="space-y-2">
              {mistnosti.map((m) => (
                <div key={m.id}
                  className={`rounded-lg border transition-colors cursor-pointer ${
                    selectedMistnost?.id === m.id ? 'border-blue-500 bg-[var(--bg-accent)]' : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-white/[0.14]'
                  }`}
                  onClick={() => handleSelectMistnost(m)}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-xs">{m.nazev}</p>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                        {zarizeniCounts[m.id!] || 0}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{m.patro && `${m.patro}`}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[var(--text-secondary)] py-6 text-xs">Zatím žádné místnosti.</p>
          )}
        </Card>
      </div>

      {/* Detail místnosti - pravá strana */}
      <div className="lg:col-span-2">
        {selectedMistnost ? (
          <Card
            title={`${selectedMistnost.nazev}`}
            actions={
              <div className="flex gap-2">
                <Button size="sm" onClick={() => {
                  resetZarizeniForm();
                  if (window.innerWidth < 640) { setIsZarizeniSheetOpen(true); }
                  else { setIsZarizeniModalOpen(true); }
                }}>
                  <span className="sm:hidden text-base leading-none">+</span>
                  <span className="hidden sm:inline">+ Přidat zařízení</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleEditMistnost(selectedMistnost)}>Upravit</Button>
                <Button variant="danger" size="sm" onClick={() => handleDeleteMistnost(selectedMistnost.id!)}>🗑️ Smazat</Button>
              </div>
            }
          >
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-2 bg-[var(--bg-input)] rounded-lg"><p className="text-[10px] text-[var(--text-secondary)]">Patro</p><p className="font-medium text-xs text-[var(--text)]">{selectedMistnost.patro || '—'}</p></div>
            </div>

            <h4 className="font-medium text-sm text-[var(--text)] mb-2">Zařízení ({zarizeni.length})</h4>
            {zarizeni.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={TW.th}>Název</th>
                      <th className={TW.th}>Ks</th>
                      <th className={TW.th}>Třída</th>
                      <th className={TW.th}>Příkon</th>
                      <th className={TW.th}>Ochrana před dotykem</th>
                      <th className={TW.th}>Stav</th>
                      <th className={TW.th + ' text-right'}>Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zarizeni.map((z) => (
                      <tr key={z.id} className="border-b border-[var(--border-subtle)] border-l-2 border-l-transparent hover:border-l-[var(--primary)] hover:bg-[var(--bg-hover)] group">
                        <td className="py-1 px-2 text-xs">
                          <p className="font-medium">{z.nazev}</p>
                          {z.oznaceni && <p className="text-[10px] text-[var(--text-secondary)]">{z.oznaceni}</p>}
                        </td>
                        <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{z.pocetKs || 1}</td>
                        <td className="py-1 px-2 text-xs"><span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">{z.trida || 'I'}</span></td>
                        <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{z.prikonW ? `${z.prikonW} W` : '—'}</td>
                        <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{z.ochranaPredDotykem || '—'}</td>
                        <td className="py-1 px-2 text-xs">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            z.stav === 'OK' ? 'bg-green-100 text-green-700' :
                            z.stav === 'závada' ? 'bg-red-100 text-red-700' :
                            'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                          }`}>{z.stav}</span>
                        </td>
                        <td className="py-1 px-2 text-xs text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="secondary" size="sm" onClick={() => handleEditZarizeni(z)}>✏️</Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteZarizeni(z.id!)}>🗑️</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-[var(--text-secondary)] py-6 text-xs">Zatím žádná zařízení. Přidejte první kliknutím na tlačítko výše.</p>
            )}
          </Card>
        ) : (
          <Card title="Detail místnosti">
            <p className="text-center text-[var(--text-secondary)] py-12 text-sm">Vyberte místnost ze seznamu vlevo pro zobrazení detailu a správu zařízení.</p>
          </Card>
        )}
      </div>
    </div>

    {/* Modal pro přidání/úpravu místnosti */}
    <Modal
      isOpen={isMistnostModalOpen}
      onClose={() => { setIsMistnostModalOpen(false); resetMistnostForm(); }}
      title={editingMistnost ? 'Upravit místnost' : 'Přidat místnost'}
      footer={
        <>
          <Button variant="secondary" onClick={() => { setIsMistnostModalOpen(false); resetMistnostForm(); }}>Zrušit</Button>
            <Button size="sm" onClick={handleAddMistnost}>{editingMistnost ? 'Uložit změny' : 'Přidat'}</Button>
        </>
      }
    >
      <form onSubmit={handleAddMistnost} className="space-y-3">
        <Input label="Název místnosti" value={mistnostFormData.nazev} onChange={(e) => setMistnostFormData({ ...mistnostFormData, nazev: e.target.value })} placeholder="např. Obývací pokoj, Kuchyň..." required />
        <Input label="Patro" value={mistnostFormData.patro} onChange={(e) => setMistnostFormData({ ...mistnostFormData, patro: e.target.value })} placeholder="např. 1.NP, přízemí..." />
        <Input label="Poznámka" value={mistnostFormData.poznamka} onChange={(e) => setMistnostFormData({ ...mistnostFormData, poznamka: e.target.value })} placeholder="Volitelná poznámka..." />
      </form>
    </Modal>

    {/* Modal pro přidání/úpravu zařízení */}
    <Modal
      isOpen={isZarizeniModalOpen}
      onClose={() => { setIsZarizeniModalOpen(false); resetZarizeniForm(); }}
      title={editingZarizeni ? 'Upravit zařízení' : 'Přidat zařízení'}
      footer={
        <>
          <Button variant="secondary" onClick={() => { setIsZarizeniModalOpen(false); resetZarizeniForm(); }}>Zrušit</Button>
            <Button size="sm" onClick={handleAddZarizeni}>{editingZarizeni ? 'Uložit změny' : 'Přidat'}</Button>
        </>
      }
    >
      <form onSubmit={handleAddZarizeni} className="space-y-3">
        <Input label="Název zařízení" value={zarizeniFormData.nazev} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, nazev: e.target.value })} placeholder="např. Zásuvka u okna, Hlavní svítidlo..." required />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Označení" value={zarizeniFormData.oznaceni} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, oznaceni: e.target.value })} placeholder="např. Z1, L2..." />
          <Input label="Počet kusů" type="number" min="1" value={zarizeniFormData.pocetKs.toString()}
            onChange={(e) => {
              const newPocet = parseInt(e.target.value) || 1;
              let ochrana = zarizeniFormData.ochranaPredDotykem;
              if (zarizeniFormData.trida === 'I') {
                if (newPocet > 1 && !ochrana?.startsWith('max.')) { ochrana = 'max.' + (ochrana || ''); }
                else if (newPocet === 1 && ochrana?.startsWith('max.')) { ochrana = ochrana.replace('max.', ''); }
              }
              setZarizeniFormData({ ...zarizeniFormData, pocetKs: newPocet, ochranaPredDotykem: ochrana });
            }} />
          <Select label="Třída" value={zarizeniFormData.trida}
            onChange={(e) => {
              const newTrida = e.target.value as Zarizeni['trida'];
              let ochrana = zarizeniFormData.ochranaPredDotykem;
              if (newTrida === 'II') { ochrana = 'izolací'; }
              else if (newTrida === 'III') { ochrana = 'MN'; }
              else if (newTrida === 'I') { ochrana = zarizeniFormData.pocetKs > 1 ? 'max.' : ''; }
              setZarizeniFormData({ ...zarizeniFormData, trida: newTrida, ochranaPredDotykem: ochrana });
            }}
            options={[{ value: 'I', label: 'I' }, { value: 'II', label: 'II' }, { value: 'III', label: 'III' }]} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Příkon (W)" type="number" value={zarizeniFormData.prikonW?.toString() || ''}
            onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, prikonW: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="např. 60" />
          <Input label="Ochrana před dotykem" value={zarizeniFormData.ochranaPredDotykem}
            onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, ochranaPredDotykem: e.target.value })}
            placeholder={
              zarizeniFormData.trida === 'I'
                ? (zarizeniFormData.pocetKs > 1 ? 'např. max.0.6 Ω' : 'např. 0.6 Ω')
                : zarizeniFormData.trida === 'II' ? 'např. izolací' : 'např. malým napětím'
            } />
          <Select label="Stav" value={zarizeniFormData.stav} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, stav: e.target.value as Zarizeni['stav'] })}
            options={[{ value: 'nekontrolováno', label: 'Nekontrolováno' }, { value: 'OK', label: 'OK' }, { value: 'závada', label: 'Závada' }]} />
        </div>
        <Input label="Poznámka" value={zarizeniFormData.poznamka} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, poznamka: e.target.value })} placeholder="Volitelná poznámka..." />
      </form>
    </Modal>

    {/* BottomSheet pro zařízení (mobil) */}
    <BottomSheet
      isOpen={isZarizeniSheetOpen}
      onClose={() => { setIsZarizeniSheetOpen(false); resetZarizeniForm(); }}
      title={editingZarizeni ? 'Upravit zařízení' : 'Přidat zařízení'}
      footer={
        <>
          <Button onClick={saveZarizeni}>{editingZarizeni ? 'Uložit změny' : 'Přidat'}</Button>
          <Button variant="secondary" onClick={() => { setIsZarizeniSheetOpen(false); resetZarizeniForm(); }}>Zrušit</Button>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); saveZarizeni(); }} className="space-y-3">
        <Input label="Název zařízení" value={zarizeniFormData.nazev} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, nazev: e.target.value })} placeholder="např. Zásuvka u okna..." required />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Označení" value={zarizeniFormData.oznaceni} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, oznaceni: e.target.value })} placeholder="např. Z1, L2..." />
          <Input label="Počet kusů" type="number" min="1" value={zarizeniFormData.pocetKs.toString()}
            onChange={(e) => {
              const newPocet = parseInt(e.target.value) || 1;
              let ochrana = zarizeniFormData.ochranaPredDotykem;
              if (zarizeniFormData.trida === 'I') {
                if (newPocet > 1 && !ochrana?.startsWith('max.')) { ochrana = 'max.' + (ochrana || ''); }
                else if (newPocet === 1 && ochrana?.startsWith('max.')) { ochrana = ochrana.replace('max.', ''); }
              }
              setZarizeniFormData({ ...zarizeniFormData, pocetKs: newPocet, ochranaPredDotykem: ochrana });
            }} />
          <Select label="Třída" value={zarizeniFormData.trida}
            onChange={(e) => {
              const newTrida = e.target.value as Zarizeni['trida'];
              let ochrana = zarizeniFormData.ochranaPredDotykem;
              if (newTrida === 'II') { ochrana = 'izolací'; }
              else if (newTrida === 'III') { ochrana = 'MN'; }
              else if (newTrida === 'I') { ochrana = zarizeniFormData.pocetKs > 1 ? 'max.' : ''; }
              setZarizeniFormData({ ...zarizeniFormData, trida: newTrida, ochranaPredDotykem: ochrana });
            }}
            options={[{ value: 'I', label: 'I' }, { value: 'II', label: 'II' }, { value: 'III', label: 'III' }]} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Příkon (W)" type="number" value={zarizeniFormData.prikonW?.toString() || ''}
            onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, prikonW: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="např. 60" />
          <Input label="Ochrana před dotykem" value={zarizeniFormData.ochranaPredDotykem}
            onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, ochranaPredDotykem: e.target.value })}
            placeholder={zarizeniFormData.trida === 'I' ? (zarizeniFormData.pocetKs > 1 ? 'např. max.0.6 Ω' : 'např. 0.6 Ω') : zarizeniFormData.trida === 'II' ? 'např. izolací' : 'např. malým napětím'} />
          <Select label="Stav" value={zarizeniFormData.stav} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, stav: e.target.value as Zarizeni['stav'] })}
            options={[{ value: 'nekontrolováno', label: 'Nekontrolováno' }, { value: 'OK', label: 'OK' }, { value: 'závada', label: 'Závada' }]} />
        </div>
        <Input label="Poznámka" value={zarizeniFormData.poznamka} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, poznamka: e.target.value })} placeholder="Volitelná poznámka..." />
      </form>
    </BottomSheet>
    </>
  );
}
