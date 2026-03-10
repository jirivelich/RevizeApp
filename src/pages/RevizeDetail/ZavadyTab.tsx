import { useState } from 'react';
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

export function ZavadyTab({ zavady, rozvadece, mistnosti, katalogZavad, revizeId, onReload }: ZavadyTabProps) {
  const createZavada = useCreateZavada();
  const updateZavada = useUpdateZavada();
  const deleteZavada = useDeleteZavada();
  const [isZavadaModalOpen, setIsZavadaModalOpen] = useState(false);
  const [editingZavada, setEditingZavada] = useState<Zavada | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedKatalogZavada, setSelectedKatalogZavada] = useState<string>('');
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

  return (
    <>
    <Card
      title="Závady"
      actions={<Button size="sm" onClick={() => { resetZavadaForm(); setIsZavadaModalOpen(true); }}>+ Přidat závadu</Button>}
    >
      {zavady.length > 0 ? (
        <div className="space-y-4">
          {zavady.map((z) => (
            <div key={z.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{z.popis}</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    z.stav === 'vyřešená' ? 'bg-green-100 text-green-700' :
                    z.stav === 'v řešení' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>{z.stav}</span>
                </div>
                <p className="text-sm text-slate-500">
                  Zjištěno: {new Date(z.datumZjisteni).toLocaleDateString('cs-CZ')}
                  {z.datumVyreseni && ` • Vyřešeno: ${new Date(z.datumVyreseni).toLocaleDateString('cs-CZ')}`}
                </p>
                {z.rozvadecId && (
                  <p className="text-xs text-slate-400">Rozvaděč: {rozvadece.find(r => r.id === z.rozvadecId)?.nazev || 'Neznámý'}</p>
                )}
                {z.poznamka && <p className="text-sm text-slate-500 mt-1 italic">{z.poznamka}</p>}
                {Array.isArray(z.fotky) && z.fotky.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {z.fotky.slice(0, 4).map((foto, index) => (
                      <img key={index} src={foto} alt={`Foto ${index + 1}`}
                        className="w-12 h-12 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setLightboxImage(foto)} />
                    ))}
                    {Array.isArray(z.fotky) && z.fotky.length > 4 && (
                      <span className="w-12 h-12 flex items-center justify-center bg-slate-200 rounded text-sm font-medium text-slate-600">+{z.fotky.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  z.zavaznost === 'C1' ? 'bg-red-100 text-red-700' :
                  z.zavaznost === 'C2' ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700'
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
        <p className="text-center text-slate-500 py-8">Žádné závady nebyly zaznamenány. Přidejte první kliknutím na tlačítko výše.</p>
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
          <Button variant="secondary" onClick={() => { setIsZavadaModalOpen(false); resetZavadaForm(); }}>Zrušit</Button>
          <Button onClick={handleAddZavada}>{editingZavada ? 'Uložit změny' : 'Přidat'}</Button>
        </>
      }
    >
      <form onSubmit={handleAddZavada} className="space-y-4">
        {!editingZavada && katalogZavad.length > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">Vybrat z katalogu závad</label>
            <Select
              value={selectedKatalogZavada}
              onChange={(e) => handleSelectFromKatalog(e.target.value)}
              options={[
                { value: '', label: '-- Vlastní závada --' },
                ...katalogZavad.map(z => ({ value: z.id!.toString(), label: `[${z.zavaznost}] ${z.popis}${z.norma ? ` (${z.norma})` : ''}` }))
              ]}
            />
            {selectedKatalogZavada && <p className="text-xs text-blue-600 mt-1">Popis a závažnost budou předvyplněny z katalogu. Můžete je upravit.</p>}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Popis závady *</label>
          <textarea value={zavadaFormData.popis} onChange={(e) => setZavadaFormData({ ...zavadaFormData, popis: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Popište zjištěnou závadu..." required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Závažnost" value={zavadaFormData.zavaznost} onChange={(e) => setZavadaFormData({ ...zavadaFormData, zavaznost: e.target.value as any })}
            options={[{ value: 'C1', label: 'C1 - Kritická' }, { value: 'C2', label: 'C2 - Vážná' }, { value: 'C3', label: 'C3 - Drobná' }]} />
          <Select label="Stav" value={zavadaFormData.stav} onChange={(e) => setZavadaFormData({ ...zavadaFormData, stav: e.target.value as any })}
            options={[{ value: 'otevřená', label: 'Otevřená' }, { value: 'v řešení', label: 'V řešení' }, { value: 'vyřešená', label: 'Vyřešená' }]} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Rozvaděč (volitelné)" value={zavadaFormData.rozvadecId?.toString() || ''}
            onChange={(e) => setZavadaFormData({ ...zavadaFormData, rozvadecId: e.target.value ? parseInt(e.target.value) : undefined })}
            options={[{ value: '', label: '-- Nevybráno --' }, ...rozvadece.map(r => ({ value: r.id!.toString(), label: r.nazev }))]} />
          <Select label="Místnost (volitelné)" value={zavadaFormData.mistnostId?.toString() || ''}
            onChange={(e) => setZavadaFormData({ ...zavadaFormData, mistnostId: e.target.value ? parseInt(e.target.value) : undefined })}
            options={[{ value: '', label: '-- Nevybráno --' }, ...mistnosti.map(m => ({ value: m.id!.toString(), label: m.nazev }))]} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Poznámka / Odkaz na normu</label>
          <textarea value={zavadaFormData.poznamka} onChange={(e) => setZavadaFormData({ ...zavadaFormData, poznamka: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" rows={3} placeholder="Volitelná poznámka nebo odkaz na normu/zákon..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fotky</label>
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
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {zavadaFormData.fotky.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {zavadaFormData.fotky.map((foto, i) => (
                <div key={i} className="relative group">
                  <img src={foto} alt={`Foto ${i + 1}`}
                    className="w-16 h-16 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
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
          <button onClick={() => setLightboxImage(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100">✕</button>
        </div>
      </div>
    )}
    </>
  );
}
