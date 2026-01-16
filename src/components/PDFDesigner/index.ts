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
} from './types';

// Constants
export {
  VARIABLES,
  TABLE_COLUMNS,
  TABLE_TYPES,
  WIDGET_TYPES,
  PAGE_SIZES,
  DEFAULT_WIDGET_STYLE,
} from './constants';
// Default templates
export {
  createRevizniZpravaTemplate,
  createEmptyTemplate,
  DEFAULT_TEMPLATES,
} from './defaultTemplates';