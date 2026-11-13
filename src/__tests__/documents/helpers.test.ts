import { describe, it, expect } from 'vitest';
import { H } from '../../documents/helpers';

describe('H.esc', () => {
  it('escapuje HTML znaky', () => {
    expect(H.esc('<b>"A" & \'B\'</b>')).toBe('&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;');
  });
  it('null a undefined → prázdný řetězec', () => {
    expect(H.esc(null)).toBe('');
    expect(H.esc(undefined)).toBe('');
  });
  it('čísla převede na text', () => {
    expect(H.esc(0)).toBe('0');
  });
});

describe('H.d', () => {
  it('formátuje datum „01. 01. 2024“', () => {
    expect(H.d('2024-01-01')).toBe('01. 01. 2024');
    expect(H.d(new Date(2026, 6, 21))).toBe('21. 07. 2026');
  });
  it('prázdné nebo neplatné → prázdný řetězec', () => {
    expect(H.d('')).toBe('');
    expect(H.d(undefined)).toBe('');
    expect(H.d('není datum')).toBe('');
  });
});

describe('H.v', () => {
  it('vrátí escapovanou hodnotu', () => {
    expect(H.v('A < B')).toBe('A &lt; B');
    expect(H.v(0)).toBe('0');
  });
  it('prázdnou hodnotu nahradí tečkovanou linkou', () => {
    for (const x of ['', '   ', null, undefined]) {
      expect(H.v(x, 5)).toBe('<span class="dotline">.....</span>');
    }
  });
});

describe('H.vn a H.an', () => {
  it('vrátí jen platnou variantu, bez přeškrtnutí', () => {
    expect(H.vn(true)).toBe('<b>VYHOVĚL</b>');
    expect(H.vn('N')).toBe('<b>NEVYHOVĚL</b>');
    expect(H.vn('schopno', ['SCHOPNA', 'NESCHOPNA'])).toBe('<b>SCHOPNA</b>');
    expect(H.vn('neschopno', ['SCHOPNA', 'NESCHOPNA'])).toBe('<b>NESCHOPNA</b>');
    expect(H.vn('fail', ['JE', 'NENÍ'])).toBe('<b>NENÍ</b>');
  });
  it('nerozhodnutý stav → tečky k ručnímu doplnění', () => {
    expect(H.vn(undefined)).toBe(H.dots(12));
    expect(H.vn('NA')).toBe(H.dots(12));
    expect(H.an(null)).toBe(H.dots(12));
  });
  it('ANO nebo NE', () => {
    expect(H.an(true)).toBe('<b>ANO</b>');
    expect(H.an(false)).toBe('<b>NE</b>');
  });
});

describe('H.lines a H.paras', () => {
  it('lines převede řádky na <br> a escapuje', () => {
    expect(H.lines('a<1\nb')).toBe('a&lt;1<br>b');
  });
  it('paras vytvoří odstavec pro každý neprázdný řádek', () => {
    expect(H.paras('první\n\ndruhý')).toBe('<p class="para">první</p><p class="para">druhý</p>');
  });
  it('prázdný text → řádky teček', () => {
    const out = H.paras('', 2);
    expect(out.match(/class="para"/g)).toHaveLength(2);
    expect(out).toContain('dotline');
  });
});

describe('H.paginate a H.fileName', () => {
  it('rozdělí pole na skupiny', () => {
    expect(H.paginate([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(H.paginate([], 3)).toEqual([]);
  });
  it('název souboru bez diakritiky', () => {
    expect(H.fileName('019/26 Město Žatec – instalace')).toBe('019_26_Mesto_Zatec_instalace');
    expect(H.fileName('')).toBe('dokument');
  });
});
