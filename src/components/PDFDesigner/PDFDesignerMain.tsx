// PDFDesignerMain.tsx - Šablonový editor pro revizní zprávy
// Nahrazuje původní drag & drop designer jednodušším přístupem:
// Editor šablony (HTML + {{proměnné}}) + Živý náhled

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Revize, Nastaveni, Rozvadec, Okruh, Zavada, Mistnost, Zarizeni, MericiPristroj, Zakaznik } from '../../types';
import type { HtmlTemplate } from './defaultHtmlTemplates';
import { DEFAULT_HTML_TEMPLATES } from './defaultHtmlTemplates';
import { DEFAULT_TEMPLATE_CSS } from './defaultHtmlTemplates';
import {
  processTemplate,
  createTemplateContext,
  renderFullDocument,
  TEMPLATE_VARIABLES,
  INSERTABLE_BLOCKS,
} from './templateEngine';
import type { PageOptions } from './templateEngine';
import { openPDFPreview, downloadPDF, openHTMLPreview } from './pdfRenderer';
import type { PDFRenderData } from './pdfVariables';
import { pdfSablonyApi } from '../../services/api';

// ============================================================
// TYPY
// ============================================================

interface PDFDesignerMainProps {
  revize?: Revize | null;
  nastaveni?: Nastaveni | null;
  rozvadece?: Rozvadec[];
  okruhy?: Record<number, Okruh[]>;
  zavady?: Zavada[];
  mistnosti?: Mistnost[];
  zarizeni?: Record<number, Zarizeni[]>;
  pouzitePristroje?: MericiPristroj[];
  zakaznik?: Zakaznik | null;
  onClose?: () => void;
  onExport?: (template: any) => void;
  initialTemplate?: any;
}

// DB šablona
interface DbPdfSablona {
  id: number;
  nazev: string;
  popis?: string;
  jeVychozi: number;
  template: any;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// KOMPONENTA
// ============================================================

export function PDFDesignerMain({
  revize = null,
  nastaveni = null,
  rozvadece = [],
  okruhy = {},
  zavady = [],
  mistnosti = [],
  zarizeni = {},
  pouzitePristroje = [],
  zakaznik = null,
}: PDFDesignerMainProps) {

  // Demo data pro náhled pokud není revize
  const demoRevize: Revize = {
    id: 0,
    cisloRevize: 'DEMO-2026-001',
    nazev: 'Elektrická instalace - demo',
    adresa: 'Ukázková ulice 123, 110 00 Praha',
    objednatel: 'Demo zákazník s.r.o.',
    kategorieRevize: 'elektro',
    datum: new Date().toISOString(),
    datumDokonceni: new Date().toISOString(),
    datumPlatnosti: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    termin: 60,
    typRevize: 'pravidelná',
    stav: 'dokončeno',
    vysledek: 'schopno',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const pdfData: PDFRenderData = {
    revize: revize || demoRevize,
    nastaveni,
    rozvadece,
    okruhy,
    zavady,
    mistnosti,
    zarizeni,
    pouzitePristroje,
    zakaznik,
  };

  // ── Stav šablony ──
  const [templateHtml, setTemplateHtml] = useState(DEFAULT_HTML_TEMPLATES[0].html);
  const [templateCss, setTemplateCss] = useState(DEFAULT_TEMPLATE_CSS);
  const [templateName, setTemplateName] = useState(DEFAULT_HTML_TEMPLATES[0].name);
  const [pageOptions, setPageOptions] = useState<PageOptions>({
    pageSize: 'a4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
  });

  // ── UI stav ──
  const [activeTab, setActiveTab] = useState<'html' | 'css'>('html');
  const [showVarPicker, setShowVarPicker] = useState(false);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [varFilter, setVarFilter] = useState('');

  // DB šablony
  const [dbTemplates, setDbTemplates] = useState<DbPdfSablona[]>([]);
  const [currentDbId, setCurrentDbId] = useState<number | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  // ── Načtení z localStorage ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem('htmlTemplateEditor');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.html) setTemplateHtml(data.html);
        if (data.css) setTemplateCss(data.css);
        if (data.name) setTemplateName(data.name);
        if (data.pageOptions) setPageOptions(data.pageOptions);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Auto-save do localStorage ──
  useEffect(() => {
    try {
      localStorage.setItem('htmlTemplateEditor', JSON.stringify({
        html: templateHtml,
        css: templateCss,
        name: templateName,
        pageOptions,
      }));
    } catch { /* ignore */ }
  }, [templateHtml, templateCss, templateName, pageOptions]);

  // ── Načíst DB šablony ──
  useEffect(() => {
    loadDbTemplates();
  }, []);

  const loadDbTemplates = async () => {
    try {
      const templates = await pdfSablonyApi.getAll() as DbPdfSablona[];
      setDbTemplates(templates);
    } catch (e) {
      console.error('Chyba při načítání šablon:', e);
    }
  };

  // ── Živý náhled ──
  const renderedPreview = useMemo(() => {
    try {
      const context = createTemplateContext(pdfData);
      const body = processTemplate(templateHtml, context);
      return renderFullDocument(body, templateCss, pageOptions, templateName);
    } catch (e) {
      return `<html><body><pre style="color:red;">Chyba v šabloně:\n${String(e)}</pre></body></html>`;
    }
  }, [templateHtml, templateCss, pdfData, pageOptions, templateName]);

  // Aktualizovat iframe náhled
  useEffect(() => {
    const iframe = previewRef.current;
    if (iframe?.contentDocument) {
      iframe.contentDocument.open();
      iframe.contentDocument.write(renderedPreview);
      iframe.contentDocument.close();
    }
  }, [renderedPreview]);

  // ── Vložit text na pozici kurzoru ──
  const insertAtCursor = useCallback((text: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const current = activeTab === 'html' ? templateHtml : templateCss;
    const newContent = current.slice(0, start) + text + current.slice(end);

    if (activeTab === 'html') {
      setTemplateHtml(newContent);
    } else {
      setTemplateCss(newContent);
    }

    // Nastavit kurzor za vložený text
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(start + text.length, start + text.length);
    });
  }, [activeTab, templateHtml, templateCss]);

  // ── Akce ──
  const handleHTMLPreview = useCallback(() => {
    openHTMLPreview(templateHtml, templateCss, pdfData, pageOptions);
  }, [templateHtml, templateCss, pdfData, pageOptions]);

  const handlePDFPreview = useCallback(async () => {
    setIsGenerating(true);
    try {
      await openPDFPreview(templateHtml, templateCss, pdfData, pageOptions);
    } catch (e) {
      alert('Chyba při generování PDF: ' + String(e));
    } finally {
      setIsGenerating(false);
    }
  }, [templateHtml, templateCss, pdfData, pageOptions]);

  const handleDownloadPDF = useCallback(async () => {
    setIsGenerating(true);
    try {
      const r = revize || demoRevize;
      const filename = `${r.cisloRevize || 'revize'}_${templateName.replace(/\s+/g, '_')}.pdf`;
      await downloadPDF(templateHtml, templateCss, pdfData, pageOptions, filename);
    } catch (e) {
      alert('Chyba při stahování PDF: ' + String(e));
    } finally {
      setIsGenerating(false);
    }
  }, [templateHtml, templateCss, pdfData, pageOptions, revize, templateName]);

  const handleSaveToDb = useCallback(async () => {
    setIsSaving(true);
    try {
      const templateData = {
        type: 'html-template' as const,
        html: templateHtml,
        css: templateCss,
        pageSize: pageOptions.pageSize,
        orientation: pageOptions.orientation,
        margins: pageOptions.margins,
      };

      if (currentDbId) {
        await pdfSablonyApi.update(currentDbId, {
          nazev: templateName,
          template: templateData,
        });
      } else {
        const result = await pdfSablonyApi.create({
          nazev: templateName,
          template: templateData,
        }) as DbPdfSablona;
        setCurrentDbId(result.id);
      }

      await loadDbTemplates();
      alert('Šablona uložena!');
    } catch (e) {
      alert('Chyba při ukládání: ' + String(e));
    } finally {
      setIsSaving(false);
    }
  }, [templateHtml, templateCss, pageOptions, templateName, currentDbId]);

  const handleLoadTemplate = useCallback((tmpl: HtmlTemplate | DbPdfSablona) => {
    if ('html' in tmpl) {
      // Výchozí šablona
      setTemplateHtml(tmpl.html);
      setTemplateCss(tmpl.css);
      setTemplateName(tmpl.name);
      setPageOptions({
        pageSize: tmpl.pageSize,
        orientation: tmpl.orientation,
        margins: tmpl.margins,
      });
      setCurrentDbId(null);
    } else {
      // DB šablona
      const t = tmpl.template;
      if (t?.type === 'html-template') {
        setTemplateHtml(t.html || '');
        setTemplateCss(t.css || DEFAULT_TEMPLATE_CSS);
        setTemplateName(tmpl.nazev);
        setPageOptions({
          pageSize: t.pageSize || 'a4',
          orientation: t.orientation || 'portrait',
          margins: t.margins || { top: 15, right: 15, bottom: 15, left: 15 },
        });
        setCurrentDbId(tmpl.id);
      } else {
        alert('Tato šablona je ve starém formátu (designer) a nelze ji načíst v novém editoru.');
      }
    }
    setShowTemplateList(false);
  }, []);

  // ── Filtrované proměnné pro picker ──
  const filteredVars = useMemo(() => {
    if (!varFilter) return TEMPLATE_VARIABLES;
    const lower = varFilter.toLowerCase();
    return TEMPLATE_VARIABLES.filter(v =>
      v.label.toLowerCase().includes(lower) || v.key.toLowerCase().includes(lower)
    );
  }, [varFilter]);

  const varCategories = useMemo(() => {
    const cats = new Map<string, typeof filteredVars>();
    for (const v of filteredVars) {
      if (!cats.has(v.category)) cats.set(v.category, []);
      cats.get(v.category)!.push(v);
    }
    return cats;
  }, [filteredVars]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* ── Toolbar ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 flex-wrap">
        {/* Název šablony */}
        <input
          type="text"
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm font-medium w-48"
        />

        <div className="h-5 border-l border-gray-300 mx-1" />

        {/* Šablony */}
        <div className="relative">
          <button
            onClick={() => setShowTemplateList(!showTemplateList)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
          >
            📋 Šablony
          </button>
          {showTemplateList && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-80 max-h-96 overflow-auto">
              <div className="p-2 border-b border-gray-200 font-medium text-sm text-gray-600">
                Výchozí šablony
              </div>
              {DEFAULT_HTML_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleLoadTemplate(t)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100"
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.description}</div>
                </button>
              ))}
              {dbTemplates.length > 0 && (
                <>
                  <div className="p-2 border-b border-gray-200 font-medium text-sm text-gray-600">
                    Uložené šablony
                  </div>
                  {dbTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleLoadTemplate(t)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100"
                    >
                      <div className="font-medium">{t.nazev}</div>
                      <div className="text-xs text-gray-500">
                        {t.template?.type === 'html-template' ? '📝 HTML šablona' : '🔧 Starý formát'}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Uložit */}
        <button
          onClick={handleSaveToDb}
          disabled={isSaving}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded disabled:opacity-50"
        >
          {isSaving ? '⏳' : '💾'} Uložit
        </button>

        <div className="h-5 border-l border-gray-300 mx-1" />

        {/* Vložit proměnnou */}
        <div className="relative">
          <button
            onClick={() => { setShowVarPicker(!showVarPicker); setShowBlockPicker(false); }}
            className="px-3 py-1.5 text-sm bg-amber-50 hover:bg-amber-100 rounded border border-amber-300 text-amber-800"
          >
            {'{ }'} Proměnná
          </button>
          {showVarPicker && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-80 max-h-96 overflow-auto">
              <div className="p-2 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Hledat proměnnou..."
                  value={varFilter}
                  onChange={e => setVarFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  autoFocus
                />
              </div>
              {Array.from(varCategories.entries()).map(([cat, vars]) => (
                <div key={cat}>
                  <div className="px-3 py-1 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    {cat}
                  </div>
                  {vars.map(v => (
                    <button
                      key={v.key}
                      onClick={() => {
                        insertAtCursor(`{{${v.key}}}`);
                        setShowVarPicker(false);
                        setVarFilter('');
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-sm flex justify-between items-center"
                    >
                      <span>{v.label}</span>
                      <code className="text-xs text-gray-400 bg-gray-100 px-1 rounded">
                        {`{{${v.key}}}`}
                      </code>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vložit blok */}
        <div className="relative">
          <button
            onClick={() => { setShowBlockPicker(!showBlockPicker); setShowVarPicker(false); }}
            className="px-3 py-1.5 text-sm bg-green-50 hover:bg-green-100 rounded border border-green-300 text-green-800"
          >
            ＋ Blok
          </button>
          {showBlockPicker && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-72 max-h-96 overflow-auto">
              {INSERTABLE_BLOCKS.map(b => (
                <button
                  key={b.id}
                  onClick={() => {
                    insertAtCursor('\n' + b.html + '\n');
                    setShowBlockPicker(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm border-b border-gray-100"
                >
                  <div className="font-medium">{b.label}</div>
                  <div className="text-xs text-gray-500">{b.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Nastavení stránky */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
          >
            ⚙️ Stránka
          </button>
          {showSettings && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-64 p-3">
              <div className="space-y-2 text-sm">
                <div>
                  <label className="text-gray-600 text-xs">Formát:</label>
                  <select
                    value={pageOptions.pageSize}
                    onChange={e => setPageOptions(p => ({ ...p, pageSize: e.target.value as any }))}
                    className="ml-2 border border-gray-300 rounded px-1 py-0.5 text-sm"
                  >
                    <option value="a4">A4</option>
                    <option value="a5">A5</option>
                    <option value="letter">Letter</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-600 text-xs">Orientace:</label>
                  <select
                    value={pageOptions.orientation}
                    onChange={e => setPageOptions(p => ({ ...p, orientation: e.target.value as any }))}
                    className="ml-2 border border-gray-300 rounded px-1 py-0.5 text-sm"
                  >
                    <option value="portrait">Na výšku</option>
                    <option value="landscape">Na šířku</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-600 text-xs block">Okraje (mm):</label>
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                      <div key={side} className="text-center">
                        <div className="text-[10px] text-gray-400">
                          {side === 'top' ? 'Nahoře' : side === 'right' ? 'Vpravo' : side === 'bottom' ? 'Dole' : 'Vlevo'}
                        </div>
                        <input
                          type="number"
                          value={pageOptions.margins[side]}
                          onChange={e => setPageOptions(p => ({
                            ...p,
                            margins: { ...p.margins, [side]: Number(e.target.value) },
                          }))}
                          className="w-full border border-gray-300 rounded px-1 py-0.5 text-xs text-center"
                          min={0}
                          max={50}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Náhled / Export */}
        <button
          onClick={handleHTMLPreview}
          className="px-3 py-1.5 text-sm bg-purple-100 hover:bg-purple-200 rounded border border-purple-300 text-purple-800"
          title="Otevřít HTML náhled v novém okně"
        >
          🌐 HTML
        </button>
        <button
          onClick={handlePDFPreview}
          disabled={isGenerating}
          className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 rounded border border-red-300 text-red-800 disabled:opacity-50"
          title="Vygenerovat PDF náhled"
        >
          {isGenerating ? '⏳' : '📄'} PDF
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isGenerating}
          className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded disabled:opacity-50"
          title="Stáhnout PDF"
        >
          ⬇️ Stáhnout PDF
        </button>
      </div>

      {/* ── Hlavní obsah: editor + náhled ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor panel */}
        <div className="w-1/2 flex flex-col border-r border-gray-300">
          {/* Záložky HTML/CSS */}
          <div className="flex bg-gray-50 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('html')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'html'
                  ? 'bg-white border-b-2 border-blue-500 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📝 HTML šablona
            </button>
            <button
              onClick={() => setActiveTab('css')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'css'
                  ? 'bg-white border-b-2 border-blue-500 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🎨 CSS styly
            </button>
            <div className="flex-1" />
            <div className="flex items-center px-3 text-xs text-gray-400">
              {activeTab === 'html' ? `${templateHtml.length} znaků` : `${templateCss.length} znaků`}
            </div>
          </div>

          {/* Textarea editor */}
          <textarea
            ref={editorRef}
            value={activeTab === 'html' ? templateHtml : templateCss}
            onChange={e => {
              if (activeTab === 'html') {
                setTemplateHtml(e.target.value);
              } else {
                setTemplateCss(e.target.value);
              }
            }}
            className="flex-1 p-4 font-mono text-sm leading-relaxed bg-gray-900 text-gray-100 resize-none focus:outline-none"
            spellCheck={false}
            wrap="off"
            placeholder={
              activeTab === 'html'
                ? 'Sem napište HTML šablonu...\n\nPoužijte {{revize.nazev}} pro vložení proměnné\n{{#each rozvadece}}...{{/each}} pro cyklus'
                : '/* Vlastní CSS styly */'
            }
          />
        </div>

        {/* Náhled panel */}
        <div className="w-1/2 flex flex-col bg-gray-200">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-sm text-gray-600 flex items-center justify-between">
            <span>👁️ Živý náhled</span>
            <span className="text-xs text-gray-400">
              {pageOptions.pageSize.toUpperCase()} | {pageOptions.orientation === 'portrait' ? 'Na výšku' : 'Na šířku'}
            </span>
          </div>
          <div className="flex-1 overflow-auto p-4 flex justify-center">
            <div
              style={{
                width: pageOptions.orientation === 'landscape' ? '297mm' : '210mm',
                minHeight: pageOptions.orientation === 'landscape' ? '210mm' : '297mm',
                transform: 'scale(0.7)',
                transformOrigin: 'top center',
              }}
            >
              <iframe
                ref={previewRef}
                className="w-full bg-white shadow-lg"
                style={{
                  width: pageOptions.orientation === 'landscape' ? '297mm' : '210mm',
                  minHeight: pageOptions.orientation === 'landscape' ? '210mm' : '297mm',
                  height: '1200px',
                  border: 'none',
                }}
                title="Náhled šablony"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Kliknutí kamkoliv zavře dropdown */}
      {(showVarPicker || showBlockPicker || showTemplateList || showSettings) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowVarPicker(false);
            setShowBlockPicker(false);
            setShowTemplateList(false);
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
}

export default PDFDesignerMain;
