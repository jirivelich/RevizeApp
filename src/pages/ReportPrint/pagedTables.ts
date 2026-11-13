/**
 * Paged.js při rozdělení tabulky mezi stránky zkopíruje jen <table>/<tbody>, ale ne <colgroup>,
 * takže pokračování tabulky na další straně dostane šířky sloupců přepočítané z obsahu.
 * Tahle funkce po stránkování zkopíruje <colgroup> z první části do všech pokračování.
 */
export function restoreSplitTableColumns(root: ParentNode | null | undefined): void {
  if (!root) return;
  const continued = root.querySelectorAll<HTMLTableElement>('table[data-split-from]');
  continued.forEach((tbl) => {
    if (tbl.querySelector(':scope > colgroup')) return;
    const ref = tbl.getAttribute('data-ref');
    if (!ref) return;
    const source = Array.from(root.querySelectorAll<HTMLTableElement>('table[data-ref]'))
      .find((t) => t !== tbl && t.getAttribute('data-ref') === ref && t.querySelector(':scope > colgroup'));
    const cg = source?.querySelector(':scope > colgroup');
    if (cg) tbl.insertBefore(cg.cloneNode(true), tbl.firstChild);
  });
}
