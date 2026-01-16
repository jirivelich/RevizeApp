import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Revize, Rozvadec, Okruh, Zavada, Mistnost, Zarizeni, Nastaveni, Sablona, MericiPristroj, Zakaznik } from '../types';
import { addCzechFont, t } from './fontUtils';

// Rozšíření jsPDF o autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

interface PDFExportData {
  revize: Revize;
  rozvadece: Rozvadec[];
  okruhy: Record<number, Okruh[]>; // rozvadecId -> okruhy
  zavady: Zavada[];
  mistnosti: Mistnost[];
  zarizeni: Record<number, Zarizeni[]>; // mistnostId -> zarizeni
  nastaveni: Nastaveni | null;
  sablona: Sablona;
  pouzitePristroje?: MericiPristroj[]; // Použité měřicí přístroje
  zakaznik?: Zakaznik | null; // Zákazník revize
}

export async function generatePDF(data: PDFExportData): Promise<jsPDF> {
  const { revize, rozvadece, okruhy, zavady, mistnosti, zarizeni, nastaveni, sablona, pouzitePristroje = [], zakaznik } = data;
  
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const landscapeMargin = 15; // Margin pro landscape stránky
  const headerHeight = 12; // Výška minimalistického záhlaví
  let yPos = headerHeight + 5;

  // Přidej font
  await addCzechFont(doc);

  // Pomocné funkce
  const addPageIfNeeded = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 25) {
      doc.addPage();
      yPos = headerHeight + 5; // Začít pod záhlavím
    }
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [37, 99, 235]; // default blue
  };

  const primaryColor = hexToRgb(sablona.barvaPrimary);
  const secondaryColor = hexToRgb(sablona.barvaSecondary);
  const baseFontSize = sablona.fontSize;
  
  // Výchozí bloky úvodní strany podle zákonných požadavků
  const defaultBloky = [
    { id: 'hlavicka', nazev: 'Hlavička (Firma + Revizní technik)', enabled: true, poradi: 1 },
    { id: 'nadpis', nazev: 'Nadpis dokumentu', enabled: true, poradi: 2 },
    { id: 'provozovatel', nazev: 'Provozovatel (zákazník)', enabled: true, poradi: 3 },
    { id: 'objekt', nazev: 'Identifikace zařízení a místo', enabled: true, poradi: 4 },
    { id: 'zakladni-udaje', nazev: 'Základní údaje revize', enabled: true, poradi: 5 },
    { id: 'vyhodnoceni', nazev: 'Vyhodnocení revize', enabled: true, poradi: 6 },
    { id: 'podpisy', nazev: 'Podpisy a předání', enabled: true, poradi: 7 },
  ];

  // ============ ÚVODNÍ STRANA - TECHNICKÝ DOKUMENT ============
  const renderUvodniStrana = () => {
    // Pokud je úvodní strana vypnutá, přeskočit
    if (sablona.uvodniStranaZobrazit === false) {
      return;
    }
    
    const contentWidth = pageWidth - 2 * margin;
    const halfWidth = (contentWidth - 5) / 2;
    const rowHeight = 8;
    const ramecekUdaje = sablona.uvodniStranaRamecekUdaje !== false;
    const ramecekObjekt = sablona.uvodniStranaRamecekObjekt !== false;
    const ramecekZakaznik = sablona.uvodniStranaRamecekZakaznik !== false;
    const ramecekVyhodnoceni = sablona.uvodniStranaRamecekVyhodnoceni !== false;
    
    // Pomocná funkce pro řádek tabulky
    const drawTableRow = (y: number, cells: {label: string, value: string, width: number}[], height: number = rowHeight, showBorder: boolean = true) => {
      let x = margin;
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      
      cells.forEach((cell) => {
        if (showBorder) {
          doc.rect(x, y, cell.width, height);
        }
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(baseFontSize - 2);
        doc.setTextColor(80, 80, 80);
        doc.text(t(cell.label), x + 2, y + 3);
        
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(baseFontSize - 1);
        doc.setTextColor(0, 0, 0);
        doc.text(t(cell.value), x + 2, y + height - 2);
        x += cell.width;
      });
    };
    
    // Render jednotlivých bloků
    const renderHlavicka = () => {
      const firmaJmeno = revize.firmaJmeno || nastaveni?.firmaJmeno;
      const firmaAdresa = revize.firmaAdresa || nastaveni?.firmaAdresa;
      const firmaIco = revize.firmaIco || nastaveni?.firmaIco;
      
      const showFirma = sablona.uvodniStranaZobrazitFirmu !== false && firmaJmeno;
      const showTechnik = sablona.uvodniStranaZobrazitTechnika !== false;
      
      if (!showFirma && !showTechnik) return;
      
      const startY = yPos;
      const headerBoxHeight = 35;
      
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      if (showFirma) doc.rect(margin, yPos, halfWidth, headerBoxHeight);
      if (showTechnik) doc.rect(margin + halfWidth + 5, yPos, halfWidth, headerBoxHeight);
      
      if (showFirma) {
        doc.setFillColor(...primaryColor);
        doc.rect(margin, yPos, halfWidth, 6, 'F');
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(baseFontSize - 1);
        doc.setTextColor(255, 255, 255);
        doc.text(t('FIRMA'), margin + 2, yPos + 4);
        
        let firmaY = yPos + 10;
        let firmaX = margin + 2;
        
        if (nastaveni?.logo) {
          try {
            let imageFormat: 'PNG' | 'JPEG' = 'PNG';
            const logoData = nastaveni.logo.toLowerCase();
            if (logoData.includes('data:image/jpeg') || logoData.includes('data:image/jpg')) imageFormat = 'JPEG';
            const logoWidth = 25, logoHeight = 20;
            try {
              doc.addImage(nastaveni.logo, imageFormat, margin + 2, firmaY, logoWidth, logoHeight);
            } catch {
              doc.addImage(nastaveni.logo, imageFormat === 'PNG' ? 'JPEG' : 'PNG', margin + 2, firmaY, logoWidth, logoHeight);
            }
            firmaX = margin + logoWidth + 5;
          } catch { /* pokračovat bez loga */ }
        }
        
        doc.setFontSize(baseFontSize);
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(t(firmaJmeno), firmaX, firmaY);
        firmaY += 5;
        
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(baseFontSize - 1);
        doc.setTextColor(80, 80, 80);
        if (firmaAdresa) { doc.text(t(firmaAdresa), firmaX, firmaY); firmaY += 4; }
        if (firmaIco) doc.text(t(`ICO: ${firmaIco}`), firmaX, firmaY);
      }
      
      if (showTechnik) {
        const rightX = margin + halfWidth + 5;
        doc.setFillColor(...primaryColor);
        doc.rect(rightX, startY, halfWidth, 6, 'F');
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(baseFontSize - 1);
        doc.setTextColor(255, 255, 255);
        doc.text(t('REVIZNÍ TECHNIK'), rightX + 2, startY + 4);
        
        let technikY = startY + 10;
        doc.setFontSize(baseFontSize);
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(t(nastaveni?.reviznniTechnikJmeno || '-'), rightX + 2, technikY);
        technikY += 5;
        
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(baseFontSize - 1);
        doc.setTextColor(80, 80, 80);
        doc.text(t(`Ev. c.: ${nastaveni?.reviznniTechnikCisloOpravneni || '-'}`), rightX + 2, technikY);
        technikY += 4;
        if (nastaveni?.kontaktTelefon) { doc.text(t(`Tel.: ${nastaveni.kontaktTelefon}`), rightX + 2, technikY); technikY += 4; }
        if (nastaveni?.kontaktEmail) doc.text(t(nastaveni.kontaktEmail), rightX + 2, technikY);
      }
      
      yPos += headerBoxHeight + 2;
    };
    
    const renderNadpis = () => {
      const nadpis = sablona.uvodniStranaNadpis || 'ZPRAVA O REVIZI ELEKTRICKE INSTALACE';
      const nadpisFontSize = sablona.uvodniStranaNadpisFontSize || 18;
      const zobrazitRamecek = sablona.uvodniStranaNadpisRamecek !== false;
      
      yPos += 5;
      
      if (zobrazitRamecek) {
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(1);
        doc.rect(margin, yPos, contentWidth, 18);
      }
      
      doc.setFontSize(nadpisFontSize);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(t(nadpis), pageWidth / 2, yPos + (zobrazitRamecek ? 12 : 8), { align: 'center' });
      yPos += zobrazitRamecek ? 22 : 14;
    };
    
    const renderZakladniUdaje = () => {
      // Nadpis sekce podle požadavků e) a f)
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos, contentWidth, 6, 'F');
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(baseFontSize - 1);
      doc.setTextColor(0, 0, 0);
      doc.text(t('e) f) DRUH REVIZE A DATA'), margin + 2, yPos + 4);
      yPos += 6;
      
      // Typ revize podle požadavku e)
      const druhRevize = revize.typRevize === 'pravidelná' ? 'PRAVIDELNÁ REVIZE' 
        : revize.typRevize === 'výchozí' ? 'VÝCHOZÍ REVIZE' : 'MIMOŘÁDNÁ REVIZE';
      
      // Data podle požadavku f) - používáme existující pole
      const datumZahajeni = new Date(revize.datum).toLocaleDateString('cs-CZ');
      const datumUkonceni = revize.datumDokonceni ? new Date(revize.datumDokonceni).toLocaleDateString('cs-CZ') : datumZahajeni;
      const datumVypracovani = revize.datumVypracovani ? new Date(revize.datumVypracovani).toLocaleDateString('cs-CZ') : new Date().toLocaleDateString('cs-CZ');
      const platnostDo = revize.datumPlatnosti ? new Date(revize.datumPlatnosti).toLocaleDateString('cs-CZ') : '-';
      
      drawTableRow(yPos, [
        { label: 'Číslo zprávy:', value: revize.cisloRevize, width: contentWidth / 2 },
        { label: 'Druh revize:', value: druhRevize, width: contentWidth / 2 },
      ], rowHeight, ramecekUdaje);
      yPos += rowHeight;
      
      drawTableRow(yPos, [
        { label: 'Datum zahájení:', value: datumZahajeni, width: contentWidth / 2 },
        { label: 'Datum ukončení:', value: datumUkonceni, width: contentWidth / 2 },
      ], rowHeight, ramecekUdaje);
      yPos += rowHeight;
      
      drawTableRow(yPos, [
        { label: 'Datum vypracování:', value: datumVypracovani, width: contentWidth / 2 },
        { label: 'Příští revize do:', value: platnostDo, width: contentWidth / 2 },
      ], rowHeight, ramecekUdaje);
      yPos += rowHeight + 4;
    };
    
    const renderObjekt = () => {
      if (sablona.uvodniStranaZobrazitObjekt === false) return;
      
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos, contentWidth, 6, 'F');
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(baseFontSize - 1);
      doc.setTextColor(0, 0, 0);
      // Nadpis podle požadavku b) - identifikace zařízení
      doc.text(t('b) IDENTIFIKACE REVIDOVANÉHO ZAŘÍZENÍ'), margin + 2, yPos + 4);
      yPos += 6;
      
      drawTableRow(yPos, [{ label: 'Druh zařízení:', value: revize.nazev || 'Elektrická instalace', width: contentWidth }], rowHeight, ramecekObjekt);
      yPos += rowHeight;
      drawTableRow(yPos, [{ label: 'Místo umístění:', value: revize.adresa, width: contentWidth }], rowHeight, ramecekObjekt);
      yPos += rowHeight + 4;
    };
    
    const renderZakaznik = () => {
      if (sablona.uvodniStranaZobrazitZakaznika === false) return;
      if (!zakaznik) return;
      
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos, contentWidth, 6, 'F');
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(baseFontSize - 1);
      doc.setTextColor(0, 0, 0);
      // Nadpis podle požadavku a) - provozovatel
      doc.text(t('a) PROVOZOVATEL / OBJEDNATEL'), margin + 2, yPos + 4);
      yPos += 6;
      
      drawTableRow(yPos, [{ label: 'Název/Jméno:', value: zakaznik.nazev || '-', width: contentWidth }], rowHeight, ramecekZakaznik);
      yPos += rowHeight;
      if (zakaznik.adresa) {
        drawTableRow(yPos, [{ label: 'Sídlo/Adresa:', value: zakaznik.adresa, width: contentWidth }], rowHeight, ramecekZakaznik);
        yPos += rowHeight;
      }
      if (zakaznik.ico || zakaznik.dic) {
        drawTableRow(yPos, [
          { label: 'IČO:', value: zakaznik.ico || '-', width: contentWidth / 2 },
          { label: 'DIČ:', value: zakaznik.dic || '-', width: contentWidth / 2 },
        ], rowHeight, ramecekZakaznik);
        yPos += rowHeight;
      }
      if (zakaznik.kontaktOsoba || zakaznik.telefon) {
        drawTableRow(yPos, [
          { label: 'Kontaktní osoba:', value: zakaznik.kontaktOsoba || '-', width: contentWidth / 2 },
          { label: 'Telefon:', value: zakaznik.telefon || '-', width: contentWidth / 2 },
        ], rowHeight, ramecekZakaznik);
        yPos += rowHeight;
      }
      yPos += 4;
    };
    
    const renderVyhodnoceni = () => {
      if (sablona.uvodniStranaZobrazitVyhodnoceni === false) return;
      
      yPos += 2;
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos, contentWidth, 6, 'F');
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(baseFontSize - 1);
      doc.setTextColor(0, 0, 0);
      // Nadpis podle požadavku l)
      doc.text(t('l) ZÁVĚREČNÉ ZHODNOCENÍ'), margin + 2, yPos + 4);
      yPos += 10;

      // Text vyhodnocení podle požadavku l)
      const vysledekText = revize.vysledek === 'schopno' 
        ? t('Vyhrazené elektrické zařízení JE z hlediska bezpečnosti SCHOPNO PROVOZU')
        : revize.vysledek === 'neschopno'
        ? t('Vyhrazené elektrické zařízení NENÍ z hlediska bezpečnosti SCHOPNO PROVOZU')
        : revize.vysledek === 'podmíněně schopno'
        ? t('Vyhrazené elektrické zařízení je PODMÍNĚNĚ SCHOPNO PROVOZU')
        : t('VÝSLEDEK REVIZE NEBYL STANOVEN');

      const vysledekColor: [number, number, number] = revize.vysledek === 'schopno' 
        ? [0, 100, 0] : revize.vysledek === 'neschopno' ? [180, 0, 0] 
        : revize.vysledek === 'podmíněně schopno' ? [180, 130, 0] : [80, 80, 80];

      if (ramecekVyhodnoceni) {
        doc.setDrawColor(...vysledekColor);
        doc.setLineWidth(1.5);
        doc.rect(margin, yPos - 2, contentWidth, 12);
      }
      
      doc.setFontSize(baseFontSize + 1);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(...vysledekColor);
      doc.text(vysledekText, pageWidth / 2, yPos + 6, { align: 'center' });
      yPos += 18;
    };
    
    const renderPodpisyBlok = () => {
      if (sablona.uvodniStranaZobrazitPodpisy === false || sablona.podpisyUmisteni === 'posledni') return;
      
      const podpisySectionHeight = 52;
      const bottomMargin = 15;
      const podpisyStartY = pageHeight - bottomMargin - podpisySectionHeight;
      let podpisyY = podpisyStartY;
      
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, podpisyY, contentWidth, 6, 'F');
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(baseFontSize - 1);
      doc.setTextColor(0, 0, 0);
      doc.text(t('PODPISY'), margin + 2, podpisyY + 4);
      podpisyY += 10;
      
      const colWidth = (contentWidth - 10) / 2;
      const leftX = margin;
      const rightX = margin + colWidth + 10;
      
      doc.setFontSize(baseFontSize - 1);
      doc.setFont('Roboto', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(t('Revizní technik:'), leftX, podpisyY);
      doc.text(t('Objednatel:'), rightX, podpisyY);
      
      podpisyY += 4;
      doc.setFontSize(baseFontSize - 2);
      doc.setTextColor(0, 0, 0);
      doc.text(t(nastaveni?.reviznniTechnikJmeno || ''), leftX, podpisyY);
      doc.text(t(revize.objednatel), rightX, podpisyY);
      
      podpisyY += 18;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(leftX, podpisyY, leftX + colWidth, podpisyY);
      doc.line(rightX, podpisyY, rightX + colWidth, podpisyY);
      
      podpisyY += 4;
      doc.setFontSize(baseFontSize - 2);
      doc.setTextColor(100, 100, 100);
      doc.text(t('podpis'), leftX + colWidth / 2, podpisyY, { align: 'center' });
      doc.text(t('podpis'), rightX + colWidth / 2, podpisyY, { align: 'center' });
      
      podpisyY += 10;
      const datumPodpisu = revize.datumVypracovani 
        ? new Date(revize.datumVypracovani).toLocaleDateString('cs-CZ')
        : new Date().toLocaleDateString('cs-CZ');
      doc.setFontSize(baseFontSize - 1);
      doc.setTextColor(0, 0, 0);
      doc.text(t(`V ........................... dne ${datumPodpisu}`), pageWidth / 2, podpisyY, { align: 'center' });
    };
    
    // Získat bloky a seřadit podle pořadí
    // Sloučit uložené bloky s výchozími (přidat chybějící bloky)
    let bloky = sablona.uvodniStranaBloky || [];
    
    // Přidat chybějící bloky z defaultBloky (pro staré šablony)
    for (const defaultBlok of defaultBloky) {
      if (!bloky.find(b => b.id === defaultBlok.id)) {
        // Přidat chybějící blok jako enabled
        bloky.push({ ...defaultBlok, enabled: true, poradi: bloky.length + 1 });
      }
    }
    
    const enabledBloky = bloky
      .filter(b => b.enabled !== false) // Výchozí je enabled
      .sort((a, b) => a.poradi - b.poradi);
    
    // Renderovat bloky v pořadí (kromě podpisů které jsou vždy dole)
    for (const blok of enabledBloky) {
      if (blok.id === 'podpisy') continue; // Podpisy jsou zvlášť
      switch (blok.id) {
        case 'hlavicka': renderHlavicka(); break;
        case 'nadpis': renderNadpis(); break;
        case 'zakladni-udaje': renderZakladniUdaje(); break;
        case 'objekt': renderObjekt(); break;
        case 'zakaznik': renderZakaznik(); break;
        case 'provozovatel': renderZakaznik(); break; // Provozovatel = zákazník (požadavek a)
        case 'vyhodnoceni': renderVyhodnoceni(); break;
      }
    }
    
    // Podpisy jsou vždy na konci (dole na stránce)
    const podpisyBlok = enabledBloky.find(b => b.id === 'podpisy');
    if (podpisyBlok) {
      renderPodpisyBlok();
    }
    
    // Nová stránka pro zbytek dokumentu
    doc.addPage();
    yPos = headerHeight + 5;
  };

  renderUvodniStrana();

  // ============ SEKCE DOKUMENTU ============
  // Landscape sekce (přílohy) budou vykresleny na konci
  const landscapeSekce = ['zavady']; // Seznam sekcí které budou na šířku v přílohách
  
  const enabledSekce = sablona.sekce
    .filter(s => s.enabled)
    .sort((a, b) => a.poradi - b.poradi);

  // Nejprve portrait sekce
  const portraitSekce = enabledSekce.filter(s => !landscapeSekce.includes(s.id));
  const prilohySekce = enabledSekce.filter(s => landscapeSekce.includes(s.id));

  let sekceIndex = 1; // Počítadlo sekcí

  for (const sekce of portraitSekce) {
    switch (sekce.id) {
      case 'zakladni-udaje':
        renderZakladniUdaje(sekceIndex++);
        break;
      case 'objekt':
        renderObjekt(sekceIndex++);
        break;
      case 'vymezeni-rozsahu':
        renderVymezeniRozsahu(sekceIndex++);
        break;
      case 'charakteristika-zarizeni':
        renderCharakteristikaZarizeni(sekceIndex++);
        break;
      case 'rozsah-podklady':
        renderRozsahPodklady(sekceIndex++);
        break;
      case 'podklady':
        renderPodklady(sekceIndex++);
        break;
      case 'provedene-ukony':
        renderProvedeneUkony(sekceIndex++);
        break;
      case 'vyhodnoceni-predchozich':
        renderVyhodnoceniPredchozich(sekceIndex++);
        break;
      case 'rozvadece':
        renderRozvadece(sekceIndex++);
        break;
      case 'mereni':
        renderMereni(sekceIndex++);
        break;
      case 'mistnosti':
        renderMistnosti(sekceIndex++);
        break;
      case 'pristroje':
        renderPristroje(sekceIndex++);
        break;
      case 'zaver':
        renderZaver(sekceIndex++);
        break;
      case 'podpisy':
        renderPodpisy(sekceIndex++);
        break;
    }
  }

  // Přílohy na konci (landscape sekce)
  if (prilohySekce.length > 0) {
    renderPrilohy(prilohySekce, sekceIndex);
  }

  // ============ RENDER FUNKCE PRO PŘÍLOHY ============
  function renderPrilohy(sekce: typeof enabledSekce, sectionNumber: number) {
    // Nová stránka pro přílohy (portrait) s nadpisem
    doc.addPage('a4', 'portrait');
    yPos = headerHeight + 5; // Začít pod záhlavím

    // Nadpis PŘÍLOHY - stejný styl jako ostatní sekce
    doc.setFontSize(baseFontSize + 2);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(t(`${sectionNumber}. PRILOHY`), margin, yPos);
    yPos += 2;
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Seznam příloh
    doc.setFontSize(baseFontSize);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(t('Tento dokument obsahuje následující přílohy:'), margin, yPos);
    yPos += 8;

    let prilohaIndex = 1;
    sekce.forEach((s) => {
      const nazvy: Record<string, string> = {
        'zavady': 'Zjištěné závady s Fotodokumentaci',
      };
      doc.setFont('Roboto', 'bold');
      doc.text(t(`Priloha ${prilohaIndex}: ${nazvy[s.id] || s.nazev}`), margin + 5, yPos);
      yPos += 6;
      prilohaIndex++;
    });

    // Vykreslení jednotlivých příloh (landscape)
    sekce.forEach((s) => {
      switch (s.id) {
        case 'zavady':
          renderZavady();
          break;
      }
    });
  }

  // ============ RENDER FUNKCE PRO SEKCE ============
  function renderSectionTitle(title: string) {
    addPageIfNeeded(15);
    doc.setFontSize(baseFontSize + 2);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(t(title), margin, yPos);
    yPos += 2;
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
  }

  function renderZakladniUdaje(sectionNumber: number) {
    renderSectionTitle(`${sectionNumber}. Základní údaje`);
    
    const tableData = [
      [t('Číslo revize:'), t(revize.cisloRevize)],
      [t('Název:'), t(revize.nazev)],
      [t('Typ revize:'), t(revize.typRevize)],
      [t('Datum provedení:'), new Date(revize.datum).toLocaleDateString('cs-CZ')],
      [t('Platnost do:'), revize.datumPlatnosti ? new Date(revize.datumPlatnosti).toLocaleDateString('cs-CZ') : '-'],
      [t('Stav:'), t(revize.stav)],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: tableData,
      theme: 'plain',
      styles: {
        font: 'Roboto',
        fontSize: baseFontSize,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50, textColor: [80, 80, 80] },
        1: { cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  function renderObjekt(sectionNumber: number) {
    renderSectionTitle(`${sectionNumber}. Údaje o objektu`);
    
    const tableData = [
      [t('Název objektu:'), t(revize.nazev)],
      [t('Adresa objektu:'), t(revize.adresa)],
      [t('Objednatel:'), t(revize.objednatel)],
    ];

    if (revize.poznamka) {
      tableData.push([t('Poznámka:'), t(revize.poznamka)]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: tableData,
      theme: 'plain',
      styles: {
        font: 'Roboto',
        fontSize: baseFontSize,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50, textColor: [80, 80, 80] },
        1: { cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  function renderRozsahPodklady(sectionNumber: number) {
    // Pokud nemáme data, přeskočit sekci
    if (!revize.rozsahRevize && !revize.podklady) {
      return;
    }

    // Zkontrolovat prostor pro nadpis + začátek obsahu
    addPageIfNeeded(50);
    
    renderSectionTitle(`${sectionNumber}. Rozsah revize a podklady`);
    
    // Rozsah revize
    if (revize.rozsahRevize) {
      doc.setFontSize(baseFontSize);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(t('Vymezení rozsahu revize:'), margin, yPos);
      yPos += 5;
      
      doc.setFont('Roboto', 'normal');
      doc.setTextColor(0, 0, 0);
      const rozsahLines = doc.splitTextToSize(t(revize.rozsahRevize), pageWidth - 2 * margin);
      doc.text(rozsahLines, margin, yPos);
      yPos += rozsahLines.length * 5 + 8;
    }
    
    // Podklady
    if (revize.podklady) {
      // Spočítat prostor pro podnadpis + text
      const podkladyLines = doc.splitTextToSize(t(revize.podklady), pageWidth - 2 * margin);
      addPageIfNeeded(Math.min(20 + podkladyLines.length * 5, 50));
      
      doc.setFontSize(baseFontSize);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(t('Seznam podkladů:'), margin, yPos);
      yPos += 5;
      
      doc.setFont('Roboto', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(podkladyLines, margin, yPos);
      yPos += podkladyLines.length * 5 + 8;
    }
    
    yPos += 5;
  }

  // ============ VYMEZENÍ ROZSAHU REVIZE ============
  function renderVymezeniRozsahu(sectionNumber: number) {
    // Pokud nemáme data, přeskočit sekci
    if (!revize.rozsahRevize && !revize.predmetNeni) {
      return;
    }

    addPageIfNeeded(50);
    renderSectionTitle(`${sectionNumber}. Vymezení rozsahu revize`);
    
    // 1.1 Předmětem revize je
    if (revize.rozsahRevize) {
      doc.setFontSize(baseFontSize);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(t('1.1 Předmětem revize je:'), margin, yPos);
      yPos += 5;
      
      doc.setFont('Roboto', 'normal');
      doc.setTextColor(0, 0, 0);
      const rozsahLines = doc.splitTextToSize(t(revize.rozsahRevize), pageWidth - 2 * margin);
      doc.text(rozsahLines, margin, yPos);
      yPos += rozsahLines.length * 5 + 8;
    }
    
    // 1.2 Předmětem revize není
    if (revize.predmetNeni) {
      const predmetNeniLines = doc.splitTextToSize(t(revize.predmetNeni), pageWidth - 2 * margin);
      addPageIfNeeded(Math.min(20 + predmetNeniLines.length * 5, 50));
      
      doc.setFontSize(baseFontSize);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(t('1.2 Předmětem revize není:'), margin, yPos);
      yPos += 5;
      
      doc.setFont('Roboto', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(predmetNeniLines, margin, yPos);
      yPos += predmetNeniLines.length * 5 + 8;
    }
    
    yPos += 5;
  }

  // ============ CHARAKTERISTIKA ZAŘÍZENÍ ============
  function renderCharakteristikaZarizeni(sectionNumber: number) {
    // Pokud nemáme data, přeskočit sekci
    if (!revize.napetovaSoustava && !revize.ochranaOpatreni) {
      return;
    }

    addPageIfNeeded(50);
    renderSectionTitle(`${sectionNumber}. Charakteristika zařízení`);
    
    // 2.1 Napěťová soustava
    if (revize.napetovaSoustava) {
      doc.setFontSize(baseFontSize);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(t('2.1 Napěťová soustava:'), margin, yPos);
      yPos += 5;
      
      doc.setFont('Roboto', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(t(revize.napetovaSoustava), margin, yPos);
      yPos += 10;
    }
    
    // 2.2 Ochrana před úrazem elektrickým proudem
    if (revize.ochranaOpatreni) {
      doc.setFontSize(baseFontSize);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(t('2.2 Ochrana před úrazem elektrickým proudem:'), margin, yPos);
      yPos += 8;
      
      // Seznam všech opatření
      const vsechnaOpatreni = [
        { id: 'zakladni-izolace', label: 'Základní izolace živých částí' },
        { id: 'kryty-pricka', label: 'Přepážky nebo kryty' },
        { id: 'zamezeni-dotyk', label: 'Zábrany nebo ochrana polohou' },
        { id: 'selv', label: 'Ochrana malým napětím SELV' },
        { id: 'pelv', label: 'Ochrana malým napětím PELV' },
        { id: 'ochrane-pospojovani', label: 'Ochranné pospojování' },
        { id: 'samocine-odpojeni', label: 'Samočinné odpojení od zdroje' },
        { id: 'proudovy-chranic', label: 'Doplňková ochrana proudovým chráničem' },
        { id: 'ochranne-oddeleni', label: 'Ochranné oddělení obvodů' },
        { id: 'dvojita-izolace', label: 'Dvojitá nebo zesílená izolace' },
        { id: 'nevodive-prostredi', label: 'Nevodivé prostředí' },
        { id: 'neuzemene-pospojeni', label: 'Neuzemené místní pospojování' },
      ];
      
      let selectedOpatreni: string[] = [];
      try {
        selectedOpatreni = JSON.parse(revize.ochranaOpatreni);
      } catch {
        selectedOpatreni = [];
      }
      
      // Tabulka opatření
      const tableData = vsechnaOpatreni.map(op => [
        t(op.label),
        selectedOpatreni.includes(op.id) ? '✓' : '—'
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [[t('Druh ochrany'), t('Použito')]],
        body: tableData,
        theme: 'striped',
        styles: {
          font: 'Roboto',
          fontSize: baseFontSize - 1,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 140 },
          1: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });

      yPos = doc.lastAutoTable.finalY + 10;
    }
  }

  // ============ PODKLADY PRO REVIZI ============
  function renderPodklady(sectionNumber: number) {
    // Pokud nemáme data, přeskočit sekci
    if (!revize.podklady) {
      return;
    }

    const podkladyLines = doc.splitTextToSize(t(revize.podklady), pageWidth - 2 * margin);
    const requiredSpace = 15 + podkladyLines.length * 5 + 10;
    addPageIfNeeded(Math.min(requiredSpace, 50));
    
    renderSectionTitle(`${sectionNumber}. Podklady pro revizi`);
    
    doc.setFontSize(baseFontSize);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(podkladyLines, margin, yPos);
    yPos += podkladyLines.length * 5 + 10;
  }

  function renderProvedeneUkony(sectionNumber: number) {
    // Pokud nemáme data, přeskočit sekci
    if (!revize.provedeneUkony) {
      return;
    }

    // Spočítat potřebný prostor pro nadpis + text
    const ukonyLines = doc.splitTextToSize(t(revize.provedeneUkony), pageWidth - 2 * margin);
    const requiredSpace = 15 + ukonyLines.length * 5 + 10; // 15 pro nadpis
    
    // Zkontrolovat prostor PŘED vykreslením nadpisu
    addPageIfNeeded(Math.min(requiredSpace, 50)); // Min 50px aby nadpis + začátek textu byly spolu
    
    renderSectionTitle(`${sectionNumber}. Provedené úkony`);
    
    doc.setFontSize(baseFontSize);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(ukonyLines, margin, yPos);
    yPos += ukonyLines.length * 5 + 10;
  }

  function renderVyhodnoceniPredchozich(sectionNumber: number) {
    // Pokud nemáme data, přeskočit sekci
    if (!revize.vyhodnoceniPredchozich) {
      return;
    }

    // Spočítat potřebný prostor pro nadpis + text
    const vyhodnoceniLines = doc.splitTextToSize(t(revize.vyhodnoceniPredchozich), pageWidth - 2 * margin);
    const requiredSpace = 15 + vyhodnoceniLines.length * 5 + 10;
    
    // Zkontrolovat prostor PŘED vykreslením nadpisu
    addPageIfNeeded(Math.min(requiredSpace, 50));
    
    renderSectionTitle(`${sectionNumber}. Vyhodnocení předchozích revizí`);
    
    doc.setFontSize(baseFontSize);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(vyhodnoceniLines, margin, yPos);
    yPos += vyhodnoceniLines.length * 5 + 10;
  }

  function renderPristroje(sectionNumber: number) {
    // Pokud nemáme přístroje, přeskočit sekci
    if (!pouzitePristroje || pouzitePristroje.length === 0) {
      return;
    }

    // Zkontrolovat prostor pro nadpis + alespoň záhlaví tabulky
    addPageIfNeeded(50);
    
    renderSectionTitle(`${sectionNumber}. Použité měřicí přístroje`);
    
    const tableData = pouzitePristroje.map(p => [
      t(p.nazev),
      t(`${p.vyrobce} ${p.model}`),
      t(p.vyrobniCislo),
      new Date(p.datumKalibrace).toLocaleDateString('cs-CZ'),
      new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ'),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [[
        t('Název'),
        t('Výrobce/Model'),
        t('Výrobní číslo'),
        t('Kalibrace'),
        t('Platnost do'),
      ]],
      body: tableData,
      theme: 'striped',
      styles: {
        font: 'Roboto',
        fontSize: baseFontSize - 1,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      margin: { left: margin, right: margin },
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  function renderRozvadece(sectionNumber: number) {
    renderSectionTitle(`${sectionNumber}. Rozvaděče a okruhy`);

    if (rozvadece.length === 0) {
      doc.setFontSize(baseFontSize);
      doc.setTextColor(100, 100, 100);
      doc.text(t('Žádné rozvaděče nebyly přidány.'), margin, yPos);
      yPos += 10;
      return;
    }

    for (const rozvadec of rozvadece) {
      addPageIfNeeded(40);
      
      // Název rozvaděče
      doc.setFontSize(baseFontSize + 1);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(t(`${rozvadec.nazev} (${rozvadec.oznaceni})`), margin, yPos);
      yPos += 6;

      // Info o rozvaděči
      doc.setFontSize(baseFontSize - 1);
      doc.setFont('Roboto', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(t(`Umístění: ${rozvadec.umisteni} | Typ: ${rozvadec.typRozvadece || '-'} | Kryti: ${rozvadec.stupenKryti}`), margin, yPos);
      yPos += 8;

      // Tabulka okruhů
      const RozvaděčOkruhy = okruhy[rozvadec.id!] || [];
      if (RozvaděčOkruhy.length > 0) {
        // Filtrovat sloupce podle šablony
        const enabledSloupce = sablona.sloupceOkruhu
          .filter(s => s.enabled)
          .sort((a, b) => a.poradi - b.poradi);

        const headers = enabledSloupce.map(s => t(s.nazev));
        
        const bodyData = RozvaděčOkruhy
          .sort((a, b) => a.cislo - b.cislo)
          .map(o => {
            return enabledSloupce.map(s => {
              switch (s.id) {
                case 'cislo': return o.cislo.toString();
                case 'Jistič': return `${o.pocetFazi || 1}/${o.jisticTyp}${o.jisticProud}`;
                case 'nazev': return t(o.nazev);
                case 'Vodič': return o.vodic;
                case 'izolacni-odpor': return o.izolacniOdpor ? `${o.izolacniOdpor} MOhm` : '-';
                case 'impedance': return o.impedanceSmycky ? `${o.impedanceSmycky} Ohm` : '-';
                case 'proudovy-chranic': return o.proudovyChranicMa ? `${o.proudovyChranicMa} mA` : '-';
                case 'cas-odpojeni': return o.casOdpojeni ? `${o.casOdpojeni} ms` : '-';
                default: return '';
              }
            });
          });

        autoTable(doc, {
          startY: yPos,
          head: [headers],
          body: bodyData,
          theme: 'striped',
          styles: {
        font: 'Roboto',
        fontSize: baseFontSize - 1,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250],
          },
          margin: { left: margin, right: margin },
        });

        yPos = doc.lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(baseFontSize - 1);
        doc.setTextColor(150, 150, 150);
        doc.text(t('Žádné okruhy'), margin + 5, yPos);
        yPos += 10;
      }
    }
  }

  function renderMereni(sectionNumber: number) {
    renderSectionTitle(`${sectionNumber}. Výsledky měření`);
    
    // Souhrn měření ze všech okruhů
    let celkemOkruhu = 0;
    let minIzolacniOdpor: number | null = null;
    let maxImpedance: number | null = null;

    for (const RozvaděčOkruhy of Object.values(okruhy)) {
      celkemOkruhu += RozvaděčOkruhy.length;
      for (const o of RozvaděčOkruhy) {
        if (o.izolacniOdpor !== undefined) {
          if (minIzolacniOdpor === null || o.izolacniOdpor < minIzolacniOdpor) {
            minIzolacniOdpor = o.izolacniOdpor;
          }
        }
        if (o.impedanceSmycky !== undefined) {
          if (maxImpedance === null || o.impedanceSmycky > maxImpedance) {
            maxImpedance = o.impedanceSmycky;
          }
        }
      }
    }

    const tableData = [
      [t('Celkem okruhů:'), celkemOkruhu.toString()],
      [t('Nejnižší izolační odpor:'), minIzolacniOdpor !== null ? `${minIzolacniOdpor} MOhm` : t('Neměřeno')],
      [t('Nejvyšší impedance smyčky:'), maxImpedance !== null ? `${maxImpedance} Ohm` : t('Neměřeno')],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: tableData,
      theme: 'plain',
      styles: {
        font: 'Roboto',
        fontSize: baseFontSize,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60, textColor: [80, 80, 80] },
        1: { cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  function renderZavady() {
    // Přepnout na landscape orientaci pro závady
    doc.addPage('a4', 'landscape');
    const landscapePageWidth = doc.internal.pageSize.getWidth();
    const landscapePageHeight = doc.internal.pageSize.getHeight();
    const landscapeMargin = 15;
    yPos = headerHeight + 5; // Začít pod záhlavím

    // Nadpis sekce
    doc.setFillColor(...primaryColor);
    doc.rect(landscapeMargin, yPos, landscapePageWidth - 2 * landscapeMargin, 8, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(baseFontSize + 1);
    doc.setTextColor(255, 255, 255);
    doc.text(t('Příloha 1: Zjištěné závady s fotodokumentací'), landscapeMargin + 3, yPos + 5.5);
    yPos += 12;

    if (zavady.length === 0) {
      doc.setFontSize(baseFontSize);
      doc.setTextColor(100, 100, 100);
      doc.text(t('Žádné závady nebyly zjištěny.'), landscapeMargin, yPos);
      yPos += 10;
      return;
    }

    // Vykreslení každé závady s Fotografiemi
    zavady.forEach((z, index) => {
      // Kontrola místa na stránce
      if (yPos + 60 > landscapePageHeight - 20) {
        doc.addPage('a4', 'landscape');
        yPos = headerHeight + 5; // Začít pod záhlavím
      }

      // Nadpis závady
      doc.setFontSize(baseFontSize);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(t(`Zavada #${index + 1}`), landscapeMargin, yPos);
      yPos += 6;

      // Barva podle závažnosti
      const ZávažnostColor: [number, number, number] = z.zavaznost === 'C1' 
        ? [239, 68, 68]   // red - kritická
        : z.zavaznost === 'C2'
        ? [234, 179, 8]   // yellow - závažná
        : [34, 197, 94];  // green - drobná

      // Informace o závadě v tabulce
      const infoWidth = z.fotky && z.fotky.length > 0 ? 140 : landscapePageWidth - 2 * landscapeMargin;
      
      autoTable(doc, {
        startY: yPos,
        head: [],
        body: [
          [t('Popis:'), t(z.popis)],
          [t('Závažnost:'), t(z.zavaznost)],
          [t('Stav:'), t(z.stav)],
          [t('Datum zjištění:'), z.datumZjisteni ? new Date(z.datumZjisteni).toLocaleDateString('cs-CZ') : '-'],
          ...(z.datumVyreseni ? [[t('Datum vyřešení:'), new Date(z.datumVyreseni).toLocaleDateString('cs-CZ')]] : []),
          ...(z.poznamka ? [[t('Poznámka:'), t(z.poznamka)]] : []),
        ],
        theme: 'plain',
        styles: {
        font: 'Roboto',
        fontSize: baseFontSize - 1,
          cellPadding: 2,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35, textColor: [80, 80, 80] },
          1: { cellWidth: infoWidth - 35 },
        },
        margin: { left: landscapeMargin, right: landscapePageWidth - landscapeMargin - infoWidth },
        didParseCell: (data) => {
          // Obarvení závažnosti
          if (data.row.index === 1 && data.column.index === 1) {
            data.cell.styles.textColor = ZávažnostColor;
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      const tableEndY = doc.lastAutoTable.finalY;

      // Fotografie vedle tabulky
      if (z.fotky && z.fotky.length > 0) {
        const photoStartX = landscapeMargin + infoWidth + 10;
        const photoHeight = 45;
        const photoWidth = 60;
        let photoX = photoStartX;
        let photoY = yPos;

        z.fotky.forEach((Foto, FotoIndex) => {
          // Maximálně 3 fotky vedle sebe
          if (FotoIndex > 0 && FotoIndex % 3 === 0) {
            photoX = photoStartX;
            photoY += photoHeight + 5;
          }

          if (photoX + photoWidth <= landscapePageWidth - landscapeMargin) {
            try {
              // Obrázek z Base64
              const imgData = Foto.startsWith('data:') ? Foto : `data:image/jpeg;base64,${Foto}`;
              doc.addImage(imgData, 'JPEG', photoX, photoY, photoWidth, photoHeight);
              
              // Rámeček kolem obrázku
              doc.setDrawColor(200, 200, 200);
              doc.setLineWidth(0.5);
              doc.rect(photoX, photoY, photoWidth, photoHeight);
              
              photoX += photoWidth + 5;
            } catch (e) {
              console.warn('Chyba při načítání obrázku závady:', e);
            }
          }
        });

        yPos = Math.max(tableEndY, photoY + photoHeight) + 10;
      } else {
        yPos = tableEndY + 10;
      }

      // Oddělovací čára mezi závadami
      if (index < zavady.length - 1) {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(landscapeMargin, yPos - 5, landscapePageWidth - landscapeMargin, yPos - 5);
      }
    });
    // Landscape přílohy zůstávají na konci dokumentu - nepřepínáme zpět
  }

  function renderMistnosti(sectionNumber: number) {
    renderSectionTitle(`${sectionNumber}. Kontrolované místnosti`);

    if (mistnosti.length === 0) {
      doc.setFontSize(baseFontSize);
      doc.setTextColor(100, 100, 100);
      doc.text(t('Žádné místnosti nebyly přidány.'), margin, yPos);
      yPos += 10;
      return;
    }

    // Pro každou místnost vykresli její údaje a zařízení pod ní
    mistnosti.forEach((m, index) => {
      addPageIfNeeded(40);
      
      // Nadpis místnosti
      doc.setFontSize(baseFontSize);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(t(`${index + 1}. ${m.nazev}`), margin, yPos);
      yPos += 6;

      // Tabulka s údaji místnosti
      autoTable(doc, {
        startY: yPos,
        head: [[t('Patro'), t('Typ'), t('Prostredi'), t('Plocha')]],
        body: [[
          t(m.patro) || '-',
          t(m.typ),
          t(m.prostredi),
          m.plocha ? `${m.plocha} m2` : '-',
        ]],
        theme: 'striped',
        styles: {
        font: 'Roboto',
        fontSize: baseFontSize - 1,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        margin: { left: margin, right: margin },
      });

      yPos = doc.lastAutoTable.finalY + 5;

      // Zařízení v místnosti
      const MístnostZarizeni = m.id ? (zarizeni[m.id] || []) : [];
      
      if (MístnostZarizeni.length > 0) {
        // Podnádpis pro zařízení
        doc.setFontSize(baseFontSize - 1);
        doc.setFont('Roboto', 'italic');
        doc.setTextColor(80, 80, 80);
        doc.text(t('Zařízení v mistnosti:'), margin + 5, yPos);
        yPos += 5;

        const zarizeniBodyData = MístnostZarizeni.map(z => [
          t(z.nazev),
          t(z.oznaceni) || '-',
          z.pocetKs?.toString() || '1',
          t(z.trida),
          z.prikonW ? `${z.prikonW} W` : '-',
          t(z.ochranaPredDotykem) || '-',
          t(z.stav),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [[t('Název'), t('Oznaceni'), t('Ks'), t('Trida'), t('Prikon'), t('Ochrana'), t('Stav')]],
          body: zarizeniBodyData,
          theme: 'striped',
          styles: {
        font: 'Roboto',
        fontSize: baseFontSize - 2,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: [secondaryColor[0], secondaryColor[1], secondaryColor[2]],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          margin: { left: margin + 5, right: margin },
        });

        yPos = doc.lastAutoTable.finalY + 8;
      } else {
        yPos += 5;
      }
    });
  }

  function renderZaver(sectionNumber: number) {
    renderSectionTitle(`${sectionNumber}. Závěr revize`);
    
    addPageIfNeeded(40);
    
    // Výsledek revize
    const vysledekText = revize.vysledek === 'schopno' 
      ? t('ELEKTRICKÉ ZAŘÍZENÍ JE SCHOPNO BEZPEČNÉHO PROVOZU')
      : revize.vysledek === 'neschopno'
      ? t('ELEKTRICKÉ ZAŘÍZENÍ NENÍ SCHOPNO BEZPEČNÉHO PROVOZU')
      : revize.vysledek === 'podmíněně schopno'
      ? t('ELEKTRICKÉ ZAŘÍZENÍ JE PODMÍNĚNĚ SCHOPNO BEZPEČNÉHO PROVOZU')
      : t('VÝSLEDEK REVIZE NEBYL STANOVEN');

    const vysledekColor: [number, number, number] = revize.vysledek === 'schopno' 
      ? [34, 197, 94]  // green
      : revize.vysledek === 'neschopno'
      ? [239, 68, 68]   // red
      : revize.vysledek === 'podmíněně schopno'
      ? [234, 179, 8]   // yellow
      : [100, 100, 100]; // gray

    doc.setFontSize(baseFontSize + 2);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(...vysledekColor);
    
    // Orámovaný box pro výsledek
    const textWidth = doc.getTextWidth(vysledekText);
    const boxX = (pageWidth - textWidth - 20) / 2;
    doc.setDrawColor(...vysledekColor);
    doc.setLineWidth(1);
    doc.roundedRect(boxX, yPos - 6, textWidth + 20, 15, 3, 3, 'S');
    doc.text(vysledekText, pageWidth / 2, yPos + 3, { align: 'center' });
    
    yPos += 25;

    // Odůvodnění neschopnosti provozu (pokud je výsledek neschopno)
    if (revize.vysledek === 'neschopno' && revize.vysledekOduvodneni) {
      addPageIfNeeded(30);
      doc.setFontSize(baseFontSize);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text(t('Odůvodnění neschopnosti provozu:'), margin, yPos);
      yPos += 5;
      
      doc.setFont('Roboto', 'normal');
      doc.setTextColor(80, 80, 80);
      const oduvodneniLines = doc.splitTextToSize(t(revize.vysledekOduvodneni), pageWidth - 2 * margin);
      doc.text(oduvodneniLines, margin, yPos);
      yPos += oduvodneniLines.length * 5 + 8;
    }

    // Závěr revize (textový popis)
    if (revize.zaver) {
      addPageIfNeeded(30);
      doc.setFontSize(baseFontSize);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(t('Závěr a doporučení:'), margin, yPos);
      yPos += 5;
      
      doc.setFont('Roboto', 'normal');
      doc.setTextColor(0, 0, 0);
      const zaverLines = doc.splitTextToSize(t(revize.zaver), pageWidth - 2 * margin);
      doc.text(zaverLines, margin, yPos);
      yPos += zaverLines.length * 5 + 8;
    }

    // Statistiky
    doc.setFontSize(baseFontSize);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(80, 80, 80);
    
    const stats = [
      t(`Počet kontrolovaných rozvaděčů: ${rozvadece.length}`),
      t(`Počet kontrolovaných okruhů: ${Object.values(okruhy).reduce((sum, arr) => sum + arr.length, 0)}`),
      t(`Počet zjištěných závad: ${zavady.length}`),
      t(`Počet kontrolovaných místností: ${mistnosti.length}`),
    ];

    stats.forEach(stat => {
      doc.text(stat, margin, yPos);
      yPos += 6;
    });

    yPos += 5;
  }

  function renderPodpisy(sectionNumber: number) {
    // Renderovat podpisy na poslední straně pouze pokud je nastaveno
    if (sablona.uvodniStranaZobrazitPodpisy === false || sablona.podpisyUmisteni !== 'posledni') {
      return;
    }
    
    addPageIfNeeded(60);
    renderSectionTitle(`${sectionNumber}. Podpisy`);
    
    yPos += 10;
    
    const colWidth = (pageWidth - 2 * margin) / 2;
    
    // Revizní technik
    doc.setFontSize(baseFontSize);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(t('Revizní technik:'), margin, yPos);
    doc.text(t('Objednatel:'), margin + colWidth, yPos);
    
    yPos += 20;
    
    // Podpisové čáry
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, margin + colWidth - 20, yPos);
    doc.line(margin + colWidth, yPos, pageWidth - margin, yPos);
    
    yPos += 5;
    
    doc.setFontSize(baseFontSize - 2);
    doc.setTextColor(120, 120, 120);
    doc.text(t(nastaveni?.reviznniTechnikJmeno || ''), margin, yPos);
    doc.text(t(revize.objednatel), margin + colWidth, yPos);
    
    yPos += 15;
    
    doc.text(t(`V ........................... dne ${new Date().toLocaleDateString('cs-CZ')}`), margin, yPos);
    
    yPos += 15;
  }

  // ============ ZÁHLAVÍ A ZÁPATÍ NA KAŽDÉ STRÁNCE ============
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Zjistit orientaci stránky
    const currentPageWidth = doc.internal.pageSize.getWidth();
    const currentPageHeight = doc.internal.pageSize.getHeight();
    const isLandscape = currentPageWidth > currentPageHeight;
    const currentMargin = isLandscape ? landscapeMargin : margin;
    
    // ZÁHLAVÍ
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.3);
    doc.line(currentMargin, headerHeight, currentPageWidth - currentMargin, headerHeight);
    
    doc.setFontSize(baseFontSize - 2);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(...primaryColor);
    doc.text(t(`${revize.cisloRevize}`), currentMargin, headerHeight - 3);
    
    doc.setTextColor(100, 100, 100);
    doc.text(t(revize.nazev), currentPageWidth / 2, headerHeight - 3, { align: 'center' });
    doc.text(revize.datum ? new Date(revize.datum).toLocaleDateString('cs-CZ') : '', currentPageWidth - currentMargin, headerHeight - 3, { align: 'right' });
    
    // ZÁPATÍ
    const footerY = currentPageHeight - 10;
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.3);
    doc.line(currentMargin, footerY - 5, currentPageWidth - currentMargin, footerY - 5);
    
    doc.setFontSize(baseFontSize - 2);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(120, 120, 120);
    
    if (sablona.zapatiZobrazitCisloStranky) {
      doc.text(t(`Strana ${i} z ${totalPages}`), currentPageWidth / 2, footerY, { align: 'center' });
    }
    
    if (sablona.zapatiZobrazitDatum) {
      doc.text(new Date().toLocaleDateString('cs-CZ'), currentMargin, footerY);
    }
    
    if (sablona.zapatiCustomText) {
      doc.text(t(sablona.zapatiCustomText), currentPageWidth - currentMargin, footerY, { align: 'right' });
    }
  }

  return doc;
}

export function previewPDF(doc: jsPDF): string {
  // Použij blob URL pro lepší kompatibilitu
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename);
}
