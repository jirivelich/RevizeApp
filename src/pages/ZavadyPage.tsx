import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Select, Modal, ConfirmDialog, PageHeader, DataTable, Badge, EmptyState, Textarea } from '../components/ui';
import type { DataTableColumn } from '../components/ui';
import { useZavadyKatalog, useZavadyKategorie, useCreateZavadaKatalog, useUpdateZavadaKatalog, useDeleteZavadaKatalog } from '../hooks/useQueries';
import { queryKeys } from '../hooks/queryKeys';
import { zavadaKatalogService } from '../services/database';
import type { ZavadaKatalog } from '../types';

const chipClass = (on: boolean) =>
  `inline-flex items-center h-8 px-3 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
    on
      ? 'bg-[var(--bg-accent)] border-[var(--primary)] text-[var(--primary)]'
      : 'bg-[var(--bg-hover)] border-[var(--border-input)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-[var(--border-strong)]'
  }`;

const ZAVAZNOST_CHIPS = [
  { value: '', label: 'Všechny' },
  { value: 'C1', label: 'C1 Kritická' },
  { value: 'C2', label: 'C2 Vážná' },
  { value: 'C3', label: 'C3 Drobná' },
];

export function ZavadyPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZavada, setEditingZavada] = useState<ZavadaKatalog | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterKategorie, setFilterKategorie] = useState('');
  const [filterZavaznost, setFilterZavaznost] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ZavadaKatalog | null>(null);

  const [formData, setFormData] = useState({
    popis: '',
    zavaznost: 'C2' as ZavadaKatalog['zavaznost'],
    norma: '',
    clanek: '',
    zneniClanku: '',
    kategorie: '',
  });

  const seeded = useRef(false);
  const qc = useQueryClient();
  const { data: zavady = [], isLoading } = useZavadyKatalog();
  const { data: kategorie = [] } = useZavadyKategorie();
  const createZavadaMut = useCreateZavadaKatalog();
  const updateZavadaMut = useUpdateZavadaKatalog();
  const deleteZavadaMut = useDeleteZavadaKatalog();

  // Auto-seed default závady pokud je DB prázdná (první spuštění)
  useEffect(() => {
    if (!isLoading && zavady.length === 0 && !seeded.current) {
      seeded.current = true;
      (async () => {
        const defaultZavady = [...zavadaKatalogService.getDefaultZavady(), ...zavadaKatalogService.getZavadovnik()];
        for (const z of defaultZavady) {
          await zavadaKatalogService.create(z);
        }
        qc.invalidateQueries({ queryKey: queryKeys.zavadyKatalog.all });
        qc.invalidateQueries({ queryKey: queryKeys.zavadyKatalog.kategorie });
      })();
    }
  }, [isLoading, zavady.length, qc]);

  const [importing, setImporting] = useState(false);
  const handleDoplnitZavadovnik = async () => {
    setImporting(true);
    try {
      const existujici = new Set(zavady.map(z => z.popis.trim().toLowerCase()));
      for (const z of zavadaKatalogService.getZavadovnik()) {
        if (!existujici.has(z.popis.trim().toLowerCase())) await zavadaKatalogService.create(z);
      }
      qc.invalidateQueries({ queryKey: queryKeys.zavadyKatalog.all });
      qc.invalidateQueries({ queryKey: queryKeys.zavadyKatalog.kategorie });
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const onDone = () => { setIsModalOpen(false); setEditingZavada(null); resetForm(); };
    if (editingZavada?.id) {
      updateZavadaMut.mutate({ id: editingZavada.id, data: formData }, { onSuccess: onDone });
    } else {
      createZavadaMut.mutate(formData, { onSuccess: onDone });
    }
  };

  const resetForm = () => {
    setFormData({
      popis: '',
      zavaznost: 'C2',
      norma: '',
      clanek: '',
      zneniClanku: '',
      kategorie: '',
    });
  };

  const handleEdit = (zavada: ZavadaKatalog) => {
    setEditingZavada(zavada);
    setFormData({
      popis: zavada.popis,
      zavaznost: zavada.zavaznost,
      norma: zavada.norma || '',
      clanek: zavada.clanek || '',
      zneniClanku: zavada.zneniClanku || '',
      kategorie: zavada.kategorie || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (zavada: ZavadaKatalog) => setDeleteTarget(zavada);

  const handleConfirmDelete = () => {
    if (!deleteTarget?.id) return;
    deleteZavadaMut.mutate(deleteTarget.id);
    setDeleteTarget(null);
  };

  const filteredZavady = zavady.filter(z => {
    const matchesSearch = z.popis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      z.norma?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      z.clanek?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      z.zneniClanku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKategorie = !filterKategorie || z.kategorie === filterKategorie;
    const matchesZavaznost = !filterZavaznost || z.zavaznost === filterZavaznost;
    return matchesSearch && matchesKategorie && matchesZavaznost;
  });

  // Statistiky
  const stats = {
    celkem: zavady.length,
    kriticke: zavady.filter(z => z.zavaznost === 'C1').length,
    vazne: zavady.filter(z => z.zavaznost === 'C2').length,
    drobne: zavady.filter(z => z.zavaznost === 'C3').length,
  };

  const columns: DataTableColumn<ZavadaKatalog>[] = [
    {
      key: 'zavaznost',
      header: 'Závažnost',
      render: (z) => (
        <Badge variant={z.zavaznost === 'C1' ? 'danger' : z.zavaznost === 'C2' ? 'warning' : 'neutral'}>
          {z.zavaznost}
        </Badge>
      ),
    },
    { key: 'kategorie', header: 'Kategorie', render: (z) => z.kategorie || '-' },
    {
      key: 'popis',
      header: 'Popis',
      render: (z) => (
        <div className="max-w-md text-left">
          <p className="font-medium">{z.popis}</p>
          {z.zneniClanku && (
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === z.id ? null : z.id!)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] mt-1 cursor-pointer"
            >
              {expandedId === z.id ? '▼ Skrýt znění' : '▶ Zobrazit znění'}
            </button>
          )}
          {expandedId === z.id && z.zneniClanku && (
            <div className="mt-2 p-2 bg-[var(--bg-input)] rounded text-xs text-[var(--text-secondary)] italic">
              "{z.zneniClanku}"
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'norma',
      header: 'Norma',
      render: (z) =>
        z.norma ? (
          <Badge variant="neutral">{z.norma}</Badge>
        ) : null,
    },
    { key: 'clanek', header: 'Článek', render: (z) => <span className="text-[var(--text-secondary)]">{z.clanek || '-'}</span> },
    {
      key: 'akce',
      header: 'Akce',
      align: 'right',
      actions: true,
      render: (z) => (
        <>
          <Button variant="secondary" size="sm" onClick={() => handleEdit(z)}>Upravit</Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(z)}>Smazat</Button>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Katalog závad"
        subtitle="Databáze typických závad s odkazy na normy a zákony"
        actions={
          <>
          <Button size="sm" variant="secondary" onClick={handleDoplnitZavadovnik} disabled={importing}>
            {importing ? 'Doplňuji…' : 'Doplnit ze závadovníku'}
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <span className="sm:hidden text-lg leading-none">+</span>
            <span className="hidden sm:inline">+ Nová závada</span>
          </Button>
          </>
        }
      />

      {/* Statistiky */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-2 min-h-[44px] text-xs text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer"
        >
          <span>{showStats ? '▼' : '▶'}</span>
          <span>{showStats ? 'Skrýt statistiky' : 'Zobrazit statistiky'}</span>
        </button>
      </div>
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${showStats ? '' : 'hidden lg:grid'}`}>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-[var(--text-secondary)]">Celkem v katalogu</p>
          <p className="text-lg sm:text-xl font-bold text-[var(--text)]">{stats.celkem}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-[var(--text-secondary)]">C1 - Kritické</p>
          <p className="text-lg sm:text-xl font-bold text-[var(--text)]">{stats.kriticke}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-[var(--text-secondary)]">C2 - Vážné</p>
          <p className="text-lg sm:text-xl font-bold text-[var(--text)]">{stats.vazne}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-[var(--text-secondary)]">C3 - Drobné</p>
          <p className="text-lg sm:text-xl font-bold text-[var(--text)]">{stats.drobne}</p>
        </Card>
      </div>

      <Card>
        {/* Filtry */}
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Hledat v popisu, normě, znění..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={filterKategorie}
            onChange={(e) => setFilterKategorie(e.target.value)}
            options={[
              { value: '', label: 'Všechny kategorie' },
              ...kategorie.map(k => ({ value: k, label: k }))
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filtr závažnosti">
          {ZAVAZNOST_CHIPS.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={filterZavaznost === c.value}
              className={chipClass(filterZavaznost === c.value)}
              onClick={() => setFilterZavaznost(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {filteredZavady.length > 0 ? (
          <DataTable columns={columns} rows={filteredZavady} rowKey={(r) => r.id ?? r.popis} />
        ) : (
          <EmptyState
            message={filterKategorie || filterZavaznost || searchTerm
              ? 'Žádné závady neodpovídají filtru.'
              : 'Katalog závad je prázdný. Přidejte první závadu kliknutím na tlačítko výše.'}
          />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingZavada(null); }}
        title={editingZavada ? 'Upravit závadu v katalogu' : 'Nová závada do katalogu'}
        size="lg"
        footer={
          <>
            <Button size="sm" variant="secondary" onClick={() => { setIsModalOpen(false); setEditingZavada(null); }}>
              Zrušit
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!formData.popis}>
              {editingZavada ? 'Uložit' : 'Vytvořit'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea label="Popis závady *"
              value={formData.popis}
              onChange={(e) => setFormData({ ...formData, popis: e.target.value })}
              rows={2}
              placeholder="Stručný popis typické závady..."
              required
            />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Závažnost"
              value={formData.zavaznost}
              onChange={(e) => setFormData({ ...formData, zavaznost: e.target.value as ZavadaKatalog['zavaznost'] })}
              options={[
                { value: 'C1', label: 'C1 - Kritická (nebezpečí úrazu)' },
                { value: 'C2', label: 'C2 - Vážná (porušení předpisů)' },
                { value: 'C3', label: 'C3 - Drobná (doporučení)' },
              ]}
            />
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Kategorie</label>
              <input
                type="text"
                list="kategorie-list"
                value={formData.kategorie}
                onChange={(e) => setFormData({ ...formData, kategorie: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-input)] text-[var(--text)] placeholder:text-[var(--text-muted)] border-[var(--border-input)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring-color)]"
                placeholder="Rozvaděče, Vedení, Uzemnění..."
              />
              <datalist id="kategorie-list">
                {kategorie.map(k => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-4 mt-4">
            <h4 className="font-medium text-[var(--text)] mb-3">Odkaz na normu / zákon</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Norma / Zákon"
                value={formData.norma}
                onChange={(e) => setFormData({ ...formData, norma: e.target.value })}
                placeholder="ČSN 33 1500, Zákon 458/2000 Sb."
              />
              <Input
                label="Článek / Paragraf"
                value={formData.clanek}
                onChange={(e) => setFormData({ ...formData, clanek: e.target.value })}
                placeholder="čl. 5.3, § 28 odst. 1"
              />
            </div>

            <Textarea label="Znění článku / paragrafu"
                value={formData.zneniClanku}
                onChange={(e) => setFormData({ ...formData, zneniClanku: e.target.value })}
                rows={4}
                placeholder="Úplné nebo zkrácené znění článku normy či paragrafu zákona..."
              />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Smazat závadu"
        message="Opravdu chcete smazat tuto závadu z katalogu?"
        confirmLabel="Smazat"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
