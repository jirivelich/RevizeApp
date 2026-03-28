declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: Record<string, unknown>;
    jsPDF?: Record<string, unknown>;
    pagebreak?: { mode?: string[]; before?: string; after?: string; avoid?: string };
  }

  interface Html2PdfWorker {
    set(options: Html2PdfOptions): Html2PdfWorker;
    from(source: HTMLElement | string, type?: string): Html2PdfWorker;
    save(filename?: string): Promise<void>;
    toPdf(): Html2PdfWorker;
    output(type?: string): Promise<unknown>;
    then(callback: (worker: Html2PdfWorker) => void): Html2PdfWorker;
  }

  function html2pdf(): Html2PdfWorker;
  export default html2pdf;
}
