// PDFDesignerPage - stránka pro vizuální návrh PDF šablon
import { useState, useEffect } from 'react';
import { PDFDesigner } from '../components/PDFDesigner';
import { revizeApi, nastaveniApi } from '../services/api';
import type { Revize, Nastaveni, Rozvadec, Okruh, Zavada, Mistnost, Zarizeni, MericiPristroj, Zakaznik } from '../types';
import type { DesignerTemplate } from '../components/PDFDesigner';

// Helper pro autentizovaný fetch
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function authFetch<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (response.ok) {
      return await response.json();
    }
    console.error(`Fetch ${url} failed:`, response.status);
    return null;
  } catch (e) {
    console.error(`Fetch ${url} error:`, e);
    return null;
  }
}

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

  // Načíst data pro náhled
  useEffect(() => {
    const loadData = async () => {
      try {
        // Načíst poslední revizi pro náhled
        console.log('🔄 Načítám revize z API s autentizací...');
        const revizeData = await revizeApi.getAll() as Revize[];
        console.log('📋 Načteno revizí:', revizeData.length, revizeData);
        
        if (revizeData.length > 0) {
          // Načíst detail první revize
          const revizeId = revizeData[0].id;
          const revizeDetail = await revizeApi.getById(String(revizeId)) as Revize;
          console.log('✅ Načtena revize:', revizeDetail);
          setRevize(revizeDetail);
          
          // Načíst zákazníka pokud existuje
          if (revizeDetail.zakaznikId) {
            const zakaznikData = await authFetch<Zakaznik>(`/api/zakaznici/${revizeDetail.zakaznikId}`);
            if (zakaznikData) setZakaznik(zakaznikData);
          }
          
          // Načíst rozvaděče
          const rozvadeceData = await authFetch<Rozvadec[]>(`/api/revize/${revizeId}/rozvadece`);
          if (rozvadeceData) {
            setRozvadece(rozvadeceData);
            
            // Načíst okruhy pro každý rozvaděč
            const okruhyMap: Record<number, Okruh[]> = {};
            for (const rozvadec of rozvadeceData) {
              if (rozvadec.id) {
                const okruhyData = await authFetch<Okruh[]>(`/api/rozvadece/${rozvadec.id}/okruhy`);
                if (okruhyData) okruhyMap[rozvadec.id] = okruhyData;
              }
            }
            setOkruhy(okruhyMap);
          }
          
          // Načíst závady
          const zavadyData = await authFetch<Zavada[]>(`/api/revize/${revizeId}/zavady`);
          if (zavadyData) setZavady(zavadyData);
          
          // Načíst místnosti a zařízení
          const mistnostiData = await authFetch<Mistnost[]>(`/api/revize/${revizeId}/mistnosti`);
          if (mistnostiData) {
            setMistnosti(mistnostiData);
            
            // Načíst zařízení pro každou místnost
            const zarizeniMap: Record<number, Zarizeni[]> = {};
            for (const mistnost of mistnostiData) {
              if (mistnost.id) {
                const zarizeniData = await authFetch<Zarizeni[]>(`/api/mistnosti/${mistnost.id}/zarizeni`);
                if (zarizeniData) zarizeniMap[mistnost.id] = zarizeniData;
              }
            }
            setZarizeni(zarizeniMap);
          }
          
          // Načíst použité měřicí přístroje
          if (revizeDetail.pouzitePristroje) {
            const pristrojeIds = revizeDetail.pouzitePristroje.split(',').map((id: string) => id.trim());
            const allPristroje = await authFetch<MericiPristroj[]>('/api/pristroje');
            if (allPristroje) {
              const usedPristroje = allPristroje.filter(p => 
                p.id && pristrojeIds.includes(p.id.toString())
              );
              setPouzitePristroje(usedPristroje);
            }
          }
        }

        // Načíst nastavení
        const nastaveniData = await nastaveniApi.get() as Nastaveni;
        if (nastaveniData) setNastaveni(nastaveniData);
        
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
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Info panel o načtených datech */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="font-medium text-blue-800">Náhled dat:</span>
          {revize ? (
            <span className="text-blue-600">
              📋 Revize č. {revize.cisloRevize || revize.id} - {revize.nazev || 'bez názvu'}
              {zakaznik && ` | 👤 ${zakaznik.nazev}`}
              {rozvadece.length > 0 && ` | 🔌 ${rozvadece.length} rozvaděčů`}
              {zavady.length > 0 && ` | ⚠️ ${zavady.length} závad`}
            </span>
          ) : (
            <span className="text-red-600">❌ Žádná revize nenačtena</span>
          )}
        </div>
      </div>
      <div className="flex-1">
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
    </div>
  );
}

export default PDFDesignerPage;
