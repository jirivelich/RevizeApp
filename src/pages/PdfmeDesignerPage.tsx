import { useEffect, useRef, useState } from 'react';
import { Designer } from '@pdfme/ui';
import type { Template } from '@pdfme/common';
import { text, image, barcodes, line, rectangle, ellipse } from '@pdfme/schemas';

// Plugins pro pdfme
const plugins = {
  Text: text,
  Image: image,
  QRCode: barcodes.qrcode,
  Barcode: barcodes.code128,
  Line: line,
  Rectangle: rectangle,
  Ellipse: ellipse,
};

// Výchozí šablona pro revizní zprávu
const getDefaultTemplate = (): Template => ({
  basePdf: { width: 210, height: 297, padding: [10, 10, 10, 10] },
  schemas: [
    [
      // Header
      {
        name: 'title',
        type: 'text',
        position: { x: 10, y: 10 },
        width: 190,
        height: 12,
        fontSize: 18,
        fontWeight: 'bold',
        alignment: 'center',
      },
      // Info sekce
      {
        name: 'revize_cislo_label',
        type: 'text',
        position: { x: 10, y: 30 },
        width: 40,
        height: 6,
        fontSize: 10,
        fontColor: '#6b7280',
      },
      {
        name: 'revize_cislo',
        type: 'text',
        position: { x: 50, y: 30 },
        width: 50,
        height: 6,
        fontSize: 10,
      },
      {
        name: 'datum_label',
        type: 'text',
        position: { x: 110, y: 30 },
        width: 30,
        height: 6,
        fontSize: 10,
        fontColor: '#6b7280',
      },
      {
        name: 'datum',
        type: 'text',
        position: { x: 140, y: 30 },
        width: 60,
        height: 6,
        fontSize: 10,
      },
      // Zákazník
      {
        name: 'zakaznik_header',
        type: 'text',
        position: { x: 10, y: 45 },
        width: 190,
        height: 8,
        fontSize: 12,
        fontWeight: 'bold',
        backgroundColor: '#3b82f6',
        fontColor: '#ffffff',
      },
      {
        name: 'zakaznik_nazev',
        type: 'text',
        position: { x: 10, y: 55 },
        width: 190,
        height: 6,
        fontSize: 10,
      },
      {
        name: 'zakaznik_adresa',
        type: 'text',
        position: { x: 10, y: 62 },
        width: 190,
        height: 6,
        fontSize: 10,
      },
      // QR kód
      {
        name: 'qr_code',
        type: 'qrcode',
        position: { x: 170, y: 70 },
        width: 30,
        height: 30,
      },
      // Tabulka rozvaděčů
      {
        name: 'rozvadece_header',
        type: 'text',
        position: { x: 10, y: 110 },
        width: 190,
        height: 8,
        fontSize: 12,
        fontWeight: 'bold',
        backgroundColor: '#10b981',
        fontColor: '#ffffff',
      },
      // Závěr
      {
        name: 'zaver_header',
        type: 'text',
        position: { x: 10, y: 220 },
        width: 190,
        height: 8,
        fontSize: 12,
        fontWeight: 'bold',
        backgroundColor: '#6366f1',
        fontColor: '#ffffff',
      },
      {
        name: 'zaver_text',
        type: 'text',
        position: { x: 10, y: 230 },
        width: 190,
        height: 20,
        fontSize: 10,
      },
      // Podpisy
      {
        name: 'podpis_revizor_label',
        type: 'text',
        position: { x: 10, y: 260 },
        width: 80,
        height: 6,
        fontSize: 10,
        fontColor: '#6b7280',
      },
      {
        name: 'podpis_zakaznik_label',
        type: 'text',
        position: { x: 120, y: 260 },
        width: 80,
        height: 6,
        fontSize: 10,
        fontColor: '#6b7280',
      },
      // Čára pro podpis
      {
        name: 'podpis_line_1',
        type: 'line',
        position: { x: 10, y: 280 },
        width: 80,
        height: 0.5,
        color: '#000000',
      },
      {
        name: 'podpis_line_2',
        type: 'line',
        position: { x: 120, y: 280 },
        width: 80,
        height: 0.5,
        color: '#000000',
      },
    ],
  ],
});

// Výchozí hodnoty pro náhled
const getDefaultInputs = () => [
  {
    title: 'REVIZNÍ ZPRÁVA ELEKTRICKÉHO ZAŘÍZENÍ',
    revize_cislo_label: 'Číslo revize:',
    revize_cislo: 'REV-2024-001',
    datum_label: 'Datum:',
    datum: new Date().toLocaleDateString('cs-CZ'),
    zakaznik_header: '  ZÁKAZNÍK',
    zakaznik_nazev: 'Firma s.r.o.',
    zakaznik_adresa: 'Ulice 123, 100 00 Praha',
    qr_code: 'https://revizeapp.cz/revize/1',
    rozvadece_header: '  ROZVADĚČE A OKRUHY',
    zaver_header: '  ZÁVĚR',
    zaver_text: 'Elektrické zařízení je z hlediska bezpečnosti schopno provozu.',
    podpis_revizor_label: 'Podpis revizního technika:',
    podpis_zakaznik_label: 'Podpis zákazníka:',
  },
];

export default function PdfmeDesignerPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const designerRef = useRef<Designer | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<{ name: string; template: Template }[]>([]);
  const [currentTemplateName, setCurrentTemplateName] = useState('Nová šablona');

  useEffect(() => {
    // Načíst uložené šablony z localStorage
    const saved = localStorage.getItem('pdfme_templates');
    if (saved) {
      try {
        setSavedTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Chyba při načítání šablon:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Vytvořit designer
    const designer = new Designer({
      domContainer: containerRef.current,
      template: getDefaultTemplate(),
      options: {
        theme: {
          token: {
            colorPrimary: '#3b82f6',
          },
        },
      },
      plugins,
    });

    designerRef.current = designer;

    return () => {
      designer.destroy();
    };
  }, []);

  const handleSaveTemplate = () => {
    if (!designerRef.current) return;
    
    const template = designerRef.current.getTemplate();
    const name = prompt('Název šablony:', currentTemplateName);
    if (!name) return;

    const newTemplates = [...savedTemplates.filter(t => t.name !== name), { name, template }];
    setSavedTemplates(newTemplates);
    setCurrentTemplateName(name);
    localStorage.setItem('pdfme_templates', JSON.stringify(newTemplates));
    alert('Šablona uložena!');
  };

  const handleLoadTemplate = (template: Template, name: string) => {
    if (!designerRef.current) return;
    designerRef.current.updateTemplate(template);
    setCurrentTemplateName(name);
  };

  const handleExportTemplate = () => {
    if (!designerRef.current) return;
    
    const template = designerRef.current.getTemplate();
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTemplateName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTemplate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const template = JSON.parse(text) as Template;
        if (designerRef.current) {
          designerRef.current.updateTemplate(template);
          setCurrentTemplateName(file.name.replace('.json', ''));
        }
      } catch (err) {
        alert('Chyba při importu šablony');
        console.error(err);
      }
    };
    input.click();
  };

  const handlePreviewPDF = async () => {
    if (!designerRef.current) return;

    const { generate } = await import('@pdfme/generator');
    const template = designerRef.current.getTemplate();
    
    try {
      const pdf = await generate({
        template,
        inputs: getDefaultInputs(),
        plugins,
      });
      
      const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (err) {
      console.error('Chyba při generování PDF:', err);
      alert('Chyba při generování PDF');
    }
  };

  const handleResetTemplate = () => {
    if (!designerRef.current) return;
    if (confirm('Opravdu chcete resetovat šablonu na výchozí?')) {
      designerRef.current.updateTemplate(getDefaultTemplate());
      setCurrentTemplateName('Nová šablona');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b shadow-sm px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-800">
            📄 PDF Designer (pdfme)
          </h1>
          <span className="text-sm text-gray-500">
            {currentTemplateName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Uložené šablony */}
          {savedTemplates.length > 0 && (
            <select
              className="border rounded px-2 py-1.5 text-sm"
              onChange={(e) => {
                const found = savedTemplates.find(t => t.name === e.target.value);
                if (found) handleLoadTemplate(found.template, found.name);
              }}
              value=""
            >
              <option value="">Načíst šablonu...</option>
              {savedTemplates.map((t) => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleImportTemplate}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
          >
            📁 Import
          </button>

          <button
            onClick={handleExportTemplate}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
          >
            💾 Export
          </button>

          <button
            onClick={handleResetTemplate}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
          >
            🔄 Reset
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <button
            onClick={handleSaveTemplate}
            className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            💾 Uložit
          </button>

          <button
            onClick={handlePreviewPDF}
            className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
          >
            👁️ Náhled PDF
          </button>
        </div>
      </div>

      {/* Designer container */}
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}
