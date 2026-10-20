import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Modal, ConfirmDialog } from '../../components/ui';
import { prilohaService } from '../../services/database';
import {
  PRILOHA_ACCEPT, prepareFile, isPdf, formatVelikost, dataUrlToBlob, printPriloha,
} from '../../services/prilohyUtils';
import type { RevizePriloha } from '../../types';

interface PrilohyTabProps {
  revizeId: number;
}

export function PrilohyTab({ revizeId }: PrilohyTabProps) {
  const [prilohy, setPrilohy] = useState<RevizePriloha[]>([]);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<RevizePriloha | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<RevizePriloha | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Miniatury obrázků se dotahují postupně (seznam je bez dat)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const p of prilohy) {
        if (cancelled) return;
        if (p.id && !isPdf(p) && !thumbs[p.id]) {
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

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    const errs: string[] = [];
    for (const file of list) {
      try {
        const prepared = await prepareFile(file);
        await prilohaService.create({ revizeId, ...prepared });
      } catch (e) {
        errs.push((e as Error).message);
      }
    }
    setErrors(errs);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
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
      await prilohaService.update(editing.id, { nazev: editing.nazev, poznamka: editing.poznamka ?? '' });
    } catch (e) {
      setErrors([(e as Error).message]);
    }
    setEditing(null);
    await load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const a = prilohy[index];
    const b = prilohy[index + dir];
    if (!a?.id || !b?.id) return;
    // Pořadí přepočítáme podle pozice, aby se nikdy nepřekrývalo
    const reordered = [...prilohy];
    reordered[index] = b;
    reordered[index + dir] = a;
    setPrilohy(reordered);
    try {
      await Promise.all(reordered.map((p, i) => p.poradi === i + 1 ? null : prilohaService.update(p.id!, { poradi: i + 1 })));
    } catch (e) {
      setErrors([(e as Error).message]);
    }
    await load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver ? 'border-[var(--primary)] bg-[var(--bg-accent)]' : 'border-[var(--border-medium)]'
          }`}
        >
          <p className="text-sm text-[var(--text)] mb-1">Přetáhněte sem soubory nebo je vyberte</p>
          <p className="text-xs text-[var(--text-muted)] mb-3">Obrázky (JPG, PNG, WebP, GIF) a PDF, max. 15 MB na soubor</p>
          <input ref={inputRef} type="file" multiple accept={PRILOHA_ACCEPT} className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Nahrávání…' : 'Vybrat soubory'}
          </Button>
        </div>
        {errors.length > 0 && (
          <ul className="mt-3 text-xs text-[var(--danger-text)] space-y-0.5">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
      </Card>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-6">Načítání příloh…</p>
      ) : prilohy.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-6">K revizi zatím nejsou žádné přílohy.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {prilohy.map((p, i) => (
            <Card key={p.id}>
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
              <div className="text-sm font-medium text-[var(--text)] truncate" title={p.nazev}>{p.nazev}</div>
              <div className="text-xs text-[var(--text-muted)] mb-1">{formatVelikost(p.velikost)}</div>
              {p.poznamka && <div className="text-xs text-[var(--text-secondary)] mb-1 line-clamp-2">{p.poznamka}</div>}
              <div className="flex flex-wrap gap-1 mt-2">
                <Button variant="secondary" onClick={() => openPreview(p)}>Náhled</Button>
                <Button variant="secondary" onClick={() => handlePrint(p)}>Tisk</Button>
                <Button variant="secondary" onClick={() => setEditing(p)}>Upravit</Button>
                <Button variant="danger" onClick={() => setDeleteId(p.id!)}>Smazat</Button>
                <Button variant="secondary" onClick={() => move(i, -1)} disabled={i === 0} title="Posunout dříve">↑</Button>
                <Button variant="secondary" onClick={() => move(i, 1)} disabled={i === prilohy.length - 1} title="Posunout později">↓</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={preview !== null} onClose={closePreview} title={preview?.nazev ?? 'Náhled přílohy'} size="full"
        footer={preview && (
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => handlePrint(preview)} disabled={!preview.data}>Tisk</Button>
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
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Název (zobrazí se v tisku)</label>
              <input value={editing.nazev} onChange={(e) => setEditing({ ...editing, nazev: e.target.value })}
                className="w-full px-2 py-1.5 border rounded-lg border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text)] text-xs" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Poznámka</label>
              <textarea value={editing.poznamka ?? ''} onChange={(e) => setEditing({ ...editing, poznamka: e.target.value })} rows={3}
                className="w-full px-2 py-1.5 border rounded-lg border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text)] text-xs" />
            </div>
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
