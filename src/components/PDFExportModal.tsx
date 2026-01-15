import { useEffect, useState } from 'react';
import { Button, Modal, Select } from './ui';
import { generatePDF, previewPDF, downloadPDF } from '../services/pdfExport';
import { sablonaService, nastaveniService, rozvadecService, okruhService, zavadaService, mistnostService, zarizeniService, revizePristrojService } from '../services/database';
import type { Revize, Sablona, Nastaveni, Rozvadec, Okruh, Zavada, Mistnost, Zarizeni, MericiPristroj } from '../types';
import type { jsPDF } from 'jspdf';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  revize: Revize;
}

export function PDFExportModal({ isOpen, onClose, revize }: PDFExportModalProps) {
  const [sablony, setSablony] = useState<Sablona[]>([]);
  const [selectedSablonaId, setSelectedSablonaId] = useState<number | null>(null);
  const [nastaveni, setNastaveni] = useState<Nastaveni | null>(null);
  const [rozvadece, setRozvadece] = useState<Rozvadec[]>([]);
  const [okruhy, setOkruhy] = useState<Record<number, Okruh[]>>({});
  const [zavady, setZavady] = useState<Zavada[]>([]);
  const [mistnosti, setMistnosti] = useState<Mistnost[]>([]);
  const [zarizeni, setZarizeni] = useState<Record<number, Zarizeni[]>>({});
  const [pouzitePristroje, setPouzitePristroje] = useState<MericiPristroj[]>([]);
  const [pdfDoc, setPdfDoc] = useState<jsPDF | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('PDFExportModal render, isOpen:', isOpen);

  useEffect(() => {
    console.log('PDFExportModal useEffect, isOpen:', isOpen);
    if (isOpen) {
      loadData();
    }
  }, [isOpen, revize.id]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Načíst šablony - pokud neexistují, vytvoř výchozí
      let sablonyData = await sablonaService.getAll();
      
      if (sablonyData.length === 0) {
        // Vytvoř výchozí šablonu
        const defaultSablona = sablonaService.getDefaultSablona();
        await sablonaService.create(defaultSablona);
        sablonyData = await sablonaService.getAll();
      }
      
      setSablony(sablonyData);
      
      // Vybrat výchozí šablonu
      const vychoziSablona = sablonyData.find(s => s.jeVychozi) || sablonyData[0];
      if (vychoziSablona?.id) {
        setSelectedSablonaId(vychoziSablona.id);
      }

      // Načíst nastavení
      const nastaveniData = await nastaveniService.get();
      setNastaveni(nastaveniData || null);

      // Načíst data revize
      if (revize.id) {
        const rozvadeceData = await rozvadecService.getByRevize(revize.id);
        setRozvadece(rozvadeceData);

        // Načíst okruhy pro každý rozvaděč
        const okruhyData: Record<number, Okruh[]> = {};
        for (const roz of rozvadeceData) {
          if (roz.id) {
            okruhyData[roz.id] = await okruhService.getByRozvadec(roz.id);
          }
        }
        setOkruhy(okruhyData);

        setZavady(await zavadaService.getByRevize(revize.id));
        
        const mistnostiData = await mistnostService.getByRevize(revize.id);
        setMistnosti(mistnostiData);

        // Načíst zařízení pro každou místnost
        const zarizeniData: Record<number, Zarizeni[]> = {};
        for (const mist of mistnostiData) {
          if (mist.id) {
            zarizeniData[mist.id] = await zarizeniService.getByMistnost(mist.id);
          }
        }
        setZarizeni(zarizeniData);

        // Načíst použité měřicí přístroje
        const pristrojeData = await revizePristrojService.getByRevize(revize.id);
        setPouzitePristroje(pristrojeData);
      }
    } catch (err) {
      setError('Chyba při načítání dat');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSablonaId && !isLoading && sablony.length > 0) {
      generatePreview();
    }
  }, [selectedSablonaId, sablony]);

  const generatePreview = async () => {
    if (!selectedSablonaId) {
      console.log('No sablona selected');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('Generating PDF with sablona ID:', selectedSablonaId);
      const sablona = await sablonaService.getById(selectedSablonaId);
      if (!sablona) {
        setError('Šablona nebyla nalezena');
        setIsLoading(false);
        return;
      }

      console.log('Sablona loaded:', sablona.nazev);
      console.log('Revize:', revize);
      console.log('Rozvadece:', rozvadece.length);

      const doc = await generatePDF({
        revize,
        rozvadece,
        okruhy,
        zavady,
        mistnosti,
        zarizeni,
        nastaveni,
        sablona,
        pouzitePristroje,
      });

      console.log('PDF generated successfully');
      setPdfDoc(doc);
      const previewUrl = previewPDF(doc);
      console.log('Preview URL length:', previewUrl.length);
      setPdfPreviewUrl(previewUrl);
    } catch (err) {
      console.error('PDF generation error:', err);
      setError(`Chyba při generování PDF: ${err instanceof Error ? err.message : 'Neznámá chyba'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (pdfDoc) {
      const filename = `Revize_${revize.cisloRevize.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      downloadPDF(pdfDoc, filename);
    }
  };

  const handlePrint = () => {
    if (pdfPreviewUrl) {
      const printWindow = window.open(pdfPreviewUrl);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export revizní zprávy do PDF"
      size="xl"
      footer={
        <div className="flex justify-between w-full">
          <Button variant="secondary" onClick={onClose}>
            Zavřít
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              onClick={handlePrint}
              disabled={!pdfDoc || isLoading}
            >
              🖨️ Tisk
            </Button>
            <Button 
              onClick={handleDownload}
              disabled={!pdfDoc || isLoading}
            >
              📥 Stáhnout PDF
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Výběr šablony */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Select
              label="Šablona dokumentu"
              value={selectedSablonaId?.toString() || ''}
              onChange={(e) => setSelectedSablonaId(parseInt(e.target.value))}
              options={sablony.map(s => ({
                value: s.id!.toString(),
                label: `${s.nazev}${s.jeVychozi ? ' (výchozí)' : ''}`,
              }))}
            />
          </div>
          <Button 
            variant="secondary" 
            onClick={generatePreview}
            disabled={isLoading || !selectedSablonaId}
          >
            🔄 Obnovit náhled
          </Button>
        </div>

        {/* Info o revizi */}
        <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Číslo revize:</span>
            <p className="font-medium">{revize.cisloRevize}</p>
          </div>
          <div>
            <span className="text-slate-500">Rozvaděče:</span>
            <p className="font-medium">{rozvadece.length}</p>
          </div>
          <div>
            <span className="text-slate-500">Okruhy:</span>
            <p className="font-medium">{Object.values(okruhy).reduce((sum, arr) => sum + arr.length, 0)}</p>
          </div>
          <div>
            <span className="text-slate-500">Závady:</span>
            <p className="font-medium">{zavady.length}</p>
          </div>
        </div>

        {/* Chybová zpráva */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
            {error}
          </div>
        )}

        {/* Debug info */}
        <div className="text-xs text-slate-400 bg-slate-50 p-2 rounded">
          Šablon: {sablony.length} | Vybraná: {selectedSablonaId || 'žádná'} | Loading: {isLoading ? 'ano' : 'ne'} | Preview URL: {pdfPreviewUrl ? 'ano' : 'ne'}
        </div>

        {/* Náhled PDF */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-100" style={{ height: '60vh' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Generuji náhled PDF...</p>
              </div>
            </div>
          ) : pdfPreviewUrl ? (
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-full"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <p>{sablony.length === 0 ? 'Načítám šablony...' : 'Vyberte šablonu pro zobrazení náhledu'}</p>
            </div>
          )}
        </div>

        {/* Poznámka */}
        <p className="text-sm text-slate-500">
          💡 Tip: Nastavení šablon můžete upravit v menu <strong>Šablony PDF</strong>. 
          Údaje o firmě a technikovi se načítají z <strong>Nastavení</strong>.
        </p>
      </div>
    </Modal>
  );
}
