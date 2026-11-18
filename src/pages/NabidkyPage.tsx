import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, ConfirmDialog, PageHeader, EmptyState, DataTable, Input } from '../components/ui';
import type { DataTableColumn } from '../components/ui';
import type { Nabidka, NabidkaStav } from '../types';
import { formatKc } from './fakturaUi';
import {
  useNabidky, useDeleteNabidka, useNabidkaNaFakturu, NABIDKA_STAV_LABEL, NABIDKA_STAV_VARIANT,
} from '../services/nabidky';

const formatDatum = (d?: string | null): string => (d ? new Date(d).toLocaleDateString('cs-CZ') : '–');
const dnes = () => new Date().toISOString().slice(0, 10);

const chipClass = (on: boolean) =>
  `inline-flex items-center gap-1 h-8 px-3 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
    on
      ? 'bg-[var(--bg-accent)] border-[var(--primary)] text-[var(--primary-text)]'
      : 'bg-[var(--bg-hover)] border-[var(--border-input)] text-[var(--text-secondary)] hover:text-[var(--text)]'
  }`;

const NabidkyPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: nabidky = [], isLoading } = useNabidky();
  const smazat = useDeleteNabidka();
  const naFakturu = useNabidkaNaFakturu();

  const [stav, setStav] = useState<NabidkaStav | ''>('');
  const [hledat, setHledat] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Nabidka | null>(null);
  const [error, setError] = useState<string | null>(null);

  const zobrazene = useMemo(() => {
    const q = hledat.trim().toLowerCase();
    return nabidky.filter(n =>
      (!stav || n.stav === stav)
      && (!q || [n.cislo, n.odberatelNazev, n.predmet, n.misto].some(x => (x || '').toLowerCase().includes(q))));
  }, [nabidky, stav, hledat]);

  const vytvorFakturu = async (n: Nabidka) => {
    setError(null);
    try {
      const fakturaId = await naFakturu.mutateAsync(n.id);
      navigate(`/faktury/${fakturaId}`);
    } catch (e) {
      setError((e as Error).message || 'Fakturu se nepodařilo vytvořit');
    }
  };

  const columns: DataTableColumn<Nabidka>[] = [
    { key: 'cislo', header: 'Číslo', render: (n) => <span className="font-mono text-[var(--text-secondary)]">{n.cislo || '–'}</span> },
    {
      key: 'odberatel', header: 'Odběratel / předmět',
      render: (n) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{n.odberatelNazev}</div>
          {n.predmet && <div className="text-xs text-[var(--text-secondary)] truncate">{n.predmet}</div>}
        </div>
      ),
    },
    { key: 'vystaveno', header: 'Vystaveno', render: (n) => formatDatum(n.datumVystaveni) },
    {
      key: 'platnost', header: 'Platnost do',
      render: (n) => {
        const prosla = n.platnostDo && n.platnostDo.slice(0, 10) < dnes() && (n.stav === 'koncept' || n.stav === 'odeslana');
        return <span className={prosla ? 'text-[var(--warning-text)]' : ''}>{formatDatum(n.platnostDo)}{prosla ? ' (prošlá)' : ''}</span>;
      },
    },
    { key: 'celkem', header: 'Celkem', align: 'right', render: (n) => <span className="whitespace-nowrap tabular-nums">{formatKc(n.celkem)}</span> },
    { key: 'stav', header: 'Stav', render: (n) => <Badge variant={NABIDKA_STAV_VARIANT[n.stav]}>{NABIDKA_STAV_LABEL[n.stav]}</Badge> },
    {
      key: 'akce', header: 'Akce', align: 'right', actions: true,
      render: (n) => (
        <>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/nabidky/${n.id}`)}>Otevřít</Button>
          {n.fakturaId ? (
            <Button variant="secondary" size="sm" onClick={() => navigate(`/faktury/${n.fakturaId}`)}>Faktura</Button>
          ) : n.stav !== 'odmitnuta' && (
            <Button size="sm" onClick={() => vytvorFakturu(n)} disabled={naFakturu.isPending}>Vytvořit fakturu</Button>
          )}
          {!n.fakturaId && <Button variant="danger" size="sm" onClick={() => setDeleteTarget(n)}>Smazat</Button>}
        </>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--border-strong)]"></div>
      </div>
    );
  }

  const pocet = (s: NabidkaStav | '') => (s ? nabidky.filter(n => n.stav === s).length : nabidky.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cenové nabídky"
        subtitle="Nabídky pro zákazníky – z přijaté nabídky jedním kliknutím faktura"
        actions={<Button onClick={() => navigate('/nabidky/nova')}>Nová nabídka</Button>}
      />

      {error && (
        <p role="alert" className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-lg px-3 py-2">{error}</p>
      )}

      {nabidky.length === 0 ? (
        <EmptyState message="Zatím žádná cenová nabídka" action={<Button onClick={() => navigate('/nabidky/nova')}>Vytvořit první nabídku</Button>} />
      ) : (
        <>
          <Card className="p-4">
            <div className="space-y-3">
              <Input placeholder="Hledat číslo, odběratele, předmět, místo…" value={hledat} onChange={(e) => setHledat(e.target.value)} />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtr stavu">
                {(['', 'koncept', 'odeslana', 'prijata', 'odmitnuta'] as const).map(s => (
                  <button key={s || 'vse'} type="button" aria-pressed={stav === s} className={chipClass(stav === s)} onClick={() => setStav(s)}>
                    {s ? NABIDKA_STAV_LABEL[s] : 'Vše'} <span className="opacity-70">{pocet(s)}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
          <Card title="Nabídky">
            {zobrazene.length === 0
              ? <p className="text-sm text-[var(--text-secondary)] py-4 text-center">Žádná nabídka neodpovídá filtru.</p>
              : <DataTable columns={columns} rows={zobrazene} rowKey={(n) => n.id} />}
          </Card>
        </>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Smazat nabídku"
        message={`Opravdu chcete smazat nabídku ${deleteTarget?.cislo ?? ''}?`}
        confirmLabel="Smazat"
        variant="danger"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try { await smazat.mutateAsync(deleteTarget.id); } catch (e) { setError((e as Error).message); }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default NabidkyPage;
