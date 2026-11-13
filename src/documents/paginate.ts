/**
 * Stránkování dokumentu na listy A4.
 *
 * Šablona vrací stránky <div class="page">. Stránka s atributem data-flow obsahuje
 * bloky obsahu, které se postupně skládají na listy pevné výšky 297 mm:
 *  - blok, který se nevejde, přejde na další list;
 *  - tabulky se dělí po řádcích (záhlaví <thead> se opakuje);
 *  - prvky s třídou .split se dělí po svých potomcích (sekce, seznamy);
 *    potomek s třídou .keep (nadpis) nesmí zůstat sám na konci listu;
 *  - prvek s třídou .nosplit se nikdy nedělí (podpisy, výsledek);
 *  - prázdný <div class="pb"></div> vynutí nový list.
 * Volitelná hlavička .page-head (první potomek) se opakuje na každém listu.
 * Patička „Strana X (celkem Y)“ se doplní na konci (data-foot = text vlevo).
 *
 * Výstup je finální HTML (stejné pro náhled, PDF i Word).
 */

export interface PaginateResult {
  html: string;
  pages: number;
  /** Indexy listů (od 0), jejichž obsah přetekl (nedělitelný blok vyšší než list). */
  overflow: number[];
}

interface FitResult {
  /** Zbytek, který se nevešel (null = vše umístěno). */
  rem: HTMLElement | null;
  /** Bylo umístěno něco podstatného (ne jen nadpis)? */
  placedAny: boolean;
}

interface Splitter {
  shell: HTMLElement;
  target: HTMLElement;
  kids: HTMLElement[];
  makeRemainder: (rest: HTMLElement[], placedCount: number) => HTMLElement;
}

function isKeep(el: Element): boolean {
  return el.classList.contains('keep');
}

function getSplitter(node: HTMLElement): Splitter | null {
  if (node.classList.contains('nosplit')) return null;
  if (node.tagName === 'TABLE') {
    const rows = [...node.querySelectorAll(':scope > tbody > tr')] as HTMLElement[];
    if (rows.length === 0) return null;
    const thead = node.querySelector(':scope > thead');
    const makeTable = () => {
      const t = node.cloneNode(false) as HTMLElement;
      if (thead) t.appendChild(thead.cloneNode(true));
      const tb = document.createElement('tbody');
      t.appendChild(tb);
      return { t, tb };
    };
    const { t: shell, tb: target } = makeTable();
    return {
      shell,
      target,
      kids: rows,
      makeRemainder: rest => {
        const { t, tb } = makeTable();
        rest.forEach(r => tb.appendChild(r));
        return t;
      },
    };
  }

  const splittable = node.classList.contains('split') || node.tagName === 'UL' || node.tagName === 'OL';
  if (!splittable) return null;
  const kids = [...node.children] as HTMLElement[];
  if (kids.length === 0) return null;
  const shell = node.cloneNode(false) as HTMLElement;
  return {
    shell,
    target: shell,
    kids,
    makeRemainder: (rest, placedCount) => {
      const r = node.cloneNode(false) as HTMLElement;
      if (node.tagName === 'OL' && placedCount > 0) {
        const start = parseInt(node.getAttribute('start') || '1', 10);
        r.setAttribute('start', String(start + placedCount));
      }
      rest.forEach(k => r.appendChild(k));
      return r;
    },
  };
}

/** Vloží do target co nejvíc z node; vrátí zbytek, který se nevešel. */
function fitInto(target: HTMLElement, node: HTMLElement, fits: () => boolean): FitResult {
  target.appendChild(node);
  if (fits()) return { rem: null, placedAny: true };
  target.removeChild(node);

  const sp = getSplitter(node);
  if (!sp) return { rem: node, placedAny: false };

  target.appendChild(sp.shell);
  const moved: HTMLElement[] = [];
  let substantive = 0;
  // Tabulku nelámat tak, aby na listu zůstal jen jeden řádek
  const minKeep = node.tagName === 'TABLE' && sp.kids.length > 2 ? 2 : 1;

  for (let i = 0; i < sp.kids.length; i++) {
    const kid = sp.kids[i];
    const r = fitInto(sp.target, kid, fits);
    if (!r.rem) {
      moved.push(kid);
      if (!isKeep(kid)) substantive++;
      continue;
    }
    const rest = sp.kids.slice(i + 1);
    if (r.placedAny) {
      // Část potomka se vešla – zbytek pokračuje na dalším listu
      return { rem: sp.makeRemainder([r.rem, ...rest], substantive), placedAny: true };
    }
    if (substantive < minKeep) {
      // Vešel se jen nadpis (nebo nic) – celý blok přesunout na další list
      target.removeChild(sp.shell);
      return { rem: sp.makeRemainder([...moved, r.rem, ...rest], 0), placedAny: false };
    }
    // Nadpisy (.keep) na konci listu přesunout s obsahem, ke kterému patří
    const trailing: HTMLElement[] = [];
    while (moved.length && isKeep(moved[moved.length - 1])) trailing.unshift(moved.pop()!);
    return { rem: sp.makeRemainder([...trailing, r.rem, ...rest], substantive), placedAny: true };
  }
  return { rem: null, placedAny: true };
}

interface Sheet {
  page: HTMLElement;
  body: HTMLElement;
  fits: () => boolean;
}

function createSheet(container: HTMLElement, proto: HTMLElement, head: HTMLElement | null): Sheet {
  const page = proto.cloneNode(false) as HTMLElement;
  page.removeAttribute('data-flow');
  if (head) page.appendChild(head.cloneNode(true));
  const body = document.createElement('div');
  body.className = 'page-body';
  page.appendChild(body);
  container.appendChild(page);

  const cs = getComputedStyle(page);
  const avail = page.clientHeight - parseFloat(cs.paddingBottom || '0') - body.offsetTop;
  return { page, body, fits: () => body.offsetHeight <= avail + 0.5 };
}

/** Počká na načtení písem a obrázků (mají vliv na výšku obsahu). */
export async function waitForAssets(root: HTMLElement): Promise<void> {
  try { await document.fonts?.ready; } catch { /* ignore */ }
  const imgs = [...root.querySelectorAll('img')];
  await Promise.all(imgs.map(img => (img.complete ? Promise.resolve() : new Promise<void>(res => {
    img.addEventListener('load', () => res(), { once: true });
    img.addEventListener('error', () => res(), { once: true });
  }))));
}

/** Přidá na listy patičku „Strana X (celkem Y)“. */
function addFooters(container: HTMLElement): void {
  const pages = [...container.querySelectorAll(':scope > .page')] as HTMLElement[];
  pages.forEach((p, i) => {
    p.querySelector(':scope > .page-foot')?.remove();
    if (p.hasAttribute('data-nofoot')) return;
    const foot = document.createElement('table');
    foot.className = 'page-foot';
    const left = document.createElement('td');
    left.textContent = p.getAttribute('data-foot') || '';
    const right = document.createElement('td');
    right.className = 'r';
    right.textContent = `Strana ${i + 1} (celkem ${pages.length})`;
    const tr = document.createElement('tr');
    tr.append(left, right);
    const tb = document.createElement('tbody');
    tb.appendChild(tr);
    foot.appendChild(tb);
    p.appendChild(foot);
  });
}

/**
 * Rozstránkuje HTML ze šablony. `container` musí být v dokumentu (kvůli měření),
 * mít třídu .doc-root a nesmí mít zoom. Po skončení obsahuje finální stránky.
 */
export async function paginate(container: HTMLElement, rawHtml: string): Promise<PaginateResult> {
  const source = document.createElement('div');
  source.innerHTML = rawHtml;

  // Obrázky načíst předem ve skrytém zdroji, aby měření sedělo
  container.innerHTML = '';
  container.appendChild(source);
  await waitForAssets(source);
  container.removeChild(source);

  const overflow: number[] = [];
  const rawPages = [...source.querySelectorAll(':scope > .page')] as HTMLElement[];

  for (const raw of rawPages) {
    if (!raw.hasAttribute('data-flow')) {
      container.appendChild(raw);
      if (raw.scrollHeight > raw.clientHeight + 1) overflow.push(container.children.length - 1);
      continue;
    }
    const first = raw.firstElementChild as HTMLElement | null;
    const head = first && first.classList.contains('page-head') ? first : null;
    if (head) raw.removeChild(head);
    const blocks = [...raw.children] as HTMLElement[];

    let sheet = createSheet(container, raw, head);
    for (const block of blocks) {
      if (block.classList.contains('pb')) {
        if (sheet.body.childElementCount > 0) sheet = createSheet(container, raw, head);
        continue;
      }
      let cur: HTMLElement | null = block;
      while (cur) {
        const r = fitInto(sheet.body, cur, sheet.fits);
        if (!r.rem) break;
        if (!r.placedAny && sheet.body.childElementCount === 0) {
          // Nedělitelný blok vyšší než celý list – vložit a nahlásit přetečení
          sheet.body.appendChild(r.rem);
          overflow.push(container.children.length - 1);
          break;
        }
        sheet = createSheet(container, raw, head);
        cur = r.rem;
      }
    }
    // Prázdný poslední list (např. po .pb na konci) odstranit
    if (sheet.body.childElementCount === 0 && container.children.length > 1) sheet.page.remove();
  }

  addFooters(container);
  return { html: container.innerHTML, pages: container.children.length, overflow };
}
