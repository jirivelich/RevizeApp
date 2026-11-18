import React, { useMemo, useState } from 'react';
import { Button, Card, Input, Select, Modal, ConfirmDialog, Badge, PageHeader, EmptyState, DataTable, Textarea, Checkbox } from '../components/ui';
import type { DataTableColumn } from '../components/ui';
import { useCenik, useCreateCenik, useUpdateCenik, useDeleteCenik } from '../hooks/useQueries';
import type { CenikPolozka } from '../types';
import { formatKc } from './fakturaUi';
import { CINNOST_OPTIONS, DRUHY_CINNOSTI, nazevCinnosti, seskupitPodleKategorie, BEZ_KATEGORIE, type KodCinnosti } from '../utils/druhyCinnosti';

const emptyForm = { nazev: '', jednotka: 'ks', cena: '0', aktivni: true, poznamka: '', kategorie: '', cinnost: '' };

const CenikPage: React.FC = () => {
  const { data: cenik = [], isLoading: loading } = useCenik();
  const createCenik = useCreateCenik();
  const updateCenik = useUpdateCenik();
  const deleteCenik = useDeleteCenik();

  const [editing, setEditing] = useState<CenikPolozka | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CenikPolozka | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [hledat, setHledat] = useState('');
  const [filtrKategorie, setFiltrKategorie] = useState<string | null>(null);

  // Existující kategorie – nabídka ve formuláři a filtr
  const kategorie = useMemo(
    () => [...new Set(cenik.map(c => c.kategorie?.trim()).filter((k): k is string => !!k))].sort((a, b) => a.localeCompare(b, 'cs')),
    [cenik],
  );
  const skupiny = useMemo(() => {
    const q = hledat.trim().toLowerCase();
    const vybrane = cenik.filter(c =>
      (!q || c.nazev.toLowerCase().includes(q) || (c.poznamka || '').toLowerCase().includes(q) || (c.kategorie || '').toLowerCase().includes(q))
      && (!filtrKategorie || (c.kategorie?.trim() || BEZ_KATEGORIE) === filtrKategorie));
    return seskupitPodleKategorie(vybrane);
  }, [cenik, hledat, filtrKategorie]);

  const handleNew = (kat?: string) => {
    setIsNew(true);
    setEditing(null);
    setFormError(null);
    setFormData({ ...emptyForm, kategorie: kat && kat !== BEZ_KATEGORIE ? kat : '' });
    setIsModalOpen(true);
  };

  const handleEdit = (c: CenikPolozka) => {
    setIsNew(false);
    setEditing(c);
    setFormError(null);
    setFormData({
      nazev: c.nazev || '',
      jednotka: c.jednotka || '',
      cena: String(c.cena ?? 0),
      aktivni: c.aktivni,
      poznamka: c.poznamka || '',
      kategorie: c.kategorie || '',
      cinnost: c.cinnost || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const cena = Number(formData.cena.replace(',', '.'));
    if (!Number.isFinite(cena)) {
      setFormError('Cena musí být číslo');
      return;
    }
    const data = {
      nazev: formData.nazev.trim(),
      jednotka: formData.jednotka || undefined,
      cena,
      aktivni: formData.aktivni,
      poznamka: formData.poznamka || undefined,
      kategorie: formData.kategorie.trim() || null,
      cinnost: formData.cinnost || null,
    };
    try {
      if (isNew) {
        await createCenik.mutateAsync(data);
      } else if (editing) {
        await updateCenik.mutateAsync({ id: editing.id, data });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Chyba při ukládání položky ceníku:', error);
      setFormError('Nepodařilo se uložit položku');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCenik.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Chyba při mazání položky ceníku:', error);
      setDeleteTarget(null);
      setFormError('Nepodařilo se smazat položku');
    }
  };

  const columns: DataTableColumn<CenikPolozka>[] = [
    { key: 'nazev', header: 'Název', render: (c) => <span className="font-medium">{c.nazev}</span> },
    { key: 'jednotka', header: 'Jednotka', render: (c) => <span className="text-[var(--text-secondary)]">{c.jednotka || '-'}</span> },
    {
      key: 'cinnost',
      header: 'Druh činnosti',
      render: (c) => c.cinnost
        ? <span className="text-[var(--text-secondary)]">{nazevCinnosti(c.cinnost)} <span className="text-[var(--text-muted)]">({DRUHY_CINNOSTI[c.cinnost as KodCinnosti]?.sazba} %)</span></span>
        : <span className="text-[var(--text-muted)]">—</span>,
    },
    { key: 'cena', header: 'Cena', align: 'right', render: (c) => <span className="whitespace-nowrap tabular-nums">{formatKc(c.cena)}</span> },
    { key: 'stav', header: 'Stav', render: (c) => <Badge variant={c.aktivni ? 'success' : 'neutral'}>{c.aktivni ? 'Aktivní' : 'Neaktivní'}</Badge> },
    {
      key: 'akce',
      header: 'Akce',
      align: 'right',
      actions: true,
      render: (c) => (
        <>
          <Button variant="secondary" size="sm" onClick={() => handleEdit(c)}>Upravit</Button>
          <Button variant="danger" size="sm" onClick={() => { setFormError(null); setDeleteTarget(c); }}>Smazat</Button>
        </>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--border-strong)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ceník"
        subtitle="Položky pro rychlé vystavení faktur"
        actions={
          <Button onClick={() => handleNew()}>
            <span className="sm:hidden text-lg leading-none">+</span>
            <span className="hidden sm:inline">Nová položka</span>
          </Button>
        }
      />

      {formError && !isModalOpen && (
        <p className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-lg px-3 py-2">
          {formError}
        </p>
      )}

      {cenik.length === 0 ? (
        <EmptyState
          message="Ceník je zatím prázdný"
          action={<Button onClick={() => handleNew()}>Přidat první položku</Button>}
        />
      ) : (
        <>
          {/* Hledání a filtr kategorií */}
          <Card className="p-4">
            <div className="space-y-3">
              <Input placeholder="Hledat položku, kategorii, poznámku…" value={hledat} onChange={(e) => setHledat(e.target.value)} />
              {kategorie.length > 0 && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filtr kategorií">
                  {[null, ...kategorie, ...(cenik.some(c => !c.kategorie?.trim()) ? [BEZ_KATEGORIE] : [])].map(k => {
                    const aktivni = filtrKategorie === k;
                    const pocet = k === null ? cenik.length : cenik.filter(c => (c.kategorie?.trim() || BEZ_KATEGORIE) === k).length;
                    return (
                      <button key={k ?? '__vse'} type="button" aria-pressed={aktivni} onClick={() => setFiltrKategorie(k)}
                        className={`min-h-[34px] px-3 rounded-full border text-xs font-semibold ${aktivni
                          ? 'border-[var(--primary-text)] bg-[var(--bg-accent)] text-[var(--primary-text)]'
                          : 'border-[var(--border-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
                        {k ?? 'Vše'} <span className="opacity-70">{pocet}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {skupiny.length === 0 ? (
            <EmptyState message="Žádná položka neodpovídá hledání" />
          ) : skupiny.map(([kat, polozky]) => (
            <Card key={kat} title={`${kat} (${polozky.length})`}
              actions={<Button variant="secondary" size="sm" onClick={() => handleNew(kat)}>+ Položka</Button>}>
              <DataTable columns={columns} rows={polozky} rowKey={(c) => c.id} />
            </Card>
          ))}
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isNew ? 'Nová položka ceníku' : 'Upravit položku ceníku'}>
        <div className="space-y-4">
          <Input label="Název *" value={formData.nazev} onChange={(e) => setFormData({ ...formData, nazev: e.target.value })} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Kategorie" list="cenik-kategorie" placeholder="Nová nebo vyberte…" value={formData.kategorie}
              onChange={(e) => setFormData({ ...formData, kategorie: e.target.value })} />
            <Select label="Druh činnosti (výdajový paušál)" value={formData.cinnost}
              onChange={(e) => setFormData({ ...formData, cinnost: e.target.value })} options={CINNOST_OPTIONS} />
          </div>
          <datalist id="cenik-kategorie">
            {kategorie.map(k => <option key={k} value={k} />)}
          </datalist>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Jednotka" value={formData.jednotka} onChange={(e) => setFormData({ ...formData, jednotka: e.target.value })} />
            <Input label="Cena (Kč)" inputMode="decimal" value={formData.cena} onChange={(e) => setFormData({ ...formData, cena: e.target.value })} />
          </div>
          <Checkbox
            checked={formData.aktivni}
            onChange={(e) => setFormData({ ...formData, aktivni: e.target.checked })}
            label="Aktivní (nabízet při vystavování faktur)"
          />
          <Textarea label="Poznámka"
              value={formData.poznamka}
              onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
              rows={2}
            />
          {formError && isModalOpen && (
            <p className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Zrušit</Button>
            <Button onClick={handleSave} disabled={!formData.nazev.trim()}>{isNew ? 'Vytvořit' : 'Uložit'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Smazat položku ceníku"
        message={`Opravdu chcete smazat položku „${deleteTarget?.nazev ?? ''}“?`}
        confirmLabel="Smazat"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default CenikPage;
