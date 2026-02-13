// PDFDesigner - barrel export (šablonový přístup)
export { default as PDFDesigner } from './PDFDesignerMain';

// Template Engine
export {
  processTemplate,
  createTemplateContext,
  renderFullDocument,
  TEMPLATE_VARIABLES,
  INSERTABLE_BLOCKS,
} from './templateEngine';

export type { PageOptions, VariableInfo, InsertableBlock } from './templateEngine';

// PDF Renderer
export {
  openPDFPreview,
  downloadPDF,
  openHTMLPreview,
  generatePDFFromTemplate,
} from './pdfRenderer';

export type { PDFRenderData, PageOptions as PdfPageOptions } from './pdfRenderer';

// Default Templates
export {
  DEFAULT_HTML_TEMPLATES,
  DEFAULT_TEMPLATE_CSS,
  REVIZNI_ZPRAVA_HTML,
  JEDNODUCHA_ZPRAVA_HTML,
} from './defaultHtmlTemplates';

export type { HtmlTemplate } from './defaultHtmlTemplates';
