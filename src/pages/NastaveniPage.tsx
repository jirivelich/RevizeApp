import { useEffect, useState, useRef } from 'react';
import { Button, Card, Input } from '../components/ui';
import { nastaveniService, exportService } from '../services/database';
import type { Nastaveni } from '../types';

export function NastaveniPage() {
  const [nastaveni, setNastaveni] = useState<Nastaveni>({
    firmaJmeno: '',
    firmaAdresa: '',
    firmaIco: '',
    firmaDic: '',
    reviznniTechnikJmeno: '',
    reviznniTechnikCisloOpravneni: '',
    kontaktEmail: '',
    kontaktTelefon: '',
    logo: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadNastaveni();
  }, []);

  const loadNastaveni = async () => {
    const data = await nastaveniService.get();
    if (data) {
      setNastaveni(data);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await nastaveniService.save(nastaveni);
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

  const handleExport = async () => {
    const data = await exportService.exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revizeapp-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          await exportService.importAll(reader.result as string);
          setSaveMessage('Data byla úspěšně importována.');
          loadNastaveni();
          setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
          setSaveMessage('Chyba při importu dat.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nastavení</h1>
        <p className="text-slate-500">Konfigurace aplikace a údaje o firmě</p>
      </div>

      {saveMessage && (
        <div className={`p-4 rounded-lg ${
          saveMessage.includes('Chyba') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {saveMessage}
        </div>
      )}

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

      <Card title="Export a Import dat">
        <p className="text-slate-600 mb-4">
          Exportujte všechna data do JSON souboru pro zálohu nebo importujte data z předchozí zálohy.
        </p>
        <div className="flex gap-4">
          <Button onClick={handleExport}>
            📥 Exportovat data
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="secondary"
            onClick={() => importInputRef.current?.click()}
          >
            📤 Importovat data
          </Button>
        </div>
        <p className="text-sm text-slate-500 mt-4">
          ⚠️ Import dat přepíše všechna existující data.
        </p>
      </Card>

      <Card title="O aplikaci">
        <div className="space-y-2 text-slate-600">
          <p><strong>RevizeApp</strong> - Aplikace pro správu elektrotechnických revizí</p>
          <p>Verze: 1.0.0</p>
          <p>© 2026 RevizeApp</p>
          <p className="text-sm text-slate-500 mt-4">
            Data jsou ukládána lokálně v prohlížeči pomocí IndexedDB. 
            Pro zálohování dat použijte funkci Export.
          </p>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Ukládání...' : '💾 Uložit nastavení'}
        </Button>
      </div>
    </div>
  );
}
