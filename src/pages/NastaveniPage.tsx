import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input } from '../components/ui';
import { backupService } from '../services/database';
import { useNastaveni, useSaveNastaveni, usePredvoleneTexty, useCreatePredvolenyText, useUpdatePredvolenyText, useDeletePredvolenyText, useDatabaseStats, useTechnikHistorie, useAddTechnikHistorie, useDeleteTechnikHistorie } from '../hooks/useQueries';
import type { Nastaveni, PredvolenyText, TechnikHistorie } from '../types';

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

function emptyDoklad(): Omit<TechnikHistorie, 'id' | 'createdAt'> {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return {
    reviznniTechnikJmeno: '',
    reviznniTechnikCisloOpravneni: '',
    reviznniTechnikPlatnostOpravneni: '',
    reviznniTechnikOsvedceni: '',
    reviznniTechnikPlatnostOsvedceni: '',
    platOd: `${dd}.${mm}.${yyyy}`,
  };
}

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
  const { data: technikHistorie = [] } = useTechnikHistorie();
  const addHistorieMut = useAddTechnikHistorie();
  const deleteHistorieMut = useDeleteTechnikHistorie();

  // Local state for nastaveni form (user edits before saving)
  const [nastaveni, setNastaveni] = useState<Nastaveni>({
    firmaJmeno: '',
    firmaAdresa: '',
    firmaIco: '',
    firmaDic: '',
    reviznniTechnikJmeno: '',
    reviznniTechnikCisloOpravneni: '',
    reviznniTechnikPlatnostOpravneni: '',
    reviznniTechnikOsvedceni: '',
    reviznniTechnikPlatnostOsvedceni: '',
    reviznniTechnikAdresa: '',
    reviznniTechnikIco: '',
    kontaktEmail: '',
    kontaktTelefon: '',
    logo: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'obecne' | 'technik' | 'texty' | 'zalohy' | 'notifikace'>('obecne');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [selectedKategorie, setSelectedKategorie] = useState<string>(POLE_KATEGORIE[0].key);

  // Doklady technika – UI state
  const [showNewDoklad, setShowNewDoklad] = useState(false);
  const [newDoklad, setNewDoklad] = useState<Omit<TechnikHistorie, 'id' | 'createdAt'>>(emptyDoklad);

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

  const handleSaveDoklad = async () => {
    await addHistorieMut.mutateAsync({ ...newDoklad });
    setShowNewDoklad(false);
    setNewDoklad(emptyDoklad());
  };

  const handleDeleteDoklad = async (id: number) => {
    if (!window.confirm('Smazat tento doklad?')) return;
    await deleteHistorieMut.mutateAsync(id);
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
        <h1 className="text-lg font-bold text-[var(--text)]">Nastavení</h1>
        <p className="text-xs text-[var(--text-secondary)]">Konfigurace aplikace a údaje o firmě</p>
      </div>

      {saveMessage && (
        <div className={`p-4 rounded-lg ${
          saveMessage.includes('Chyba') ? 'bg-red-500/[0.12] text-red-300' : 'bg-green-500/[0.12] text-green-300'
        }`}>
          {saveMessage}
        </div>
      )}

      {/* Záložky */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('obecne')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'obecne'
              ? 'bg-[var(--bg-hover)] text-[var(--text)] border border-[var(--border-strong)] border-b-transparent -mb-px'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]'
          }`}
        >
          Obecné
        </button>
        <button
          onClick={() => setActiveTab('technik')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'technik'
              ? 'bg-[var(--bg-hover)] text-[var(--text)] border border-[var(--border-strong)] border-b-transparent -mb-px'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]'
          }`}
        >
          Revizní technik
        </button>
        <button
          onClick={() => setActiveTab('texty')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'texty'
              ? 'bg-[var(--bg-hover)] text-[var(--text)] border border-[var(--border-strong)] border-b-transparent -mb-px'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]'
          }`}
        >
          Předvolené texty
          {vlastniTexty.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded">{vlastniTexty.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('zalohy')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'zalohy'
              ? 'bg-[var(--bg-hover)] text-[var(--text)] border border-[var(--border-strong)] border-b-transparent -mb-px'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]'
          }`}
        >
          Zálohy
        </button>
        <button
          onClick={() => setActiveTab('notifikace')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'notifikace'
              ? 'bg-[var(--bg-hover)] text-[var(--text)] border border-[var(--border-strong)] border-b-transparent -mb-px'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]'
          }`}
        >
          Notifikace
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
          <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">Logo firmy</label>
          <div className="flex items-center gap-4">
            {nastaveni.logo && (
              <img
                src={nastaveni.logo}
                alt="Logo firmy"
                className="w-24 h-24 object-contain rounded-lg border border-[var(--border-medium)]"
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

      <Card title="O aplikaci">
        <div className="space-y-2 text-[var(--text-secondary)]">
          <p><strong>RevizeApp</strong> - Aplikace pro správu elektrotechnických revizí</p>
          <p>Verze: 1.0.0</p>
          <p>© 2026 RevizeApp</p>
          <p className="text-sm text-[var(--text-muted)] mt-4">
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

      {/* ══════ TAB: REVIZNÍ TECHNIK ══════ */}
      {activeTab === 'technik' && (
        <>
          <Card title="Údaje technika">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Jméno a příjmení"
                value={nastaveni.reviznniTechnikJmeno}
                onChange={(e) => setNastaveni({ ...nastaveni, reviznniTechnikJmeno: e.target.value })}
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
            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Ukládání...' : 'Uložit údaje'}
              </Button>
            </div>
          </Card>

          <Card title="Doklady technika">
            {technikHistorie.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] mb-4">Žádné doklady. Přidejte první doklad tlačítkem níže.</p>
            ) : (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase">
                      <th className="pb-2 pr-4">Platné od</th>
                      <th className="pb-2 pr-4">Č. oprávnění</th>
                      <th className="pb-2 pr-4">Platnost opr.</th>
                      <th className="pb-2 pr-4">Č. osvědčení</th>
                      <th className="pb-2 pr-4">Platnost osv.</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {technikHistorie.map((h, idx) => (
                      <tr key={h.id} className="border-b border-[var(--border-subtle)] last:border-0">
                        <td className="py-2 pr-4 text-[var(--text-secondary)] whitespace-nowrap">
                          {h.platOd || '—'}
                          {idx === 0 && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-emerald-500/[0.15] text-emerald-300 rounded font-medium">Aktuální</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">{h.reviznniTechnikCisloOpravneni || '—'}</td>
                        <td className="py-2 pr-4">{h.reviznniTechnikPlatnostOpravneni || '—'}</td>
                        <td className="py-2 pr-4">{h.reviznniTechnikOsvedceni || '—'}</td>
                        <td className="py-2 pr-4">{h.reviznniTechnikPlatnostOsvedceni || '—'}</td>
                        <td className="py-2">
                          <button
                            onClick={() => h.id !== undefined && handleDeleteDoklad(h.id)}
                            className="text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/[0.08] px-2 py-1 rounded text-xs transition-colors cursor-pointer"
                            title="Smazat"
                          >×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {showNewDoklad ? (
              <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--bg-surface)] space-y-3">
                <h4 className="text-sm font-medium text-[var(--text)]">Nový doklad</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Platné od"
                    placeholder="01.01.2025"
                    value={newDoklad.platOd || ''}
                    onChange={(e) => setNewDoklad({ ...newDoklad, platOd: e.target.value })}
                  />
                  <Input
                    label="Číslo oprávnění"
                    value={newDoklad.reviznniTechnikCisloOpravneni || ''}
                    onChange={(e) => setNewDoklad({ ...newDoklad, reviznniTechnikCisloOpravneni: e.target.value })}
                  />
                  <Input
                    label="Platnost oprávnění"
                    placeholder="31.12.2026"
                    value={newDoklad.reviznniTechnikPlatnostOpravneni || ''}
                    onChange={(e) => setNewDoklad({ ...newDoklad, reviznniTechnikPlatnostOpravneni: e.target.value })}
                  />
                  <Input
                    label="Číslo osvědčení"
                    value={newDoklad.reviznniTechnikOsvedceni || ''}
                    onChange={(e) => setNewDoklad({ ...newDoklad, reviznniTechnikOsvedceni: e.target.value })}
                  />
                  <Input
                    label="Platnost osvědčení"
                    placeholder="31.12.2026"
                    value={newDoklad.reviznniTechnikPlatnostOsvedceni || ''}
                    onChange={(e) => setNewDoklad({ ...newDoklad, reviznniTechnikPlatnostOsvedceni: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => { setShowNewDoklad(false); setNewDoklad(emptyDoklad()); }}>Zrušit</Button>
                  <Button size="sm" onClick={handleSaveDoklad} disabled={addHistorieMut.isPending}>
                    {addHistorieMut.isPending ? 'Ukládání...' : 'Uložit doklad'}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setNewDoklad(emptyDoklad()); setShowNewDoklad(true); }}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-input)] px-3 py-1.5 rounded transition-colors cursor-pointer font-medium"
              >
                + Přidat doklad
              </button>
            )}
          </Card>
        </>
      )}

      {/* ══════ TAB: ZÁLOHY ══════ */}
      {activeTab === 'zalohy' && (
        <div className="space-y-6">
          {backupMessage && (
            <div
              className={`p-4 rounded-lg border ${
                backupMessage.type === 'success'
                  ? 'border-green-500/[0.20] bg-green-500/[0.10] text-green-300'
                  : 'border-red-500/[0.20] bg-red-500/[0.10] text-red-300'
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
                    <div key={table} className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border)]">
                      <p className="text-xs text-[var(--text-secondary)] truncate" title={table}>
                        {TABLE_LABELS[table] || table}
                      </p>
                      <p className="text-xl font-bold text-[var(--text)]">{count}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[var(--border)] text-sm text-[var(--text-secondary)]">
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
              <p className="text-[var(--text-muted)]">Načítání statistiky...</p>
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
              <p className="text-[var(--text-secondary)]">
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

              <p className="text-xs text-[var(--text-muted)] border-t pt-3">
                Upozornění: Import v režimu "Nahradit vše" smaže všechna stávající data. Režim "Sloučit" může vést k duplicitám.
              </p>
            </div>
          </Card>

          {/* Údržba */}
          <Card title="Údržba databáze">
            <div className="space-y-4">
              <p className="text-[var(--text-secondary)]">
                Očistit staré data z databáze. Smazou se pouze schválené revize starší než 365 dní.
              </p>
              <Button variant="warning" onClick={handleCleanOldData} disabled={isCleaning}>
                {isCleaning ? 'Probíhá čištění...' : 'Smazat stará data'}
              </Button>
            </div>
          </Card>

          {/* Informace */}
          <Card title="O databázi">
              <div className="space-y-3 text-sm text-[var(--text-secondary)]">
              <p><strong>Typ:</strong> PostgreSQL</p>
              <p><strong>Umístění:</strong> Server (víceuživatelský přístup)</p>
              <p><strong>Formát zálohy:</strong> JSON (všechny tabulky včetně vazeb)</p>
              <p><strong>Verze exportu:</strong> 2.0.0</p>
                <p className="text-xs text-amber-300 bg-amber-500/[0.10] p-2 rounded border border-amber-500/[0.20] mt-2">
                Tip: Pravidelně exportujte zálohu. Doporučujeme provádět zálohu alespoň jednou týdně nebo před každým důležitým importem.
              </p>
            </div>
          </Card>
        </div>
      )}


      {/* ══════ TAB: NOTIFIKACE ══════ */}
      {activeTab === 'notifikace' && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Nastavte, kolik dní dopředu (nebo zpět) má systém zobrazit upozornění. Změny se projeví ihned.
            </p>
          </div>
          <Card title="Prahové hodnoty upozornění">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Plánované zakázky — upozornit X dní dopředu
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={nastaveni.upozorneniZakazkaDni ?? 7}
                  onChange={(e) => setNastaveni({ ...nastaveni, upozorneniZakazkaDni: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]"
                />
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">Výchozí: 7 dní</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Rozpracované revize — upozornit po X dnech neaktivity
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={nastaveni.upozorneniRevizeDni ?? 14}
                  onChange={(e) => setNastaveni({ ...nastaveni, upozorneniRevizeDni: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]"
                />
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">Výchozí: 14 dní</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Deadline odevzdání zprávy — upozornit X dní dopředu
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={nastaveni.upozorneniZpravaDni ?? 3}
                  onChange={(e) => setNastaveni({ ...nastaveni, upozorneniZpravaDni: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]"
                />
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">Výchozí: 3 dny</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Expirace kalibrace přístrojů — upozornit X dní dopředu
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={nastaveni.upozorneniKalibraceDni ?? 30}
                  onChange={(e) => setNastaveni({ ...nastaveni, upozorneniKalibraceDni: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]"
                />
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">Výchozí: 30 dní</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Expirace oprávnění / osvědčení technika — upozornit X dní dopředu
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={nastaveni.upozorneniTechnikDni ?? 60}
                  onChange={(e) => setNastaveni({ ...nastaveni, upozorneniTechnikDni: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]"
                />
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">Výchozí: 60 dní</p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Ukládám...' : 'Uložit nastavení'}
              </Button>
            </div>
          </Card>
          <Card title="Jak fungují upozornění">
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex gap-2"><span className="text-blue-500 mt-0.5">•</span><span><strong>Plánované zakázky</strong> — upozorní na zakázky se stavem „Plánováno“, které mají datum realizace během nastaveného počtu dní.</span></li>
              <li className="flex gap-2"><span className="text-amber-500 mt-0.5">•</span><span><strong>Rozpracované revize</strong> — upozorní na revize ve stavu „Rozpracováno“, které nebyly dokončeny delší dobu než nastavený počet dní.</span></li>
              <li className="flex gap-2"><span className="text-red-500 mt-0.5">•</span><span><strong>Deadline zprávy</strong> — upozorní na přiblížející se (nebo promekaný) deadline odevzdání revizní zprávy po dokončené zakázce.</span></li>
              <li className="flex gap-2"><span className="text-red-500 mt-0.5">•</span><span><strong>Kalibrace přístrojů</strong> — upozorní, když se blíží konec platnosti kalibrace měřicího přístroje.</span></li>
              <li className="flex gap-2"><span className="text-red-500 mt-0.5">•</span><span><strong>Expirace dokladů technika</strong> — upozorní na končec platnosti oprávnění či osvědčení revizního technika (nastaveného v záložce Revizní technik).</span></li>
            </ul>
            <p className="text-xs text-[var(--text-secondary)] mt-3">Upozornění jsou barevně rozlišena: červená = po termínu, jantárová = do 3 dní, modrá = před termínem. Zobrazuju se v reálném čase ve zvončku v bočním panelu.</p>
          </Card>
        </div>
      )}

      {/* ══════ TAB: TEXTY ══════ */}
      {activeTab === 'texty' && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Předvolené texty se zobrazí v dropdown menu u textových polí v záložce „Revidované zařízení".
            </p>
          </div>

          {textyLoading ? (
            <div className="text-center py-8 text-[var(--text-muted)]">Načítání...</div>
          ) : (
            <div className="flex border border-[var(--border)] rounded-lg overflow-hidden min-h-[420px]">
              {/* Levý panel – kategorie */}
              <div className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--bg-faint)] flex flex-col">
                {POLE_KATEGORIE.map(({ key, label }) => {
                  const count = vlastniTexty.filter(t => t.pole === key).length;
                  const isActive = selectedKategorie === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedKategorie(key);
                        setEditingText(null);
                        setNewText(null);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] last:border-b-0 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[var(--bg-hover)] text-[var(--text)] font-semibold border-l-2 border-l-blue-500'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-input)] hover:text-[var(--text)]'
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      {count > 0 && (
                        <span className="shrink-0 px-1.5 py-0.5 text-[10px] bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-full">{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Pravý panel – texty vybrané kategorie */}
              <div className="flex-1 min-w-0 p-4 flex flex-col gap-3">
                {(() => {
                  const katLabel = POLE_KATEGORIE.find(k => k.key === selectedKategorie)?.label ?? '';
                  const textyPole = vlastniTexty.filter(t => t.pole === selectedKategorie);
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[var(--text)]">{katLabel}</h3>
                        {newText?.pole !== selectedKategorie && (
                          <button
                            onClick={() => {
                              setNewText({ pole: selectedKategorie, nazev: '', text: '' });
                              setEditingText(null);
                            }}
                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] px-2.5 py-1 rounded transition-colors cursor-pointer font-medium"
                          >
                            + Přidat předvolbu
                          </button>
                        )}
                      </div>

                      {textyPole.length === 0 && !newText && (
                        <p className="text-sm text-[var(--text-secondary)] italic">Žádné vlastní předvolby pro toto pole.</p>
                      )}

                      <div className="space-y-2">
                        {textyPole.map(t => (
                          <div key={t.id} className="border border-[var(--border)] rounded-lg overflow-hidden">
                            {editingText && editingText.id === t.id ? (
                              <div className="p-3 bg-[var(--bg-input)] space-y-2">
                                <input
                                  type="text"
                                  value={editingText.nazev}
                                  onChange={(e) => setEditingText({ ...editingText, nazev: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] rounded focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:outline-none"
                                  placeholder="Název předvolby"
                                />
                                <textarea
                                  value={editingText.text}
                                  onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
                                  rows={4}
                                  className="w-full px-3 py-1.5 text-sm bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] rounded focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:outline-none resize-y"
                                  placeholder="Text předvolby"
                                />
                                <div className="flex gap-2 justify-end">
                                  <Button variant="secondary" size="sm" onClick={() => setEditingText(null)}>Zrušit</Button>
                                  <Button size="sm" onClick={() => handleSaveText(editingText)} disabled={!editingText.nazev.trim() || !editingText.text.trim()}>Uložit</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start">
                                <div className="flex-1 p-3">
                                  <div className="text-sm font-semibold text-[var(--text)]">{t.nazev}</div>
                                  <div className="text-xs text-[var(--text-secondary)] mt-1 whitespace-pre-wrap line-clamp-3">{t.text}</div>
                                </div>
                                <div className="flex items-center gap-1 p-2">
                                  <button
                                    onClick={() => setEditingText({ ...t })}
                                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] rounded transition-colors cursor-pointer text-xs"
                                    title="Upravit"
                                  >Upravit</button>
                                  <button
                                    onClick={() => t.id && handleDeleteText(t.id)}
                                    className="p-1.5 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/[0.08] rounded transition-colors cursor-pointer text-xs"
                                    title="Smazat"
                                  >×</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Formulář nové předvolby */}
                      {newText?.pole === selectedKategorie && (
                        <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg space-y-2">
                          <input
                            type="text"
                            value={newText.nazev}
                            onChange={(e) => setNewText({ ...newText, nazev: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] rounded focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:outline-none"
                            placeholder="Název předvolby"
                            autoFocus
                          />
                          <textarea
                            value={newText.text}
                            onChange={(e) => setNewText({ ...newText, text: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-1.5 text-sm bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] rounded focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:outline-none resize-y"
                            placeholder="Text předvolby"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button variant="secondary" size="sm" onClick={() => setNewText(null)}>Zrušit</Button>
                            <Button size="sm" onClick={() => handleSaveText(newText)} disabled={!newText.nazev.trim() || !newText.text.trim()}>Uložit</Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
