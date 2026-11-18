/**
 * Stažení PDF z náhledu dokladu (faktura, nabídka): element .fp-page se nasnímá
 * přes html2canvas a vloží do A4. Delší doklad se rozdělí na více stran.
 */
export async function stahnoutPdf(el: HTMLElement, nazevSouboru: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  // html2canvas měří účaří písma přes <img> v <body>; Tailwind mu dává display:block → posunutý text
  const fix = document.createElement('style');
  fix.textContent = 'body > div:not(#root) > img { display: inline !important; }';
  document.head.appendChild(fix);
  el.classList.add('fp-exporting');
  try {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const sirka = 210;
    const vyskaObrazu = (canvas.height * sirka) / canvas.width;
    const img = canvas.toDataURL('image/jpeg', 0.92);
    let zbyva = vyskaObrazu;
    let posun = 0;
    pdf.addImage(img, 'JPEG', 0, posun, sirka, vyskaObrazu, undefined, 'FAST');
    zbyva -= 297;
    while (zbyva > 1) {
      posun -= 297;
      pdf.addPage('a4', 'portrait');
      pdf.addImage(img, 'JPEG', 0, posun, sirka, vyskaObrazu, undefined, 'FAST');
      zbyva -= 297;
    }
    pdf.save(nazevSouboru.replace(/[\\/:*?"<>|]+/g, '-'));
  } finally {
    el.classList.remove('fp-exporting');
    fix.remove();
  }
}
