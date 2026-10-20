import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Select, Badge, ConfirmDialog } from '../components/ui';
import type { BadgeVariant } from '../components/ui';
import { useFaktury, useDeleteFaktura, useZmenStavFaktury } from '../hooks/useQueries';
import type { Faktura, FakturaFilter, FakturaStav } from '../types';
import { STAV_LABEL, formatKc, chybaZmenyStavu } from './fakturaUi';

const STAV_VARIANT: Record<FakturaStav, BadgeVariant> = {
  koncept: 'neutral',
  vystavena: 'info',
  zaplacena: 'success',
  storno: 'danger',
};

const formatDatum = (d?: string): string => (d ? new Date(d).toLocaleDateString('cs-CZ') : '-');

const TH = 'py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider';

const FakturyPage: React.FC = () => {
  const navigate = useNavigate();
  const [stavFilter, setStavFilter] = useState('');
  const [rokFilter, setRokFilter] = useState('');

  const filter: FakturaFilter | undefined =
    stavFilter || rokFilter
      ? {
          ...(stavFilter ? { stav: stavFilter as FakturaStav } : {}),
          ...(rokFilter ? { rok: Number(rokFilter) } : {}),
        }
      : undefined;

  const { data: faktury = [], isLoading: loading } = useFaktury(filter);
  const deleteFaktura = useDeleteFaktura();
  const zmenStav = useZmenStavFaktury();

  const [deleteTarget, setDeleteTarget] = useState<Faktura | null>(null);
  const [stornoTarget, setStornoTarget] = useState<Faktura | null>(null);
  const [error, setError] = useState<string | null>(null);

  const aktualniRok = new Date().getFullYear();
  const rokOptions = [
    { value: '', label: 'Všechny roky' },
    ...Array.from({ length: 6 }, (_, i) => String(aktualniRok - i)).map(r => ({ value: r, label: r })),
  ];
  const stavOptions = [
    { value: '', label: 'Všechny stavy' },
    ...(Object.keys(STAV_LABEL) as FakturaStav[]).map(s => ({ value: s, label: STAV_LABEL[s] })),
  ];

  const handleZmenStav = async (f: Faktura, stav: Exclude<FakturaStav, 'koncept'>) => {
    setError(null);
    try {
      await zmenStav.mutateAsync({ id: f.id, stav });
    } catch (e) {
      setError(chybaZmenyStavu(e));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteFaktura.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (e) {
      console.error('Chyba při mazání faktury:', e);
      setDeleteTarget(null);
      setError('Nepodařilo se smazat fakturu');
    }
  };

  const handleConfirmStorno = async () => {
    const f = stornoTarget;
    setStornoTarget(null);
    if (f) await handleZmenStav(f, 'storno');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-sm font-bold text-[var(--text)]">Faktury</h1>
          <p className="text-xs text-[var(--text-secondary)]">Vystavování a evidence faktur</p>
        </div>
        <Button onClick={() => navigate('/faktury/nova')}>
          <span className="sm:hidden text-lg leading-none">+</span>
          <span className="hidden sm:inline">Nová faktura</span>
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-[var(--danger-text)] bg-red-500/[0.10] border border-red-500/[0.25] rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Stav" options={stavOptions} value={stavFilter} onChange={(e) => setStavFilter(e.target.value)} />
          <Select label="Rok" options={rokOptions} value={rokFilter} onChange={(e) => setRokFilter(e.target.value)} />
        </div>
      </Card>

      {faktury.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            {filter ? 'Žádné faktury neodpovídají filtru' : 'Zatím nemáte žádné faktury'}
          </p>
          {!filter && (
            <Button onClick={() => navigate('/faktury/nova')} className="mt-4">
              Vytvořit první fakturu
            </Button>
          )}
        </Card>
      ) : (
        <Card title="Seznam faktur">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className={`text-left ${TH}`}>Číslo</th>
                  <th className={`text-left ${TH}`}>Odběratel</th>
                  <th className={`text-left ${TH}`}>Vystaveno</th>
                  <th className={`text-left ${TH}`}>Splatnost</th>
                  <th className={`text-right ${TH}`}>Celkem</th>
                  <th className={`text-left ${TH}`}>Stav</th>
                  <th className={`text-right ${TH}`}>Akce</th>
                </tr>
              </thead>
              <tbody>
                {faktury.map((f) => (
                  <tr key={f.id} className="border-b border-[var(--border-subtle)] border-l-2 border-l-transparent hover:border-l-[var(--primary)] hover:bg-[var(--bg-hover)]">
                    <td className="py-2 px-3 font-mono text-xs text-[var(--text)]">{f.cisloFaktury || '(koncept)'}</td>
                    <td className="py-2 px-3 text-xs font-medium text-[var(--text)]">{f.odberatelNazev}</td>
                    <td className="py-2 px-3 text-xs text-[var(--text-secondary)]">{formatDatum(f.datumVystaveni)}</td>
                    <td className="py-2 px-3 text-xs text-[var(--text-secondary)]">{formatDatum(f.datumSplatnosti)}</td>
                    <td className="py-2 px-3 text-xs text-right text-[var(--text)] whitespace-nowrap">{formatKc(f.celkem)}</td>
                    <td className="py-2 px-3"><Badge variant={STAV_VARIANT[f.stav]}>{STAV_LABEL[f.stav]}</Badge></td>
                    <td className="py-2 px-3">
                      <div className="flex justify-end gap-2 flex-wrap">
                        {f.stav === 'koncept' && (
                          <>
                            <Button variant="secondary" size="sm" onClick={() => navigate(`/faktury/${f.id}`)}>Upravit</Button>
                            <Button size="sm" onClick={() => handleZmenStav(f, 'vystavena')}>Vystavit</Button>
                          </>
                        )}
                        {f.stav === 'vystavena' && (
                          <>
                            <Button variant="success" size="sm" onClick={() => handleZmenStav(f, 'zaplacena')}>Zaplacena</Button>
                            <Button variant="warning" size="sm" onClick={() => setStornoTarget(f)}>Storno</Button>
                          </>
                        )}
                        {f.stav !== 'koncept' && (
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/faktury/${f.id}`)}>Detail</Button>
                        )}
                        {f.stav !== 'storno' && (
                          <Button variant="secondary" size="sm" onClick={() => window.open(`/faktura/${f.id}/nahled`, '_blank')}>Tisk</Button>
                        )}
                        {f.stav === 'koncept' && (
                          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(f)}>Smazat</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Smazat fakturu"
        message={`Opravdu chcete smazat koncept faktury pro „${deleteTarget?.odberatelNazev ?? ''}“?`}
        confirmLabel="Smazat"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        isOpen={stornoTarget !== null}
        title="Stornovat fakturu"
        message={`Opravdu chcete stornovat fakturu ${stornoTarget?.cisloFaktury ?? ''}?`}
        confirmLabel="Stornovat"
        variant="danger"
        onConfirm={handleConfirmStorno}
        onCancel={() => setStornoTarget(null)}
      />
    </div>
  );
};

export default FakturyPage;
