// PDFDesignerPage - stránka pro vizuální návrh PDF šablon
import { useState, useEffect } from 'react';
import { PDFDesigner } from '../components/PDFDesigner';
import type { Revize, Nastaveni } from '../types';
import type { DesignerTemplate } from '../components/PDFDesigner';

export function PDFDesignerPage() {
  const [revize, setRevize] = useState<Revize | null>(null);
  const [nastaveni, setNastaveni] = useState<Nastaveni | null>(null);
  const [loading, setLoading] = useState(true);

  // Načíst demo data pro náhled
  useEffect(() => {
    const loadData = async () => {
      try {
        // Načíst poslední revizi pro náhled
        const revizeResponse = await fetch('/api/revize');
        if (revizeResponse.ok) {
          const revizeData = await revizeResponse.json();
          if (revizeData.length > 0) {
            // Načíst detail první revize
            const detailResponse = await fetch(`/api/revize/${revizeData[0].id}`);
            if (detailResponse.ok) {
              setRevize(await detailResponse.json());
            }
          }
        }

        // Načíst nastavení
        const nastaveniResponse = await fetch('/api/nastaveni');
        if (nastaveniResponse.ok) {
          setNastaveni(await nastaveniResponse.json());
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Export šablony jako PDF (zatím jen log)
  const handleExport = (template: DesignerTemplate) => {
    console.log('Exporting template:', template);
    // TODO: Implementovat skutečný export do PDF pomocí html2pdf nebo jsPDF
    alert(`Šablona "${template.name}" připravena k exportu.\n\nPočet stránek: ${template.pages.length}\nCelkem widgetů: ${template.pages.reduce((sum, p) => sum + p.widgets.length, 0)}`);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Načítám data pro náhled...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)]">
      <PDFDesigner
        revize={revize}
        nastaveni={nastaveni}
        onExport={handleExport}
      />
    </div>
  );
}

export default PDFDesignerPage;
