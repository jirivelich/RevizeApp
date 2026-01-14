import { useState } from 'react';
import { Button, Card } from '../components/ui';
import { backupService } from '../services/database';

export function BackupRestorePage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mergeMode, setMergeMode] = useState<'replace' | 'merge'>('replace');
  const [databaseStats, setDatabaseStats] = useState<Record<string, number> | null>(null);
  const [databaseSize, setDatabaseSize] = useState<string | null>(null);

  // Načíst statistiku
  const loadStats = async () => {
    try {
      const stats = await backupService.getDatabaseStats();
      setDatabaseStats(stats);
      const size = await backupService.getDatabaseSize();
      setDatabaseSize(size);
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Chyba při načítání statistiky: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
      });
    }
  };

  // Export databáze
  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);
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

      setMessage({
        type: 'success',
        text: `✅ Databáze byla úspěšně exportována jako ${filename}`,
      });

      // Znovu načíst statistiku
      await loadStats();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Chyba při exportu: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Import databáze
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);

    try {
      const jsonData = await file.text();
      await backupService.importDatabase(jsonData, mergeMode);

      setMessage({
        type: 'success',
        text: `✅ Databáze byla úspěšně importována (režim: ${mergeMode === 'replace' ? 'Nahradit vše' : 'Sloučit'})`,
      });

      // Znovu načíst statistiku
      await loadStats();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Chyba při importu: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
      });
    } finally {
      setIsImporting(false);
      // Reset input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Očistit staré data
  const handleCleanOldData = async () => {
    if (!window.confirm('Opravdu chcete smazat všechny starší schválené revize (starší než 365 dní)?')) {
      return;
    }

    try {
      await backupService.cleanOldData(365);
      setMessage({
        type: 'success',
        text: '✅ Staré data byla úspěšně smazána',
      });
      await loadStats();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Chyba: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
      });
    }
  };

  // Autoload on mount
  import.meta.hot?.dispose(() => {});
  if (!databaseStats) {
    loadStats();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Backup & Restore</h1>
        <p className="text-slate-500">Správa záloh a obnovení databáze</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Statistika databáze */}
      <Card title="Statistika databáze">
        {databaseStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {Object.entries(databaseStats).map(([table, count]) => (
              <div key={table} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 truncate">{table}</p>
                <p className="text-xl font-bold text-slate-800">{count}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">Načítání...</p>
        )}
        {databaseSize && (
          <p className="text-sm text-slate-600 mt-4">
            💾 Přibližná velikost databáze: <span className="font-medium">{databaseSize} MB</span>
          </p>
        )}
      </Card>

      {/* Export */}
      <Card title="📥 Export databáze">
        <div className="space-y-4">
          <p className="text-slate-600">
            Exportujte všechna data do JSON souboru. Tento soubor si můžete uložit jako zálohu nebo jej sdílet.
          </p>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Probíhá export...' : '📥 Exportovat databázi'}
          </Button>
        </div>
      </Card>

      {/* Import */}
      <Card title="📤 Import databáze">
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
              <span className="text-sm font-medium">🔄 Nahradit vše (smazat stávající data)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mergeMode"
                value="merge"
                checked={mergeMode === 'merge'}
                onChange={(e) => setMergeMode(e.target.value as 'replace' | 'merge')}
              />
              <span className="text-sm font-medium">🔗 Sloučit (zachovat stávající data)</span>
            </label>
          </div>

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isImporting}
              className="hidden"
              id="import-file"
            />
            <label htmlFor="import-file" className="block">
              <Button
                disabled={isImporting}
                className="w-full cursor-pointer text-center"
                onClick={() => document.getElementById('import-file')?.click()}
              >
                {isImporting ? 'Probíhá import...' : '📤 Vybrat soubor k importu'}
              </Button>
            </label>
          </div>

          <p className="text-xs text-slate-500 border-t pt-3">
            ⚠️ Upozornění: Import v režimu "Nahradit vše" smaže všechna stávající data. Režim "Sloučit" může vést k duplicitám.
          </p>
        </div>
      </Card>

      {/* Údržba */}
      <Card title="🧹 Údržba databáze">
        <div className="space-y-4">
          <p className="text-slate-600">
            Očistit staré data z databáze. Smazou se pouze schválené revize starší než 365 dní.
          </p>
          <Button variant="warning" onClick={handleCleanOldData}>
            🧹 Smazat stará data
          </Button>
        </div>
      </Card>

      {/* Informace */}
      <Card title="ℹ️ O databázi">
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            <strong>Typ:</strong> IndexedDB (Dexie.js)
          </p>
          <p>
            <strong>Umístění:</strong> V prohlížeči (bez serveru)
          </p>
          <p>
            <strong>Kapacita:</strong> Obvykle 50GB+
          </p>
          <p>
            <strong>Bezpečnost:</strong> Data jsou privátní pro Váš prohlížeč
          </p>
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 mt-2">
            💡 Tip: Pravidelně zálohujte svá data. IndexedDB se smaže při mazání dat prohlížeče (cookies, cache, atd.).
          </p>
        </div>
      </Card>
    </div>
  );
}
