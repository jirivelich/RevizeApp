// Widget Renderer - vykreslování obsahu widgetů
// Podle skutečné struktury typů z types/index.ts
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import type { Widget } from './types';
import type { Revize, Nastaveni } from '../../types';
import type { PDFRenderData } from './pdfVariables';
import { getTableData } from './pdfVariables';
import { VARIABLES } from './constants';

interface WidgetRendererProps {
  widget: Widget;
  revize: Revize | null;
  nastaveni: Nastaveni | null;
  forExport?: boolean;
  currentPage?: number;
  totalPages?: number;
  pdfData?: PDFRenderData;
}

export function renderWidgetContent({
  widget,
  revize,
  nastaveni,
  forExport: _forExport = false,
  currentPage = 1,
  totalPages = 1,
  pdfData,
}: WidgetRendererProps): React.ReactNode {
  // Získání hodnoty proměnné podle skutečné struktury Revize
  const getVariableValue = (key: string): string => {
    if (!key) return '';
    
    const parts = key.split('.');
    const category = parts[0];
    const field = parts[1];
    
    // Revize data - podle types/index.ts Revize interface
    if (category === 'revize' && revize) {
      const revizeMap: Record<string, unknown> = {
        cisloRevize: revize.cisloRevize,
        nazev: revize.nazev,
        adresa: revize.adresa,
        objednatel: revize.objednatel,
        kategorieRevize: revize.kategorieRevize,
        typRevize: revize.typRevize,
        duvodMimoradne: revize.duvodMimoradne,
        stav: revize.stav,
        poznamka: revize.poznamka,
        // Data
        datum: revize.datum ? new Date(revize.datum).toLocaleDateString('cs-CZ') : '',
        datumDokonceni: revize.datumDokonceni ? new Date(revize.datumDokonceni).toLocaleDateString('cs-CZ') : '',
        datumPlatnosti: revize.datumPlatnosti ? new Date(revize.datumPlatnosti).toLocaleDateString('cs-CZ') : '',
        datumVypracovani: revize.datumVypracovani ? new Date(revize.datumVypracovani).toLocaleDateString('cs-CZ') : '',
        termin: revize.termin,
        // Výsledek
        vysledek: revize.vysledek,
        vysledekOduvodneni: revize.vysledekOduvodneni,
        zaver: revize.zaver,
        // Technické údaje
        rozsahRevize: revize.rozsahRevize,
        predmetNeni: revize.predmetNeni,
        napetovaSoustava: revize.napetovaSoustava,
        ochranaOpatreni: revize.ochranaOpatreni,
        podklady: revize.podklady,
        vyhodnoceniPredchozich: revize.vyhodnoceniPredchozich,
        pouzitePristroje: revize.pouzitePristroje,
        provedeneUkony: revize.provedeneUkony,
        // Firma v revizi
        firmaJmeno: revize.firmaJmeno,
        firmaAdresa: revize.firmaAdresa,
        firmaIco: revize.firmaIco,
        firmaDic: revize.firmaDic,
      };
      return String(revizeMap[field] ?? `{{${key}}}`);
    }
    
    // Technik data (z Nastavení)
    if (category === 'technik' && nastaveni) {
      const technikMap: Record<string, string> = {
        jmeno: nastaveni.reviznniTechnikJmeno || '',
        cisloOpravneni: nastaveni.reviznniTechnikCisloOpravneni || '',
        telefon: nastaveni.kontaktTelefon || '',
        email: nastaveni.kontaktEmail || '',
      };
      return technikMap[field] || `{{${key}}}`;
    }
    
    // Firma data (z Nastavení)
    if (category === 'firma' && nastaveni) {
      const firmaMap: Record<string, string> = {
        nazev: nastaveni.firmaJmeno || '',
        adresa: nastaveni.firmaAdresa || '',
        ico: nastaveni.firmaIco || '',
        dic: nastaveni.firmaDic || '',
        logo: nastaveni.logo || '',
      };
      return firmaMap[field] || `{{${key}}}`;
    }
    
    // Stránkování
    if (category === 'page') {
      if (field === 'current') return String(currentPage);
      if (field === 'total') return String(totalPages);
      if (field === 'info') return `Strana ${currentPage} z ${totalPages}`;
    }
    
    // Datum a čas
    if (category === 'datum') {
      const now = new Date();
      if (field === 'dnes') return now.toLocaleDateString('cs-CZ');
      if (field === 'cas') return now.toLocaleTimeString('cs-CZ');
      if (field === 'rok') return String(now.getFullYear());
    }
    
    return `{{${key}}}`;
  };

  // Nahrazení proměnných v textu
  const replaceVariables = (text: string): string => {
    if (!text) return '';
    // Nahradí {{klíč}} hodnotou
    const result = text.replace(/\{\{([^}]+)\}\}/g, (_, key) => getVariableValue(key.trim()));
    // Pokud je to jen klíč proměnné, vrátí přímo hodnotu
    if (VARIABLES.some(v => v.key === text)) return getVariableValue(text);
    return result;
  };

  // Základní styl
  const baseStyle: React.CSSProperties = {
    fontSize: widget.style.fontSize,
    fontWeight: widget.style.fontWeight,
    fontStyle: widget.style.fontStyle,
    textDecoration: widget.style.textDecoration,
    textAlign: widget.style.textAlign as React.CSSProperties['textAlign'],
    color: widget.style.color,
    backgroundColor: widget.style.backgroundColor === 'transparent' ? undefined : widget.style.backgroundColor,
    padding: widget.style.padding,
    borderRadius: widget.style.borderRadius,
    opacity: widget.style.opacity,
    lineHeight: widget.style.lineHeight,
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    alignItems: widget.style.verticalAlign === 'top' ? 'flex-start' 
              : widget.style.verticalAlign === 'bottom' ? 'flex-end' 
              : 'center',
  };

  // Border styl
  if (widget.style.borderWidth && widget.style.borderWidth > 0) {
    baseStyle.border = `${widget.style.borderWidth}px ${widget.style.borderStyle || 'solid'} ${widget.style.borderColor || '#000'}`;
  }

  // Render podle typu widgetu
  switch (widget.type) {
    case 'text':
      return (
        <div style={baseStyle}>
          <div style={{ width: '100%' }}>{replaceVariables(widget.content)}</div>
        </div>
      );

    case 'variable':
      return (
        <div style={baseStyle}>
          <div style={{ width: '100%' }}>{getVariableValue(widget.content)}</div>
        </div>
      );

    case 'page-number': {
      const format = widget.content || 'X/Y';
      const pageText = format
        .replace('X', String(currentPage))
        .replace('Y', String(totalPages));
      return (
        <div style={baseStyle}>
          <div style={{ width: '100%' }}>{pageText}</div>
        </div>
      );
    }

    case 'date': {
      const format = widget.content || 'DD.MM.YYYY';
      const now = new Date();
      let dateText = format;
      const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 
                      'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
      // Důležité: Nahrazujeme od nejdelších patternů po nejkratší,
      // abychom zabránili částečným nahrazením (např. DD -> 16, pak D -> 16 = 166)
      dateText = dateText
        .replace('YYYY', String(now.getFullYear()))
        .replace('MMMM', months[now.getMonth()])
        .replace('DD', String(now.getDate()).padStart(2, '0'))
        .replace('MM', String(now.getMonth() + 1).padStart(2, '0'))
        // Pro jednoznakové patterny používáme regex s word boundary
        .replace(/\bD\b/g, String(now.getDate()))
        .replace(/\bM\b/g, String(now.getMonth() + 1));
      return (
        <div style={baseStyle}>
          <div style={{ width: '100%' }}>{dateText}</div>
        </div>
      );
    }

    case 'line':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '100%',
            borderTop: `${widget.style.borderWidth || 1}px ${widget.style.borderStyle || 'solid'} ${widget.style.borderColor || '#000'}`,
          }} />
        </div>
      );

    case 'box':
      return (
        <div style={{
          ...baseStyle,
          border: `${widget.style.borderWidth || 1}px ${widget.style.borderStyle || 'solid'} ${widget.style.borderColor || '#000'}`,
        }} />
      );

    case 'image': {
      const src = replaceVariables(widget.content);
      return (
        <div style={{ 
          ...baseStyle, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: src ? 'transparent' : '#f3f4f6',
        }}>
          {src ? (
            <img src={src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ color: '#9ca3af' }}>📷 Obrázek</span>
          )}
        </div>
      );
    }

    case 'table': {
      if (!widget.tableConfig) return null;
      const { columns, showHeader, borderStyle, alternateRowColor } = widget.tableConfig;
      const visibleColumns = columns.filter(c => c.visible);
      
      // Tabulka zobrazí placeholder v designeru
      // Skutečná data budou načtena při exportu PDF
      const getCellStyle = (border: typeof borderStyle): React.CSSProperties => {
        const base: React.CSSProperties = { padding: '4px 6px' };
        switch (border) {
          case 'all':
            return { ...base, border: '1px solid #d1d5db' };
          case 'horizontal':
            return { ...base, borderBottom: '1px solid #d1d5db' };
          case 'vertical':
            return { ...base, borderLeft: '1px solid #d1d5db', borderRight: '1px solid #d1d5db' };
          case 'outer':
            return base;
          default:
            return base;
        }
      };

      // Získat skutečná data z pdfData pokud jsou dostupná
      const tableData = pdfData ? getTableData(widget.tableConfig.type, pdfData) : [];
      const hasRealData = tableData.length > 0;

      return (
        <div style={{ ...baseStyle, fontSize: 10, padding: 0, display: 'block', overflow: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            border: borderStyle === 'outer' || borderStyle === 'all' ? '1px solid #d1d5db' : undefined,
          }}>
            {showHeader && (
              <thead>
                <tr style={{ backgroundColor: '#3b82f6' }}>
                  {visibleColumns.map(col => (
                    <th 
                      key={col.id} 
                      style={{ 
                        ...getCellStyle(borderStyle),
                        width: `${col.width}%`,
                        textAlign: col.align,
                        fontWeight: 'bold',
                        color: '#fff',
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {/* Skutečná data nebo placeholder */}
              {hasRealData ? (
                tableData.slice(0, 5).map((row, rowIdx) => (
                  <tr key={rowIdx} style={{ backgroundColor: rowIdx % 2 === 1 ? (alternateRowColor || '#f9fafb') : undefined }}>
                    {visibleColumns.map(col => (
                      <td key={col.id} style={{ ...getCellStyle(borderStyle), textAlign: col.align }}>
                        {String(row[col.key as keyof typeof row] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <>
                  <tr>
                    {visibleColumns.map(col => (
                      <td key={col.id} style={{ ...getCellStyle(borderStyle), color: '#9ca3af', textAlign: col.align }}>
                        ...
                      </td>
                    ))}
                  </tr>
                  <tr style={{ backgroundColor: alternateRowColor || '#f9fafb' }}>
                    {visibleColumns.map(col => (
                      <td key={col.id} style={{ ...getCellStyle(borderStyle), color: '#9ca3af', textAlign: col.align }}>
                        ...
                      </td>
                    ))}
                  </tr>
                </>
              )}
            </tbody>
          </table>
          {!hasRealData && (
            <div style={{ textAlign: 'center', padding: '4px', color: '#9ca3af', fontSize: 9 }}>
              Tabulka: {widget.tableConfig.type} (načti revizi pro náhled)
            </div>
          )}
          {hasRealData && tableData.length > 5 && (
            <div style={{ textAlign: 'center', padding: '4px', color: '#6b7280', fontSize: 9 }}>
              ... a dalších {tableData.length - 5} řádků
            </div>
          )}
        </div>
      );
    }

    case 'qr-code': {
      const qrContent = replaceVariables(widget.content) || `Revize: ${revize?.cisloRevize || 'Demo'}`;
      return <QRCodePreview content={qrContent} style={baseStyle} />;
    }

    case 'signature':
      return (
        <div style={{ ...baseStyle, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ borderTop: '1px solid #000', width: '80%', textAlign: 'center', paddingTop: 4, fontSize: 10 }}>
            {widget.content || 'Podpis'}
          </div>
        </div>
      );

    case 'repeater': {
      // Náhled repeateru s rozvaděči - plný layout s tabulkou okruhů
      const repeaterType = widget.repeaterConfig?.type || 'rozvadece';
      const rozvadece = pdfData?.rozvadece || [];
      const hasData = rozvadece.length > 0;
      
      return (
        <div style={{ 
          ...baseStyle, 
          display: 'block', 
          overflow: 'auto', 
          padding: 0,
          backgroundColor: '#fff',
          border: '1px solid #e2e8f0',
        }}>
          {/* Header */}
          <div style={{ 
            fontSize: 10, 
            fontWeight: 'bold', 
            color: '#475569',
            padding: '4px 8px',
            backgroundColor: '#f1f5f9',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            🔄 {repeaterType === 'rozvadece' ? 'Rozvaděče s okruhy' : 'Místnosti se zařízeními'}
            {hasData && <span style={{ color: '#3b82f6', fontWeight: 'normal' }}>({rozvadece.length})</span>}
          </div>
          
          {hasData ? (
            <div style={{ padding: 6 }}>
              {rozvadece.map((rozv, idx) => {
                const okruhy = pdfData?.okruhy?.[rozv.id!] || [];
                return (
                  <div key={idx} style={{ 
                    marginBottom: idx < rozvadece.length - 1 ? 12 : 0, 
                  }}>
                    {/* Header rozvaděče */}
                    <div style={{ 
                      backgroundColor: '#1e40af', 
                      color: '#fff', 
                      padding: '6px 10px',
                      fontSize: 11,
                      fontWeight: 'bold',
                      borderRadius: '4px 4px 0 0',
                    }}>
                      {rozv.oznaceni || `R${idx + 1}`} - {rozv.nazev || 'Rozvaděč'}
                    </div>
                    
                    {/* Info box */}
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 1,
                      backgroundColor: '#e2e8f0',
                      fontSize: 9,
                    }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '3px 6px' }}>
                        <span style={{ color: '#64748b' }}>Umístění:</span> {rozv.umisteni || '-'}
                      </div>
                      <div style={{ backgroundColor: '#f8fafc', padding: '3px 6px' }}>
                        <span style={{ color: '#64748b' }}>Typ:</span> {rozv.typRozvadece || '-'}
                      </div>
                      <div style={{ backgroundColor: '#f8fafc', padding: '3px 6px' }}>
                        <span style={{ color: '#64748b' }}>Krytí:</span> {rozv.stupenKryti || '-'}
                      </div>
                    </div>
                    
                    {/* Tabulka okruhů - stejné sloupce jako v PDF */}
                    {okruhy.length > 0 ? (
                      <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse', 
                        fontSize: 7,
                        border: '1px solid #e2e8f0',
                      }}>
                        <thead>
                          <tr style={{ backgroundColor: '#3b82f6', color: '#fff' }}>
                            <th style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center', width: '6%' }}>Č.</th>
                            <th style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'left', width: '20%' }}>Název okruhu</th>
                            <th style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center', width: '8%' }}>Jistič</th>
                            <th style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center', width: '8%' }}>Proud</th>
                            <th style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center', width: '6%' }}>Fáze</th>
                            <th style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center', width: '10%' }}>Vodič</th>
                            <th style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center', width: '10%' }}>R izol [MΩ]</th>
                            <th style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center', width: '10%' }}>Zs [Ω]</th>
                            <th style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center', width: '10%' }}>I∆n [mA]</th>
                            <th style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center', width: '8%' }}>t [ms]</th>
                          </tr>
                        </thead>
                        <tbody>
                          {okruhy.slice(0, 8).map((okruh, oidx) => (
                            <tr key={oidx} style={{ backgroundColor: oidx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                              <td style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center' }}>{okruh.cislo}</td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '2px 3px' }}>{okruh.nazev || '-'}</td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center' }}>{okruh.jisticTyp || '-'}</td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center' }}>{okruh.jisticProud || '-'}</td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center' }}>{okruh.pocetFazi || '-'}</td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center' }}>{okruh.vodic || '-'}</td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center' }}>
                                {okruh.izolacniOdpor ? okruh.izolacniOdpor.toFixed(2) : '-'}
                              </td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center' }}>
                                {okruh.impedanceSmycky ? okruh.impedanceSmycky.toFixed(2) : '-'}
                              </td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center' }}>{okruh.proudovyChranicMa || '-'}</td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '2px 3px', textAlign: 'center' }}>{okruh.casOdpojeni || '-'}</td>
                            </tr>
                          ))}
                          {okruhy.length > 8 && (
                            <tr>
                              <td colSpan={10} style={{ 
                                border: '1px solid #e2e8f0', 
                                padding: '2px 4px', 
                                textAlign: 'center',
                                color: '#64748b',
                                fontStyle: 'italic',
                              }}>
                                ... a dalších {okruhy.length - 8} okruhů
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ 
                        padding: '8px', 
                        fontSize: 9, 
                        color: '#94a3b8',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderTop: 'none',
                        textAlign: 'center',
                      }}>
                        Žádné okruhy
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ 
              fontSize: 10, 
              color: '#94a3b8', 
              textAlign: 'center',
              padding: 16,
            }}>
              📋 V PDF se pro každý rozvaděč zobrazí:
              <br />• Nadpis s názvem rozvaděče
              <br />• Info box (umístění, typ, krytí)
              <br />• Tabulka okruhů s měřenými hodnotami
              <br />
              <br />⚠️ Načti revizi pro náhled dat
            </div>
          )}
        </div>
      );
    }

    case 'page-break': {
      // Zalomení stránky - vizuální indikátor v designeru
      return (
        <div style={{
          ...baseStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fef3c7',
          border: '2px dashed #f59e0b',
          borderRadius: 4,
          padding: 0,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#b45309',
            fontSize: 12,
            fontWeight: 500,
          }}>
            <span style={{ fontSize: 16 }}>✂️</span>
            Zalomení stránky
            <span style={{ fontSize: 16 }}>✂️</span>
          </div>
        </div>
      );
    }

    case 'group': {
      // Kontejnerový widget - renderuje children s relativními pozicemi
      const children = widget.children || [];
      return (
        <div style={{
          ...baseStyle,
          position: 'relative',
          backgroundColor: 'transparent',
          border: '2px dashed #8b5cf6',
          borderRadius: 4,
          overflow: 'visible',
        }}>
          {/* Štítek skupiny */}
          <div style={{
            position: 'absolute',
            top: -18,
            left: 4,
            backgroundColor: '#8b5cf6',
            color: 'white',
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 3,
            fontWeight: 500,
            zIndex: 10,
          }}>
            📦 Skupina ({children.length})
          </div>
          
          {/* Renderovat children na relativních pozicích */}
          {children.map((child) => (
            <div
              key={child.id}
              style={{
                position: 'absolute',
                left: child.x,
                top: child.y,
                width: child.width,
                height: child.height,
                pointerEvents: 'none', // Děti nelze přímo vybrat - vybírá se skupina
              }}
            >
              {renderWidgetContent({
                widget: child,
                revize,
                nastaveni,
                currentPage,
                totalPages,
                pdfData,
              })}
            </div>
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}

// Komponenta pro náhled QR kódu
function QRCodePreview({ content, style }: { content: string; style: React.CSSProperties }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  
  useEffect(() => {
    let isMounted = true;
    
    QRCode.toDataURL(content, {
      width: 150,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then(url => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch(() => {
        if (isMounted) setQrDataUrl('');
      });
    
    return () => {
      isMounted = false;
    };
  }, [content]);
  
  return (
    <div style={{ 
      ...style, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#ffffff',
    }}>
      {qrDataUrl ? (
        <img src={qrDataUrl} alt="QR" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      ) : (
        <span style={{ color: '#9ca3af', fontSize: '1.5em' }}>⬛</span>
      )}
    </div>
  );
}
