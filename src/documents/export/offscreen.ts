/** Skrytý kontejner mimo obrazovku pro měření a snímání stránek (bez zoomu). */
export function createOffscreenRoot(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'doc-root doc-offscreen';
  root.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;zoom:1;pointer-events:none;';
  root.setAttribute('aria-hidden', 'true');
  document.body.appendChild(root);
  return root;
}
