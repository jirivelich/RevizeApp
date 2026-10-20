import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Modal, ConfirmDialog } from '../../components/ui';
import { prilohaService } from '../../services/database';
import {
  PRILOHA_ACCEPT, prepareFile, isPdf, isPrintable, formatVelikost, dataUrlToBlob, printPriloha,
  downloadPriloha, fileTypeLabel,
} from '../../services/prilohyUtils';
import type { RevizePriloha } from '../../types';

interface PrilohyTabProps {
  revizeId: number;
}

const jeInterni = (p: RevizePriloha) => p.vTisku === false;

interface UploadZoneProps {
  title: string;
  hint: string;
  accept?: string;
  uploading: boolean;
  onFiles: (files: FileList | File[]) => void;
}

function UploadZone({ title, hint, accept, uploading, onFiles }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files); }}
      className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${
        dragOver ? 'border-[var(--primary)] bg-[var(--bg-accent)]' : 'border-[var(--border-medium)]'
      }`}
    >
      <p className="text-sm text-[var(--text)] mb-1">{title}</p>
      <p className="text-xs text-[var(--text-muted)] mb-3">{hint}</p>
      <input ref={inputRef} type="file" multiple accept={accept} className="hidden"
        onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.target.value = ''; }} />
      <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? 'Nahrávání…' : 'Vybrat soubory'}
      </Button>
    </div>
  );
}

export function PrilohyTab({ revizeId }: PrilohyTabProps) {
  const [prilohy, setPrilohy] = useState<RevizePriloha[]>([]);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<RevizePriloha | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<RevizePriloha | null>(null);

  const tistene = prilohy.filter(p => !jeInterni(p));
  const interni = prilohy.filter(jeInterni);

  const load = useCallback(async () => {
    try {
      const list = await prilohaService.getByRevize(revizeId);
      setPrilohy(list);
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setLoading(false);
    }
  }, [revizeId]);

  useEffect(() => { load(); }, [load]);

  // Miniatury tištěných obrázků se dotahují postupně (seznam je bez dat); interní dokumenty se nestahují
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const p of prilohy) {
        if (cancelled) return;
        if (p.id && !jeInterni(p) && !isPdf(p) && !thumbs[p.id]) {
          try {
            const full = await prilohaService.getById(p.id);
            if (!cancelled && full.data) setThumbs(t => ({ ...t, [p.id!]: full.data! }));
          } catch { /* miniatura se jen nezobrazí */ }
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prilohy]);

  const handleFiles = async (files: FileList | File[], internal: boolean) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    const errs: string[] = [];
    for (const file of list) {
      try {
        const prepared = await prepareFile(file, { libovolnyTyp: internal });
        await prilohaService.create({ revizeId, ...prepared, vTisku: !internal });
      } catch (e) {
        errs.push((e as Error).message);
      }
    }
    setErrors(errs);
    setUploading(false);
    await load();
  };

  const openPreview = async (p: RevizePriloha) => {
    setPreview(p);
    setPreviewUrl(null);
    try {
      const full = await prilohaService.getById(p.id!);
      setPreview(full);
      setPreviewUrl(isPdf(full) ? URL.createObjectURL(dataUrlToBlob(full.data!)) : full.data!);
    } catch (e) {
      setErrors([(e as Error).message]);
      setPreview(null);
    }
  };

  const closePreview = () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreview(null);
    setPreviewUrl(null);
  };

  const handlePrint = async (p: RevizePriloha) => {
    try {
      printPriloha(p.data ? p : await prilohaService.getById(p.id!));
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  };

  const handleDownload = async (p: RevizePriloha) => {
    try {
      downloadPriloha(p.data ? p : await prilohaService.getById(p.id!));
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await prilohaService.delete(deleteId);
    } catch (e) {
      setErrors([(e as Error).message]);
    }
    setDeleteId(null);
    await load();
  };

  const handleSaveEdit = async () => {
    if (!editing?.id) return;
    try {
      await prilohaService.update(editing.id, {
        nazev: editing.nazev,
        poznamka: editing.poznamka ?? '',
        vTisku: !jeInterni(editing),
      });
    } catch (e) {
      setErrors([(e as Error).message]);
    }
    setEditing(null);
    await load();
  };

  // Pořadí měníme v rámci jedné sekce výměnou hodnot poradi dvou sousedů
  const move = async (section: RevizePriloha[], index: number, dir: -1 | 1) => {
    const a = section[index];
    const b = section[index + dir];
    if (!a?.id || !b?.id) return;
    let pa = a.poradi ?? 0;
    let pb = b.poradi ?? 0;
    if (pa === pb) pb = pa + dir; // ochrana proti shodnému pořadí
    try {
      await Promise.all([
        prilohaService.update(a.id, { poradi: pb }),
        prilohaService.update(b.id, { poradi: pa }),
      ]);
    } catch (e) {
      setErrors([(e as Error).message]);
    }
    await load();
  };

  const renderCard = (p: RevizePriloha, section: RevizePriloha[], i: number) => {
    const internal = jeInterni(p);
    const canPreview = isPrintable(p);
    return (
      <Card key={p.id}>
        {internal ? (
          <div className="w-full h-20 mb-2 rounded border border-[var(--border-medium)] bg-[var(--bg-input)] flex items-center justify-center">
            <span className="text-lg font-bold text-[var(--text-muted)]">{fileTypeLabel(p.nazev)}</span>
          </div>
        ) : (
          <button type="button" onClick={() => openPreview(p)}
            className="w-full h-32 mb-2 rounded border border-[var(--border-medium)] bg-[var(--bg-input)] flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
            {isPdf(p) ? (
              <span className="text-2xl font-bold text-[var(--text-muted)]">PDF</span>
            ) : thumbs[p.id!] ? (
              <img src={thumbs[p.id!]} alt={p.nazev} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-[var(--text-muted)]">…</span>
            )}
          </button>
        )}
        <div className="text-sm font-medium text-[var(--text)] truncate" title={p.nazev}>{p.nazev}</div>
        <div className="text-xs text-[var(--text-muted)] mb-1">{formatVelikost(p.velikost)}</div>
        {p.poznamka && <div className="text-xs text-[var(--text-secondary)] mb-1 line-clamp-2">{p.poznamka}</div>}
        <div className="flex flex-wrap gap-1 mt-2">
          {internal && <Button variant="secondary" onClick={() => handleDownload(p)}>Stáhnout</Button>}
          {canPreview && <Button variant="secondary" onClick={() => openPreview(p)}>Náhled</Button>}
          {!internal && <Button variant="secondary" onClick={() => handlePrint(p)}>Tisk</Button>}
          <Button variant="secondary" onClick={() => setEditing(p)}>Upravit</Button>
          <Button variant="danger" onClick={() => setDeleteId(p.id!)}>Smazat</Button>
          <Button variant="secondary" onClick={() => move(section, i, -1)} disabled={i === 0} title="Posunout dříve">↑</Button>
          <Button variant="secondary" onClick={() => move(section, i, 1)} disabled={i === section.length - 1} title="Posunout později">↓</Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {errors.length > 0 && (
        <ul className="text-xs text-[var(--danger-text)] space-y-0.5">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">Přílohy k tisku ({tistene.length})</h2>
          <p className="text-xs text-[var(--text-muted)]">Připojí se na konec vytištěné revize.</p>
        </div>
        <UploadZone
          title="Přetáhněte sem soubory nebo je vyberte"
          hint="Obrázky (JPG, PNG, WebP, GIF) a PDF, max. 15 MB na soubor"
          accept={PRILOHA_ACCEPT}
          uploading={uploading}
          onFiles={(f) => handleFiles(f, false)}
        />
        {loading ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-6">Načítání příloh…</p>
        ) : tistene.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">Žádné přílohy k tisku.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tistene.map((p, i) => renderCard(p, tistene, i))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">Interní dokumenty ({interni.length})</h2>
          <p className="text-xs text-[var(--text-muted)]">Faktury, smlouvy, objednávky apod. Ukládají se jen k revizi a nikdy se netisknou.</p>
        </div>
        <UploadZone
          title="Přetáhněte sem dokumenty nebo je vyberte"
          hint="Libovolný typ souboru, max. 15 MB na soubor"
          uploading={uploading}
          onFiles={(f) => handleFiles(f, true)}
        />
        {!loading && interni.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">Žádné interní dokumenty.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {interni.map((p, i) => renderCard(p, interni, i))}
          </div>
        )}
      </section>

      <Modal isOpen={preview !== null} onClose={closePreview} title={preview?.nazev ?? 'Náhled přílohy'} size="full"
        footer={preview && (
          <div className="flex gap-2 justify-end">
            {jeInterni(preview)
              ? <Button variant="secondary" onClick={() => handleDownload(preview)}>Stáhnout</Button>
              : <Button variant="secondary" onClick={() => handlePrint(preview)} disabled={!preview.data}>Tisk</Button>}
            <Button variant="secondary" onClick={closePreview}>Zavřít</Button>
          </div>
        )}>
        {!previewUrl ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-12">Načítání…</p>
        ) : preview && isPdf(preview) ? (
          <iframe src={previewUrl} title={preview.nazev} className="w-full h-[75vh] border-0 rounded" />
        ) : (
          <img src={previewUrl} alt={preview?.nazev} className="max-w-full max-h-[75vh] mx-auto object-contain" />
        )}
      </Modal>

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title="Upravit přílohu" size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setEditing(null)}>Zrušit</Button>
            <Button onClick={handleSaveEdit} disabled={!editing?.nazev.trim()}>Uložit</Button>
          </div>
        }>
        {editing && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Název</label>
              <input value={editing.nazev} onChange={(e) => setEditing({ ...editing, nazev: e.target.value })}
                className="w-full px-2 py-1.5 border rounded-lg border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text)] text-xs" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Poznámka</label>
              <textarea value={editing.poznamka ?? ''} onChange={(e) => setEditing({ ...editing, poznamka: e.target.value })} rows={3}
                className="w-full px-2 py-1.5 border rounded-lg border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text)] text-xs" />
            </div>
            {isPrintable(editing) && (
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input type="checkbox" checked={!jeInterni(editing)}
                  onChange={(e) => setEditing({ ...editing, vTisku: e.target.checked })}
                  className="rounded border-[var(--checkbox-border)]" />
                <span>Zahrnout do tisku revize</span>
              </label>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Smazat přílohu"
        message="Opravdu chcete smazat tuto přílohu?"
        confirmLabel="Smazat"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
