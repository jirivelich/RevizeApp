import React, { useState } from 'react';
import { Button, Card, Input, Modal, ConfirmDialog, Badge, PageHeader, EmptyState, DataTable } from '../components/ui';
import { ZakaznikFormModal } from '../components/ZakaznikFormModal';
import type { DataTableColumn } from '../components/ui';
import type { BadgeVariant } from '../components/ui';
import { zakazniciService } from '../services/database';
import { useZakaznici, useDeleteZakaznik } from '../hooks/useQueries';
import type { Zakaznik, Revize } from '../types';

const ZakazniciPage: React.FC = () => {
  const { data: zakaznici = [], isLoading: loading } = useZakaznici();
  const deleteZakaznik = useDeleteZakaznik();

  const [editingZakaznik, setEditingZakaznik] = useState<Zakaznik | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [revizeModalOpen, setRevizeModalOpen] = useState(false);
  const [selectedZakaznikRevize, setSelectedZakaznikRevize] = useState<Revize[]>([]);
  const [selectedZakaznikName, setSelectedZakaznikName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Zakaznik | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleNewZakaznik = () => {
    setEditingZakaznik(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleEditZakaznik = (zakaznik: Zakaznik) => {
    setEditingZakaznik(zakaznik);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDelete = (zakaznik: Zakaznik) => {
    if (!zakaznik.id) return;
    setFormError(null);
    setDeleteTarget(zakaznik);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteZakaznik.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Chyba při mazání zákazníka:', error);
      setDeleteTarget(null);
      setFormError('Nepodařilo se smazat zákazníka');
    }
  };

  const handleShowRevize = async (zakaznik: Zakaznik) => {
    if (!zakaznik.id) return;
    try {
      const revize = await zakazniciService.getRevize(zakaznik.id);
      setSelectedZakaznikRevize(revize);
      setSelectedZakaznikName(zakaznik.nazev);
      setRevizeModalOpen(true);
    } catch (error) {
      console.error('Chyba při načítání revizí zákazníka:', error);
    }
  };

  const filteredZakaznici = zakaznici.filter(z => 
    z.nazev?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    z.ico?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    z.kontaktOsoba?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    z.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--border-strong)]"></div>
      </div>
    );
  }

  const columns: DataTableColumn<Zakaznik>[] = [
    { key: 'nazev', header: 'Název', render: (r) => <span className="font-medium">{r.nazev}</span> },
    { key: 'ico', header: 'IČO', render: (r) => <span className="font-mono text-[var(--text-secondary)]">{r.ico || '-'}</span> },
    { key: 'adresa', header: 'Adresa', render: (r) => <span className="text-[var(--text-secondary)]">{r.adresa || '-'}</span> },
    { key: 'kontakt', header: 'Kontakt', render: (r) => r.kontaktOsoba || '-' },
    {
      key: 'kontakt2',
      header: 'Telefon / Email',
      render: (r) => (
        <div className="text-[var(--text-secondary)]">
          {r.telefon && <div>{r.telefon}</div>}
          {r.email && <div>{r.email}</div>}
          {!r.telefon && !r.email && '-'}
        </div>
      ),
    },
    {
      key: 'revize',
      header: 'Revizí',
      render: (r) => (
        <button
          type="button"
          className="px-2 py-1 text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded hover:bg-[var(--bg-hover-strong)] cursor-pointer"
          onClick={() => handleShowRevize(r)}
          title="Zobrazit revize zákazníka"
        >
          {r.pocetRevizi || 0}
        </button>
      ),
    },
    {
      key: 'akce',
      header: 'Akce',
      align: 'right',
      actions: true,
      render: (r) => (
        <>
          <Button variant="secondary" size="sm" onClick={() => handleEditZakaznik(r)}>Upravit</Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(r)}>Smazat</Button>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Zákazníci"
        subtitle="Správa zákazníků a jejich revizí"
        actions={
          <Button onClick={handleNewZakaznik}>
            <span className="sm:hidden text-lg leading-none">+</span>
            <span className="hidden sm:inline">Nový zákazník</span>
          </Button>
        }
      />

      {formError && (
        <p className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-lg px-3 py-2">
          {formError}
        </p>
      )}

      {/* Vyhledávání */}
      <Card className="p-4">
        <Input
          placeholder="Hledat zákazníka (název, IČO, kontakt, email)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Card>

      {/* Seznam zákazníků */}
      {filteredZakaznici.length === 0 ? (
        <EmptyState
          message={searchTerm ? 'Žádní zákazníci nenalezeni' : 'Zatím nemáte žádné zákazníky'}
          action={!searchTerm && <Button onClick={handleNewZakaznik}>Přidat prvního zákazníka</Button>}
        />
      ) : (
        <Card title="Seznam zákazníků">
          <DataTable columns={columns} rows={filteredZakaznici} rowKey={(z) => z.id ?? z.nazev} />
        </Card>
      )}

      {/* Modal pro editaci zákazníka */}
      <ZakaznikFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        zakaznik={editingZakaznik}
      />

      {/* Modal pro zobrazení revizí zákazníka */}
      <Modal
        isOpen={revizeModalOpen}
        onClose={() => setRevizeModalOpen(false)}
        title={`Revize zákazníka: ${selectedZakaznikName}`}
      >
        <div className="space-y-2">
          {selectedZakaznikRevize.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-center py-4">Žádné revize</p>
          ) : (
            selectedZakaznikRevize.map((revize) => {
              const stavVariant: BadgeVariant =
                revize.stav === 'dokončeno' ? 'success' :
                revize.stav === 'rozpracováno' ? 'warning' :
                'neutral';
              return (
                <div key={revize.id} className="p-3 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)]">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-[var(--text)]">{revize.cisloRevize || `Revize #${revize.id}`}</span>
                      <span className="text-[var(--text-secondary)] ml-2">
                        {revize.datum ? new Date(revize.datum).toLocaleDateString('cs-CZ') : 'Bez data'}
                      </span>
                    </div>
                    <Badge variant={stavVariant}>
                      {revize.stav === 'dokončeno' ? 'Dokončeno' :
                       revize.stav === 'rozpracováno' ? 'Rozpracováno' : revize.stav}
                    </Badge>
                  </div>
                  {revize.nazev && (
                    <p className="text-sm text-[var(--text-muted)] mt-1">{revize.nazev}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Smazat zákazníka"
        message={`Opravdu chcete smazat zákazníka „${deleteTarget?.nazev ?? ''}“? Vazby na revize budou odstraněny.`}
        confirmLabel="Smazat"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default ZakazniciPage;



