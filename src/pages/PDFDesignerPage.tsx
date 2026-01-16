// PDFDesignerPage - stránka pro vizuální návrh PDF šablon
import { useState, useEffect } from 'react';
import { PDFDesigner } from '../components/PDFDesigner';
import type { Revize, Nastaveni, Rozvadec, Okruh, Zavada, Mistnost, Zarizeni, MericiPristroj, Zakaznik } from '../types';
import type { DesignerTemplate } from '../components/PDFDesigner';

export function PDFDesignerPage() {
  const [revize, setRevize] = useState<Revize | null>(null);
  const [nastaveni, setNastaveni] = useState<Nastaveni | null>(null);
  const [rozvadece, setRozvadece] = useState<Rozvadec[]>([]);
  const [okruhy, setOkruhy] = useState<Record<number, Okruh[]>>({});
  const [zavady, setZavady] = useState<Zavada[]>([]);
  const [mistnosti, setMistnosti] = useState<Mistnost[]>([]);
  const [zarizeni, setZarizeni] = useState<Record<number, Zarizeni[]>>({});
  const [pouzitePristroje, setPouzitePristroje] = useState<MericiPristroj[]>([]);
  const [zakaznik, setZakaznik] = useState<Zakaznik | null>(null);
  const [loading, setLoading] = useState(true);

  // Načíst demo data pro náhled
  useEffect(() => {
    const loadData = async () => {
      try {
        // Načíst poslední revizi pro náhled
        const revizeResponse = await fetch('/api/revize');
        if (revizeResponse.ok) {
          const revizeData = await revizeResponse.json();
          if (revizeData.length > 0) {
            // Načíst detail první revize
            const revizeId = revizeData[0].id;
            const detailResponse = await fetch(`/api/revize/${revizeId}`);
            if (detailResponse.ok) {
              const revizeDetail = await detailResponse.json();
              setRevize(revizeDetail);
              
              // Načíst zákazníka pokud existuje
              if (revizeDetail.zakaznikId) {
                try {
                  const zakaznikResponse = await fetch(`/api/zakaznici/${revizeDetail.zakaznikId}`);
                  if (zakaznikResponse.ok) {
                    setZakaznik(await zakaznikResponse.json());
                  }
                } catch (e) {
                  console.error('Failed to load zakaznik:', e);
                }
              }
              
              // Načíst rozvaděče
              try {
                const rozvadeceResponse = await fetch(`/api/revize/${revizeId}/rozvadece`);
                if (rozvadeceResponse.ok) {
                  const rozvadeceData: Rozvadec[] = await rozvadeceResponse.json();
                  setRozvadece(rozvadeceData);
                  
                  // Načíst okruhy pro každý rozvaděč
                  const okruhyMap: Record<number, Okruh[]> = {};
                  for (const rozvadec of rozvadeceData) {
                    if (rozvadec.id) {
                      try {
                        const okruhyResponse = await fetch(`/api/rozvadece/${rozvadec.id}/okruhy`);
                        if (okruhyResponse.ok) {
                          okruhyMap[rozvadec.id] = await okruhyResponse.json();
                        }
                      } catch (e) {
                        console.error(`Failed to load okruhy for rozvadec ${rozvadec.id}:`, e);
                      }
                    }
                  }
                  setOkruhy(okruhyMap);
                }
              } catch (e) {
                console.error('Failed to load rozvadece:', e);
              }
              
              // Načíst závady
              try {
                const zavadyResponse = await fetch(`/api/revize/${revizeId}/zavady`);
                if (zavadyResponse.ok) {
                  setZavady(await zavadyResponse.json());
                }
              } catch (e) {
                console.error('Failed to load zavady:', e);
              }
              
              // Načíst místnosti a zařízení
              try {
                const mistnostiResponse = await fetch(`/api/revize/${revizeId}/mistnosti`);
                if (mistnostiResponse.ok) {
                  const mistnostiData: Mistnost[] = await mistnostiResponse.json();
                  setMistnosti(mistnostiData);
                  
                  // Načíst zařízení pro každou místnost
                  const zarizeniMap: Record<number, Zarizeni[]> = {};
                  for (const mistnost of mistnostiData) {
                    if (mistnost.id) {
                      try {
                        const zarizeniResponse = await fetch(`/api/mistnosti/${mistnost.id}/zarizeni`);
                        if (zarizeniResponse.ok) {
                          zarizeniMap[mistnost.id] = await zarizeniResponse.json();
                        }
                      } catch (e) {
                        console.error(`Failed to load zarizeni for mistnost ${mistnost.id}:`, e);
                      }
                    }
                  }
                  setZarizeni(zarizeniMap);
                }
              } catch (e) {
                console.error('Failed to load mistnosti:', e);
              }
              
              // Načíst použité měřicí přístroje
              if (revizeDetail.pouzitePristroje) {
                try {
                  const pristrojeIds = revizeDetail.pouzitePristroje.split(',').map((id: string) => id.trim());
                  const pristrojeResponse = await fetch('/api/pristroje');
                  if (pristrojeResponse.ok) {
                    const allPristroje: MericiPristroj[] = await pristrojeResponse.json();
                    const usedPristroje = allPristroje.filter(p => 
                      p.id && pristrojeIds.includes(p.id.toString())
                    );
                    setPouzitePristroje(usedPristroje);
                  }
                } catch (e) {
                  console.error('Failed to load pristroje:', e);
                }
              }
            }
          }
        }

        // Načíst nastavení
        const nastaveniResponse = await fetch('/api/nastaveni');
        if (nastaveniResponse.ok) {
          setNastaveni(await nastaveniResponse.json());
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Export šablony jako PDF (zatím jen log)
  const handleExport = (template: DesignerTemplate) => {
    console.log('Exporting template:', template);
    // TODO: Implementovat skutečný export do PDF pomocí html2pdf nebo jsPDF
    alert(`Šablona "${template.name}" připravena k exportu.\n\nPočet stránek: ${template.pages.length}\nCelkem widgetů: ${template.pages.reduce((sum, p) => sum + p.widgets.length, 0)}`);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Načítám data pro náhled...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)]">
      <PDFDesigner
        revize={revize}
        nastaveni={nastaveni}
        rozvadece={rozvadece}
        okruhy={okruhy}
        zavady={zavady}
        mistnosti={mistnosti}
        zarizeni={zarizeni}
        pouzitePristroje={pouzitePristroje}
        zakaznik={zakaznik}
        onExport={handleExport}
      />
    </div>
  );
}

export default PDFDesignerPage;
