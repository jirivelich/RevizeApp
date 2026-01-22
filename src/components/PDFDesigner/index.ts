// PDFDesigner - barrel export
export { default as PDFDesigner } from './PDFDesignerMain';
export { Toolbar } from './Toolbar';
export { PageCanvas } from './PageCanvas';
export { PropertiesPanel } from './PropertiesPanel';
export { WidgetEditor } from './WidgetEditor';
export { DraggableWidget } from './DraggableWidget';
export { renderWidgetContent } from './WidgetRenderer';
export { useDesignerState } from './useDesignerState';

// Types
export type {
  Widget,
  WidgetType,
  WidgetStyle,
  PageZone,
  PageTemplate,
  DesignerTemplate,
  TableConfig,
  TableColumn,
  TableType,
  PageSize,
  Variable,
  RepeaterType,
  RepeaterConfig,
  RepeaterItemTemplate,
} from './types';

// Constants
export {
  VARIABLES,
  TABLE_COLUMNS,
  TABLE_TYPES,
  WIDGET_TYPES,
  PAGE_SIZES,
  DEFAULT_WIDGET_STYLE,
  REPEATER_TYPES,
  ROZVADEC_REPEATER_TEMPLATE,
} from './constants';
// Default templates
export {
  createRevizniZpravaTemplate,
  createEmptyTemplate,
  DEFAULT_TEMPLATES,
} from './defaultTemplates';

// Pagination utilities
export {
  processPagination,
  calculateTableRowsPerPage,
  splitTableWidget,
  needsPagination,
} from './paginationUtils';

// PDF Renderer
export {
  renderTemplateToPDF,
  openPDFPreview,
  downloadPDF,
} from './pdfRenderer';

// HTML Renderer
export {
  renderTemplateToHTML,
  openHTMLPreview,
} from './htmlRenderer';

export type { PDFRenderData } from './pdfRenderer';