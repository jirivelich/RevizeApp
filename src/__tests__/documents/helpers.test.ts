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
  it('přeškrtne neplatnou variantu', () => {
    expect(H.vn(true)).toBe('<b>VYHOVĚL</b> – <span class="strike">NEVYHOVĚL</span>');
    expect(H.vn('N')).toBe('<span class="strike">VYHOVĚL</span> – <b>NEVYHOVĚL</b>');
    expect(H.vn('schopno', ['SCHOPNA', 'NESCHOPNA'])).toContain('<span class="strike">NESCHOPNA</span>');
    expect(H.vn('fail', ['JE', 'NENÍ'])).toContain('<span class="strike">JE</span>');
  });
  it('nerozhodnutý stav nechá obě varianty k ručnímu škrtnutí', () => {
    expect(H.vn(undefined)).toBe('VYHOVĚL – NEVYHOVĚL');
    expect(H.vn('NA')).toBe('VYHOVĚL – NEVYHOVĚL');
    expect(H.an(null)).toBe('ANO – NE');
  });
  it('ANO – NE', () => {
    expect(H.an(true)).toBe('<b>ANO</b> – <span class="strike">NE</span>');
    expect(H.an(false)).toBe('<span class="strike">ANO</span> – <b>NE</b>');
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
