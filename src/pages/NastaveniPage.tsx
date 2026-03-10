import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input } from '../components/ui';
import { backupService } from '../services/database';
import { useNastaveni, useSaveNastaveni, usePredvoleneTexty, useCreatePredvolenyText, useUpdatePredvolenyText, useDeletePredvolenyText, useDatabaseStats } from '../hooks/useQueries';
import type { Nastaveni, PredvolenyText } from '../types';

// Čitelné názvy tabulek
const TABLE_LABELS: Record<string, string> = {
  revize: 'Revize',
  rozvadec: 'Rozváděče',
  okruh: 'Okruhy',
  zavada: 'Závady',
  mistnost: 'Místnosti',
  zarizeni: 'Zařízení',
  zakazka: 'Zakázky',
  mericiPristroj: 'Měřicí přístroje',
  revizePristroj: 'Vazby revize-přístroj',
  firma: 'Firmy',
  nastaveni: 'Nastavení',
  zavadaKatalog: 'Katalog závad',
  zakaznik: 'Zákazníci',
};

// Kategorie polí pro předvolené texty
const POLE_KATEGORIE: { key: string; label: string }[] = [
  { key: 'popisZarizeni', label: 'Popis revidovaného zařízení' },
  { key: 'rozsahRevize', label: 'Předmět revize je' },
  { key: 'predmetNeni', label: 'Předmět revize není' },
  { key: 'podklady', label: 'Podklady pro provedení revize' },
  { key: 'provedeneUkony', label: 'Soupis provedených úkonů' },
  { key: 'vyhodnoceniPredchozich', label: 'Vyhodnocení předchozích revizí' },
  { key: 'vysledekOduvodneni', label: 'Odůvodnění výsledku revize' },
  { key: 'zaver', label: 'Závěr revize' },
];

export function NastaveniPage() {
  const qc = useQueryClient();

  // React Query hooks
  const { data: nastaveniData } = useNastaveni();
  const saveNastaveniMut = useSaveNastaveni();
  const { data: vlastniTexty = [], isLoading: textyLoading } = usePredvoleneTexty();
  const createTextMut = useCreatePredvolenyText();
  const updateTextMut = useUpdatePredvolenyText();
  const deleteTextMut = useDeletePredvolenyText();
  const { data: statsData, refetch: refetchStats } = useDatabaseStats();
  const databaseStats = statsData?.stats ?? null;
  const databaseSize = statsData?.sizeMB ?? null;

  // Local state for nastaveni form (user edits before saving)
  const [nastaveni, setNastaveni] = useState<Nastaveni>({
    firmaJmeno: '',
    firmaAdresa: '',
    firmaIco: '',
    firmaDic: '',
    reviznniTechnikJmeno: '',
    reviznniTechnikCisloOpravneni: '',
    reviznniTechnikOsvedceni: '',
    reviznniTechnikAdresa: '',
    reviznniTechnikIco: '',
    kontaktEmail: '',
    kontaktTelefon: '',
    logo: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'obecne' | 'texty' | 'zalohy'>('obecne');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Backup state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mergeMode, setMergeMode] = useState<'replace' | 'merge'>('replace');
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(
    localStorage.getItem('lastBackupDate')
  );

  // Předvolené texty – UI state
  const [editingText, setEditingText] = useState<PredvolenyText | null>(null);
  const [newText, setNewText] = useState<{ pole: string; nazev: string; text: string } | null>(null);

  // Sync nastaveni from query data into local form state
  useEffect(() => {
    if (nastaveniData) setNastaveni(nastaveniData);
  }, [nastaveniData]);

  const handleSaveText = async (item: { id?: number; pole: string; nazev: string; text: string }) => {
    try {
      if (item.id) {
        await updateTextMut.mutateAsync({ id: item.id, data: { nazev: item.nazev, text: item.text } });
      } else {
        await createTextMut.mutateAsync({ pole: item.pole, nazev: item.nazev, text: item.text });
      }
      setEditingText(null);
      setNewText(null);
    } catch (err) {
      console.error('Chyba při ukládání textu:', err);
    }
  };

  const handleDeleteText = async (id: number) => {
    if (!window.confirm('Smazat tuto předvolbu?')) return;
    try {
      await deleteTextMut.mutateAsync(id);
    } catch (err) {
      console.error('Chyba při mazání:', err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveNastaveniMut.mutateAsync(nastaveni);
      setSaveMessage('Nastavení bylo úspěšně uloženo.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Chyba při ukládání nastavení.');
    }
    setIsSaving(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNastaveni({ ...nastaveni, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Export databáze
  const handleBackupExport = async () => {
    setIsExporting(true);
    setBackupMessage(null);
    try {
      const jsonData = await backupService.exportDatabase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `revizeapp-backup-${timestamp}.json`;

      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupMessage({
        type: 'success',
        text: `✅ Databáze byla úspěšně exportována jako ${filename}`,
      });

      const now = new Date().toISOString();
      localStorage.setItem('lastBackupDate', now);
      setLastBackupDate(now);
      refetchStats();
    } catch (error) {
      setBackupMessage({
        type: 'error',
        text: `Chyba při exportu: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Import databáze
  const handleBackupImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setBackupMessage(null);

    try {
      const jsonData = await file.text();
      const result = await backupService.importDatabase(jsonData, mergeMode);

      setBackupMessage({
        type: 'success',
        text: `✅ Import dokončen (režim: ${mergeMode === 'replace' ? 'Nahradit' : 'Sloučit'}). Importováno: ${result.imported} záznamů${result.errors > 0 ? `, chyby: ${result.errors}` : ''}.`,
      });

      qc.invalidateQueries();
    } catch (error) {
      setBackupMessage({
        type: 'error',
        text: `Chyba při importu: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
      });
    } finally {
      setIsImporting(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Očistit staré data
  const handleCleanOldData = async () => {
    if (!window.confirm('Opravdu chcete smazat všechny schválené revize starší než 365 dní a jejich závislé záznamy?')) {
      return;
    }

    setIsCleaning(true);
    try {
      const result = await backupService.cleanOldData(365);
      setBackupMessage({
        type: 'success',
        text: result.message || `✅ Smazáno ${result.deleted} starých revizí a jejich závislých záznamů.`,
      });
      qc.invalidateQueries({ queryKey: ['databaseStats'] });
    } catch (error) {
      setBackupMessage({
        type: 'error',
        text: `Chyba: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
      });
    } finally {
      setIsCleaning(false);
    }
  };

  const totalRecords = databaseStats
    ? Object.values(databaseStats).reduce((sum, n) => sum + n, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Nastavení</h1>
        <p className="text-xs text-slate-400">Konfigurace aplikace a údaje o firmě</p>
      </div>

      {saveMessage && (
        <div className={`p-4 rounded-lg ${
          saveMessage.includes('Chyba') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {saveMessage}
        </div>
      )}

      {/* Záložky */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('obecne')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'obecne'
              ? 'bg-white text-slate-800 border border-b-white border-slate-200 -mb-px'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Obecné
        </button>
        <button
          onClick={() => setActiveTab('texty')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'texty'
              ? 'bg-white text-slate-800 border border-b-white border-slate-200 -mb-px'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Předvolené texty
          {vlastniTexty.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-500 rounded">{vlastniTexty.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('zalohy')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'zalohy'
              ? 'bg-white text-slate-800 border border-b-white border-slate-200 -mb-px'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Zálohy
        </button>
      </div>

      {/* ══════ TAB: OBECNÉ ══════ */}
      {activeTab === 'obecne' && (
        <>
      <Card title="Údaje o firmě">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Název firmy"
            value={nastaveni.firmaJmeno}
            onChange={(e) => setNastaveni({ ...nastaveni, firmaJmeno: e.target.value })}
          />
          <Input
            label="Adresa"
            value={nastaveni.firmaAdresa}
            onChange={(e) => setNastaveni({ ...nastaveni, firmaAdresa: e.target.value })}
          />
          <Input
            label="IČO"
            value={nastaveni.firmaIco}
            onChange={(e) => setNastaveni({ ...nastaveni, firmaIco: e.target.value })}
          />
          <Input
            label="DIČ"
            value={nastaveni.firmaDic || ''}
            onChange={(e) => setNastaveni({ ...nastaveni, firmaDic: e.target.value })}
          />
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-slate-700 block mb-2">Logo firmy</label>
          <div className="flex items-center gap-4">
            {nastaveni.logo && (
              <img
                src={nastaveni.logo}
                alt="Logo firmy"
                className="w-24 h-24 object-contain rounded-lg border border-slate-200"
              />
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                {nastaveni.logo ? 'Změnit logo' : 'Nahrát logo'}
              </Button>
              {nastaveni.logo && (
                <Button
                  variant="danger"
                  className="ml-2"
                  onClick={() => setNastaveni({ ...nastaveni, logo: '' })}
                >
                  Odebrat
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Revizní technik">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Jméno a příjmení"
            value={nastaveni.reviznniTechnikJmeno}
            onChange={(e) => setNastaveni({ ...nastaveni, reviznniTechnikJmeno: e.target.value })}
          />
          <Input
            label="Číslo oprávnění"
            value={nastaveni.reviznniTechnikCisloOpravneni}
            onChange={(e) => setNastaveni({ ...nastaveni, reviznniTechnikCisloOpravneni: e.target.value })}
          />
          <Input
            label="Osvědčení"
            value={nastaveni.reviznniTechnikOsvedceni || ''}
            onChange={(e) => setNastaveni({ ...nastaveni, reviznniTechnikOsvedceni: e.target.value })}
          />
          <Input
            label="Adresa"
            value={nastaveni.reviznniTechnikAdresa || ''}
            onChange={(e) => setNastaveni({ ...nastaveni, reviznniTechnikAdresa: e.target.value })}
          />
          <Input
            label="IČO"
            value={nastaveni.reviznniTechnikIco || ''}
            onChange={(e) => setNastaveni({ ...nastaveni, reviznniTechnikIco: e.target.value })}
          />
          <Input
            label="E-mail"
            type="email"
            value={nastaveni.kontaktEmail || ''}
            onChange={(e) => setNastaveni({ ...nastaveni, kontaktEmail: e.target.value })}
          />
          <Input
            label="Telefon"
            value={nastaveni.kontaktTelefon || ''}
            onChange={(e) => setNastaveni({ ...nastaveni, kontaktTelefon: e.target.value })}
          />
        </div>
      </Card>

      <Card title="O aplikaci">
        <div className="space-y-2 text-slate-600">
          <p><strong>RevizeApp</strong> - Aplikace pro správu elektrotechnických revizí</p>
          <p>Verze: 1.0.0</p>
          <p>© 2026 RevizeApp</p>
          <p className="text-sm text-slate-500 mt-4">
            Data jsou ukládána na serveru v PostgreSQL databázi. 
            Pro zálohování dat použijte záložku Zálohy.
          </p>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Ukládání...' : 'Uložit nastavení'}
        </Button>
      </div>
        </>
      )}

      {/* ══════ TAB: ZÁLOHY ══════ */}
      {activeTab === 'zalohy' && (
        <div className="space-y-6">
          {backupMessage && (
            <div
              className={`p-4 rounded-lg border ${
                backupMessage.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {backupMessage.text}
            </div>
          )}

          {/* Statistika databáze */}
          <Card title="Statistika databáze">
            {databaseStats ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {Object.entries(databaseStats).map(([table, count]) => (
                    <div key={table} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-500 truncate" title={table}>
                        {TABLE_LABELS[table] || table}
                      </p>
                      <p className="text-xl font-bold text-slate-800">{count}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm text-slate-600">
                  <span>Velikost DB: <strong>{databaseSize} MB</strong></span>
                  <span>Celkem záznamů: <strong>{totalRecords}</strong></span>
                  {lastBackupDate && (
                    <span>
                      Poslední záloha:{' '}
                      <strong>{new Date(lastBackupDate).toLocaleString('cs-CZ')}</strong>
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-slate-500">Načítání statistiky...</p>
            )}
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={() => refetchStats()}>
                Obnovit statistiku
              </Button>
            </div>
          </Card>

          {/* Export */}
          <Card title="Export databáze">
            <div className="space-y-4">
              <p className="text-slate-600">
                Exportujte všechna data do JSON souboru. Tento soubor si můžete uložit jako zálohu nebo jej sdílet.
              </p>
              <Button onClick={handleBackupExport} disabled={isExporting}>
                {isExporting ? 'Probíhá export...' : 'Exportovat databázi'}
              </Button>
            </div>
          </Card>

          {/* Import */}
          <Card title="Import databáze">
            <div className="space-y-4">
              <p className="text-slate-600">
                Nahrajte JSON soubor s daty. Vyberte režim importu:
              </p>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mergeMode"
                    value="replace"
                    checked={mergeMode === 'replace'}
                    onChange={(e) => setMergeMode(e.target.value as 'replace' | 'merge')}
                  />
                  <span className="text-sm font-medium">Nahradit vše (smazat stávající data)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mergeMode"
                    value="merge"
                    checked={mergeMode === 'merge'}
                    onChange={(e) => setMergeMode(e.target.value as 'replace' | 'merge')}
                  />
                  <span className="text-sm font-medium">Sloučit (zachovat stávající data)</span>
                </label>
              </div>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleBackupImport}
                  disabled={isImporting}
                  className="hidden"
                  id="backup-import-file"
                />
                <label htmlFor="backup-import-file" className="block">
                  <Button
                    disabled={isImporting}
                    className="w-full cursor-pointer text-center"
                    onClick={() => document.getElementById('backup-import-file')?.click()}
                  >
                    {isImporting ? 'Probíhá import...' : 'Vybrat soubor k importu'}
                  </Button>
                </label>
              </div>

              <p className="text-xs text-slate-500 border-t pt-3">
                Upozornění: Import v režimu "Nahradit vše" smaže všechna stávající data. Režim "Sloučit" může vést k duplicitám.
              </p>
            </div>
          </Card>

          {/* Údržba */}
          <Card title="Údržba databáze">
            <div className="space-y-4">
              <p className="text-slate-600">
                Očistit staré data z databáze. Smazou se pouze schválené revize starší než 365 dní.
              </p>
              <Button variant="warning" onClick={handleCleanOldData} disabled={isCleaning}>
                {isCleaning ? 'Probíhá čištění...' : 'Smazat stará data'}
              </Button>
            </div>
          </Card>

          {/* Informace */}
          <Card title="O databázi">
            <div className="space-y-3 text-sm text-slate-600">
              <p><strong>Typ:</strong> PostgreSQL</p>
              <p><strong>Umístění:</strong> Server (víceuživatelský přístup)</p>
              <p><strong>Formát zálohy:</strong> JSON (všechny tabulky včetně vazeb)</p>
              <p><strong>Verze exportu:</strong> 2.0.0</p>
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                Tip: Pravidelně exportujte zálohu. Doporučujeme provádět zálohu alespoň jednou týdně nebo před každým důležitým importem.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ══════ TAB: TEXTY ══════ */}
      {activeTab === 'texty' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-600">
              Zde můžete spravovat vlastní předvolené texty, které se zobrazí v dropdown menu u textových polí v záložce „Revidované zařízení".
              Texty jsou rozděleny podle jednotlivých polí revizní zprávy.
            </p>
          </div>

          {textyLoading ? (
            <div className="text-center py-8 text-slate-500">Načítání...</div>
          ) : (
            POLE_KATEGORIE.map(({ key, label }) => {
              const textyPole = vlastniTexty.filter(t => t.pole === key);
              return (
                <Card key={key} title={label}>
                  {textyPole.length > 0 ? (
                    <div className="space-y-2">
                      {textyPole.map(t => (
                        <div key={t.id} className="border border-slate-200 rounded-lg overflow-hidden">
                          {editingText && editingText.id === t.id ? (
                            /* Editační režim */
                            <div className="p-3 bg-slate-50 space-y-2">
                              <input
                                type="text"
                                value={editingText.nazev}
                                onChange={(e) => setEditingText({ ...editingText, nazev: e.target.value })}
                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-slate-400 focus:outline-none"
                                placeholder="Název předvolby"
                              />
                              <textarea
                                value={editingText.text}
                                onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
                                rows={4}
                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-slate-400 focus:outline-none resize-y"
                                placeholder="Text předvolby"
                              />
                              <div className="flex gap-2 justify-end">
                                <Button variant="secondary" size="sm" onClick={() => setEditingText(null)}>Zrušit</Button>
                                <Button size="sm" onClick={() => handleSaveText(editingText)} disabled={!editingText.nazev.trim() || !editingText.text.trim()}>Uložit</Button>
                              </div>
                            </div>
                          ) : (
                            /* Zobrazení */
                            <div className="flex items-start">
                              <div className="flex-1 p-3">
                                <div className="text-sm font-semibold text-slate-800">{t.nazev}</div>
                                <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap line-clamp-3">{t.text}</div>
                              </div>
                              <div className="flex items-center gap-1 p-2">
                                <button
                                  onClick={() => setEditingText({ ...t })}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors cursor-pointer text-xs"
                                  title="Upravit"
                                >Upravit</button>
                                <button
                                  onClick={() => t.id && handleDeleteText(t.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer text-xs"
                                  title="Smazat"
                                >×</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Žádné vlastní předvolby pro toto pole.</p>
                  )}

                  {/* Přidání nové předvolby */}
                  {newText?.pole === key ? (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <input
                        type="text"
                        value={newText.nazev}
                        onChange={(e) => setNewText({ ...newText, nazev: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        placeholder="Název předvolby"
                        autoFocus
                      />
                      <textarea
                        value={newText.text}
                        onChange={(e) => setNewText({ ...newText, text: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none resize-y"
                        placeholder="Text předvolby"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" size="sm" onClick={() => setNewText(null)}>Zrušit</Button>
                        <Button size="sm" onClick={() => handleSaveText(newText)} disabled={!newText.nazev.trim() || !newText.text.trim()}>Uložit</Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNewText({ pole: key, nazev: '', text: '' })}
                      className="mt-3 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 px-3 py-1.5 rounded transition-colors cursor-pointer font-medium"
                    >
                      + Přidat předvolbu
                    </button>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
