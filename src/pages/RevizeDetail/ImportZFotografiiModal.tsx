import { useState, useRef } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { aiApi } from '../../services/api';
import { okruhService } from '../../services/database';
import type { Okruh, OkruhNavrh } from '../../types';

// Komprese obrázku na klientovi před odesláním
function compressImage(dataUrl: string, maxPx = 1920, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

interface ImportZFotografiiModalProps {
  open: boolean;
  onClose: () => void;
  rozvadecId: number;
  rozvadecNazev: string;
  existingOkruhy: Okruh[];
  onSaved: () => void;
}

type Step = 'upload' | 'analyzing' | 'review' | 'saving';

export function ImportZFotografiiModal({
  open,
  onClose,
  rozvadecId,
  rozvadecNazev,
  existingOkruhy,
  onSaved,
}: ImportZFotografiiModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [photos, setPhotos] = useState<string[]>([]);
  const [navrhyOkruhu, setNavrhyOkruhu] = useState<OkruhNavrh[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingCisla = new Set(existingOkruhy.map((o) => o.cislo));

  const handleReset = () => {
    setStep('upload');
    setPhotos([]);
    setNavrhyOkruhu([]);
    setError(null);
    setSavedCount(0);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 5 - photos.length;
    const toProcess = Array.from(files).slice(0, remaining);
    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    // Reset input so stejný soubor lze vybrat znovu
    e.target.value = '';
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAnalyze = async () => {
    setError(null);
    setStep('analyzing');
    try {
      const compressed = await Promise.all(photos.map((p) => compressImage(p)));
      const result = await aiApi.analyzePhotos(rozvadecId, compressed);
      if (result.okruhy.length === 0) {
        setError('AI nenašla žádné jističe na fotografiích. Zkuste nahrát kvalitnější snímky.');
        setStep('upload');
        return;
      }
      const navrhy: OkruhNavrh[] = result.okruhy.map((o) => ({
        ...o,
        selected: true,
        conflictAction: existingCisla.has(o.cislo) ? 'replace' : 'add',
      }));
      setNavrhyOkruhu(navrhy);
      setStep('review');
    } catch (err: any) {
      setError(err?.message || 'Chyba při analýze fotografií');
      setStep('upload');
    }
  };

  const handleToggleSelect = (idx: number) => {
    setNavrhyOkruhu((prev) =>
      prev.map((n, i) => (i === idx ? { ...n, selected: !n.selected } : n)),
    );
  };

  const handleSelectAll = () => {
    setNavrhyOkruhu((prev) => prev.map((n) => ({ ...n, selected: true })));
  };

  const handleDeselectAll = () => {
    setNavrhyOkruhu((prev) => prev.map((n) => ({ ...n, selected: false })));
  };

  const handleConflictAction = (idx: number, action: 'add' | 'replace' | 'skip') => {
    setNavrhyOkruhu((prev) =>
      prev.map((n, i) => {
        if (i !== idx) return n;
        return { ...n, conflictAction: action, selected: action !== 'skip' };
      }),
    );
  };

  const handleFieldChange = (idx: number, field: keyof OkruhNavrh, value: string | number | boolean) => {
    setNavrhyOkruhu((prev) =>
      prev.map((n, i) => (i === idx ? { ...n, [field]: value } : n)),
    );
  };

  const selectedCount = navrhyOkruhu.filter((n) => n.selected && n.conflictAction !== 'skip').length;

  const handleSave = async () => {
    setStep('saving');
    setError(null);
    let count = 0;
    try {
      for (const navrh of navrhyOkruhu) {
        if (!navrh.selected || navrh.conflictAction === 'skip') continue;

        const data: Omit<Okruh, 'id'> = {
          rozvadecId,
          cislo: navrh.cislo,
          nazev: navrh.nazev,
          jisticTyp: navrh.jisticTyp,
          jisticProud: navrh.jisticProud,
          pocetFazi: navrh.pocetFazi,
        };

        if (navrh.conflictAction === 'replace') {
          const existing = existingOkruhy.find((o) => o.cislo === navrh.cislo);
          if (existing?.id) {
            await okruhService.update(existing.id, data);
          } else {
            await okruhService.create(data);
          }
        } else {
          await okruhService.create(data);
        }
        count++;
        setSavedCount(count);
      }
      onSaved();
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Chyba při ukládání okruhů');
      setStep('review');
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={`📷 Import okruhů z fotografií — ${rozvadecNazev}`}
      size="xl"
      footer={
        step === 'upload' ? (
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={handleClose}>Zrušit</Button>
            <Button
              size="sm"
              onClick={handleAnalyze}
              disabled={photos.length === 0}
            >
              Analyzovat fotografie ({photos.length})
            </Button>
          </div>
        ) : step === 'review' ? (
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setStep('upload')}>← Zpět</Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={selectedCount === 0}
            >
              Uložit vybrané ({selectedCount})
            </Button>
          </div>
        ) : null
      }
    >
      {/* KROK 1 – NAHRÁNÍ FOTEK */}
      {step === 'upload' && (
        <div className="p-4 space-y-4">
          <p className="text-xs text-[var(--text-secondary)]">
            Nahrajte 1–5 fotografií rozvaděče. AI identifikuje jističe a automaticky navrhne okruhy.
          </p>

          {error && (
            <div className="px-3 py-2 bg-[var(--danger-bg)] border border-red-500/30 rounded-lg text-xs text-[var(--danger-text)]">
              {error}
            </div>
          )}

          <div
            className="border-2 border-dashed border-[var(--border-medium)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--bg-hover)] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-3xl mb-2">📷</div>
            <p className="text-sm font-medium text-[var(--text)]">Klikněte pro výběr fotografií</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Podporované formáty: JPG, PNG, WebP · Max. 5 fotek
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesChange}
          />

          {photos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                Nahrané fotografie ({photos.length}/5):
              </p>
              <div className="flex flex-wrap gap-3">
                {photos.map((photo, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={photo}
                      alt={`Foto ${i + 1}`}
                      className="w-24 h-24 object-cover rounded-lg border border-[var(--border-medium)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center transition-colors"
                    >
                      ×
                    </button>
                    <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5 rounded-b-lg">
                      Foto {i + 1}
                    </span>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 border-2 border-dashed border-[var(--border-medium)] rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors text-2xl"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KROK 2 – ANALYZOVÁNÍ */}
      {step === 'analyzing' && (
        <div className="p-12 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[var(--text)]">Analyzuji fotografie...</p>
          <p className="text-xs text-[var(--text-muted)] text-center">
            AI prochází snímky a identifikuje jističe a okruhy.<br />Může to trvat 10–30 sekund.
          </p>
        </div>
      )}

      {/* KROK 3 – PŘEHLED NÁVRHŮ */}
      {step === 'review' && (
        <div className="p-4 space-y-3">
          {error && (
            <div className="px-3 py-2 bg-[var(--danger-bg)] border border-red-500/30 rounded-lg text-xs text-[var(--danger-text)]">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-secondary)]">
              AI navrhla <strong className="text-[var(--text)]">{navrhyOkruhu.length}</strong> okruhů.
              Zkontrolujte a upravte hodnoty, poté vyberte, které chcete uložit.
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs px-2 py-0.5 rounded text-[var(--primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Vybrat vše
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs px-2 py-0.5 rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Odebrat vše
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--border-table)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--bg-accent)] border-b border-[var(--border-table)]">
                  <th className="px-2 py-2 text-left text-[var(--text-secondary)] font-medium w-8">☑</th>
                  <th className="px-2 py-2 text-left text-[var(--text-secondary)] font-medium w-10">Č.</th>
                  <th className="px-2 py-2 text-left text-[var(--text-secondary)] font-medium min-w-[160px]">Název okruhu</th>
                  <th className="px-2 py-2 text-left text-[var(--text-secondary)] font-medium w-16">Typ</th>
                  <th className="px-2 py-2 text-left text-[var(--text-secondary)] font-medium w-16">Proud (A)</th>
                  <th className="px-2 py-2 text-left text-[var(--text-secondary)] font-medium w-14">Fáze</th>
                  <th className="px-2 py-2 text-left text-[var(--text-secondary)] font-medium w-24">Kolize</th>
                </tr>
              </thead>
              <tbody>
                {navrhyOkruhu.map((navrh, idx) => {
                  const hasConflict = existingCisla.has(navrh.cislo);
                  const isSkipped = navrh.conflictAction === 'skip';
                  return (
                    <tr
                      key={idx}
                      className={`border-b border-[var(--border-table)] transition-colors ${
                        isSkipped
                          ? 'opacity-40'
                          : 'hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={navrh.selected && !isSkipped}
                          disabled={isSkipped}
                          onChange={() => handleToggleSelect(idx)}
                          className="cursor-pointer"
                        />
                      </td>
                      {/* Číslo */}
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={navrh.cislo}
                          min={1}
                          onChange={(e) => handleFieldChange(idx, 'cislo', parseInt(e.target.value) || 1)}
                          className="w-10 px-1 py-0.5 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] text-center focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]"
                        />
                      </td>
                      {/* Název */}
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={navrh.nazev}
                          onChange={(e) => handleFieldChange(idx, 'nazev', e.target.value)}
                          className="w-full px-2 py-0.5 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]"
                        />
                      </td>
                      {/* Typ jističe */}
                      <td className="px-2 py-1.5">
                        <select
                          value={navrh.jisticTyp}
                          onChange={(e) => handleFieldChange(idx, 'jisticTyp', e.target.value)}
                          className="w-full px-1 py-0.5 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]"
                        >
                          {['B', 'C', 'D', 'gG', 'aM'].map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      {/* Proud */}
                      <td className="px-2 py-1.5">
                        <select
                          value={navrh.jisticProud}
                          onChange={(e) => handleFieldChange(idx, 'jisticProud', e.target.value)}
                          className="w-full px-1 py-0.5 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]"
                        >
                          {['6', '10', '13', '16', '20', '25', '32', '40', '50', '63', '80', '100'].map((a) => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </td>
                      {/* Fáze */}
                      <td className="px-2 py-1.5">
                        <select
                          value={navrh.pocetFazi}
                          onChange={(e) => handleFieldChange(idx, 'pocetFazi', parseInt(e.target.value))}
                          className="w-full px-1 py-0.5 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]"
                        >
                          <option value={1}>1</option>
                          <option value={3}>3</option>
                        </select>
                      </td>
                      {/* Kolize */}
                      <td className="px-2 py-1.5">
                        {hasConflict ? (
                          <select
                            value={navrh.conflictAction}
                            onChange={(e) =>
                              handleConflictAction(idx, e.target.value as 'add' | 'replace' | 'skip')
                            }
                            className="w-full px-1 py-0.5 border border-yellow-500/50 rounded bg-[var(--warning-bg)] text-[var(--warning-text)] text-[10px] focus:outline-none focus:ring-1 focus:ring-yellow-500/50"
                          >
                            <option value="replace">✏️ Nahradit</option>
                            <option value="add">➕ Přidat nový</option>
                            <option value="skip">⏭️ Přeskočit</option>
                          </select>
                        ) : (
                          <span className="text-[var(--text-muted)] text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {existingCisla.size > 0 && navrhyOkruhu.some((n) => existingCisla.has(n.cislo)) && (
            <p className="text-[10px] text-[var(--warning-text)] opacity-80">
              ✱ Žluté řádky označují kolizi s existujícím okruhem (stejné číslo).
            </p>
          )}
        </div>
      )}

      {/* KROK 4 – UKLÁDÁNÍ */}
      {step === 'saving' && (
        <div className="p-12 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[var(--text)]">Ukládám okruhy...</p>
          <p className="text-xs text-[var(--text-muted)]">{savedCount} / {selectedCount} uloženo</p>
        </div>
      )}
    </Modal>
  );
}
