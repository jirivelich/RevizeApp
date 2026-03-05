declare module 'pagedjs' {
  export class Previewer {
    constructor(options?: Record<string, unknown>);
    size: {
      width: { value: number; unit: string };
      height: { value: number; unit: string };
      format: string | undefined;
      orientation: string | undefined;
    };
    preview(
      content: HTMLElement | string,
      stylesheets: string[],
      renderTo: HTMLElement,
    ): Promise<{
      total: number;
      performance: number;
      size: typeof Previewer.prototype.size;
      pages: unknown[];
    }>;
    on(event: string, callback: (...args: unknown[]) => void): void;
    destroy(): void;
  }

  export class Chunker {
    constructor(content?: unknown, renderTo?: unknown, settings?: Record<string, unknown>);
  }

  export class Polisher {
    constructor(setup?: boolean);
  }

  export class Handler {}
}
