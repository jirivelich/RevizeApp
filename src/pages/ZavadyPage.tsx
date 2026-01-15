import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Modal } from '../components/ui';
import { zavadaKatalogService } from '../services/database';
import type { ZavadaKatalog } from '../types';

export function ZavadyPage() {
  const [zavady, setZavady] = useState<ZavadaKatalog[]>([]);
  const [kategorie, setKategorie] = useState<string[]>([]);
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    let zavadyData = await zavadaKatalogService.getAll();
    
    // Pokud je databáze prázdná, přidej výchozí závady
    if (zavadyData.length === 0) {
      const defaultZavady = zavadaKatalogService.getDefaultZavady();
      for (const z of defaultZavady) {
        await zavadaKatalogService.create(z);
      }
      zavadyData = await zavadaKatalogService.getAll();
    }
    
    setZavady(zavadyData);
    
    // Načíst unikátní kategorie
    const kategorieData = await zavadaKatalogService.getKategorie();
    setKategorie(kategorieData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingZavada?.id) {
      await zavadaKatalogService.update(editingZavada.id, formData);
    } else {
      await zavadaKatalogService.create(formData);
    }
    setIsModalOpen(false);
    setEditingZavada(null);
    resetForm();
    loadData();
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
      await zavadaKatalogService.delete(id);
      loadData();
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
          <h1 className="text-2xl font-bold text-slate-800">Katalog závad</h1>
          <p className="text-slate-500">Databáze typických závad s odkazy na normy a zákony</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
          + Nová závada
        </Button>
      </div>

      {/* Statistiky */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
        >
          <span>{showStats ? '▼' : '▶'}</span>
          <span>{showStats ? 'Skrýt statistiky' : 'Zobrazit statistiky'}</span>
        </button>
      </div>
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${showStats ? '' : 'hidden lg:grid'}`}>
        <div className="bg-white rounded-lg p-3 sm:p-4 border border-slate-200">
          <p className="text-xs sm:text-sm text-slate-500">Celkem v katalogu</p>
          <p className="text-xl sm:text-2xl font-bold">{stats.celkem}</p>
        </div>
        <div className="bg-white rounded-lg p-3 sm:p-4 border border-red-200">
          <p className="text-xs sm:text-sm text-red-600">C1 - Kritické</p>
          <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.kriticke}</p>
        </div>
        <div className="bg-white rounded-lg p-3 sm:p-4 border border-orange-200">
          <p className="text-xs sm:text-sm text-orange-600">C2 - Vážné</p>
          <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats.vazne}</p>
        </div>
        <div className="bg-white rounded-lg p-3 sm:p-4 border border-amber-200">
          <p className="text-xs sm:text-sm text-amber-600">C3 - Drobné</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-600">{stats.drobne}</p>
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
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Závažnost</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Kategorie</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Popis</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Norma</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Článek</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Akce</th>
                </tr>
              </thead>
              <tbody>
                {filteredZavady.map((z) => (
                  <tr key={z.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        z.zavaznost === 'C1' ? 'bg-red-100 text-red-700' :
                        z.zavaznost === 'C2' ? 'bg-orange-100 text-orange-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {z.zavaznost}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{z.kategorie || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="max-w-md">
                        <p className="font-medium text-sm">{z.popis}</p>
                        {z.zneniClanku && (
                          <button
                            onClick={() => setExpandedId(expandedId === z.id ? null : z.id!)}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                          >
                            {expandedId === z.id ? '▼ Skrýt znění' : '▶ Zobrazit znění'}
                          </button>
                        )}
                        {expandedId === z.id && z.zneniClanku && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-slate-600 italic">
                            "{z.zneniClanku}"
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {z.norma && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          {z.norma}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{z.clanek || '-'}</td>
                    <td className="py-3 px-4">
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
          <p className="text-center text-slate-500 py-8">
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
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); setEditingZavada(null); }}>
              Zrušit
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.popis}>
              {editingZavada ? 'Uložit' : 'Vytvořit'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Popis závady *</label>
            <textarea
              value={formData.popis}
              onChange={(e) => setFormData({ ...formData, popis: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="text-sm font-medium text-slate-700 block mb-1">Kategorie</label>
              <input
                type="text"
                list="kategorie-list"
                value={formData.kategorie}
                onChange={(e) => setFormData({ ...formData, kategorie: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rozvaděče, Vedení, Uzemnění..."
              />
              <datalist id="kategorie-list">
                {kategorie.map(k => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4">
            <h4 className="font-medium text-slate-700 mb-3">Odkaz na normu / zákon</h4>
            
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
              <label className="text-sm font-medium text-slate-700 block mb-1">Znění článku / paragrafu</label>
              <textarea
                value={formData.zneniClanku}
                onChange={(e) => setFormData({ ...formData, zneniClanku: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
