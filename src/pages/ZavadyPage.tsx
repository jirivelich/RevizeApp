import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Select, Modal } from '../components/ui';
import { useZavadyKatalog, useZavadyKategorie, useCreateZavadaKatalog, useUpdateZavadaKatalog, useDeleteZavadaKatalog } from '../hooks/useQueries';
import { queryKeys } from '../hooks/queryKeys';
import { zavadaKatalogService } from '../services/database';
import type { ZavadaKatalog } from '../types';

export function ZavadyPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZavada, setEditingZavada] = useState<ZavadaKatalog | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterKategorie, setFilterKategorie] = useState('');
  const [filterZavaznost, setFilterZavaznost] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(false);

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
        const defaultZavady = zavadaKatalogService.getDefaultZavady();
        for (const z of defaultZavady) {
          await zavadaKatalogService.create(z);
        }
        qc.invalidateQueries({ queryKey: queryKeys.zavadyKatalog.all });
        qc.invalidateQueries({ queryKey: queryKeys.zavadyKatalog.kategorie });
      })();
    }
  }, [isLoading, zavady.length, qc]);

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

  const handleDelete = async (id: number) => {
    if (window.confirm('Opravdu chcete smazat tuto závadu z katalogu?')) {
      deleteZavadaMut.mutate(id);
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-[var(--text)]">Katalog závad</h1>
          <p className="text-xs text-[var(--text-secondary)]">Databáze typických závad s odkazy na normy a zákony</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setIsModalOpen(true); }}>
          <span className="sm:hidden text-lg leading-none">+</span>
          <span className="hidden sm:inline">+ Nová závada</span>
        </Button>
      </div>

      {/* Statistiky */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text)]"
        >
          <span>{showStats ? '▼' : '▶'}</span>
          <span>{showStats ? 'Skrýt statistiky' : 'Zobrazit statistiky'}</span>
        </button>
      </div>
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${showStats ? '' : 'hidden lg:grid'}`}>
        <div className="bg-[var(--bg-surface)] rounded-lg p-3 sm:p-4 border border-[var(--border)]">
          <p className="text-xs text-[var(--text-secondary)]">Celkem v katalogu</p>
          <p className="text-lg sm:text-xl font-bold text-[var(--text)]">{stats.celkem}</p>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-lg p-3 sm:p-4 border border-[var(--border)]">
          <p className="text-xs text-[var(--text-secondary)]">C1 - Kritické</p>
          <p className="text-lg sm:text-xl font-bold text-[var(--text)]">{stats.kriticke}</p>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-lg p-3 sm:p-4 border border-[var(--border)]">
          <p className="text-xs text-[var(--text-secondary)]">C2 - Vážné</p>
          <p className="text-lg sm:text-xl font-bold text-[var(--text)]">{stats.vazne}</p>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-lg p-3 sm:p-4 border border-[var(--border)]">
          <p className="text-xs text-[var(--text-secondary)]">C3 - Drobné</p>
          <p className="text-lg sm:text-xl font-bold text-[var(--text)]">{stats.drobne}</p>
        </div>
      </div>

      <Card>
        {/* Filtry */}
        <div className="flex flex-wrap gap-4 mb-4">
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
          <Select
            value={filterZavaznost}
            onChange={(e) => setFilterZavaznost(e.target.value)}
            options={[
              { value: '', label: 'Všechny závažnosti' },
              { value: 'C1', label: 'C1 - Kritická' },
              { value: 'C2', label: 'C2 - Vážná' },
              { value: 'C3', label: 'C3 - Drobná' },
            ]}
          />
        </div>

        {filteredZavady.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Závažnost</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Kategorie</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Popis</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Norma</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Článek</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Akce</th>
                </tr>
              </thead>
              <tbody>
                {filteredZavady.map((z) => (
                  <tr key={z.id} className="border-b border-[var(--border-subtle)] border-l-2 border-l-transparent hover:border-l-[#759d2f] hover:bg-[rgba(117,157,47,0.03)] group">
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        z.zavaznost === 'C1' ? 'bg-red-500/[0.15] text-red-300' :
                        z.zavaznost === 'C2' ? 'bg-amber-500/[0.15] text-amber-300' :
                        'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                      }`}>
                        {z.zavaznost}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs">{z.kategorie || '-'}</td>
                    <td className="py-2 px-3">
                      <div className="max-w-md">
                        <p className="font-medium text-xs">{z.popis}</p>
                        {z.zneniClanku && (
                          <button
                            onClick={() => setExpandedId(expandedId === z.id ? null : z.id!)}
                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] mt-1"
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
                    </td>
                    <td className="py-2 px-3">
                      {z.norma && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                          {z.norma}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-xs text-[var(--text-secondary)]">{z.clanek || '-'}</td>
                    <td className="py-2 px-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(z)}
                        >
                          Upravit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(z.id!)}
                        >
                          Smazat
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-[var(--text-muted)] py-8">
            {filterKategorie || filterZavaznost || searchTerm
              ? 'Žádné závady neodpovídají filtru.'
              : 'Katalog závad je prázdný. Přidejte první závadu kliknutím na tlačítko výše.'}
          </p>
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
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Popis závady *</label>
            <textarea
              value={formData.popis}
              onChange={(e) => setFormData({ ...formData, popis: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-input)] text-[var(--text)] border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:border-[var(--primary)]/[0.5]"
              rows={2}
              placeholder="Stručný popis typické závady..."
              required
            />
          </div>

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
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Kategorie</label>
              <input
                type="text"
                list="kategorie-list"
                value={formData.kategorie}
                onChange={(e) => setFormData({ ...formData, kategorie: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-input)] text-[var(--text)] border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:border-[var(--primary)]/[0.5]"
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

            <div className="mt-4">
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Znění článku / paragrafu</label>
              <textarea
                value={formData.zneniClanku}
                onChange={(e) => setFormData({ ...formData, zneniClanku: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-input)] text-[var(--text)] border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:border-[var(--primary)]/[0.5]"
                rows={4}
                placeholder="Úplné nebo zkrácené znění článku normy či paragrafu zákona..."
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
