import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui';
import { revizeService, zakazkaService, zavadaService } from '../services/database';
import type { Revize, Zakazka, Zavada } from '../types';

interface DashboardStats {
  celkemRevizi: number;
  rozpracovanoRevizi: number;
  celkemZavad: number;
  otevrenychZavad: number;
  planovaneZakazky: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    celkemRevizi: 0,
    rozpracovanoRevizi: 0,
    celkemZavad: 0,
    otevrenychZavad: 0,
    planovaneZakazky: 0,
  });
  const [recentRevize, setRecentRevize] = useState<Revize[]>([]);
  const [upcomingZakazky, setUpcomingZakazky] = useState<Zakazka[]>([]);
  const [openZavady, setOpenZavady] = useState<Zavada[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const revize = await revizeService.getAll();
    const zavady = await zavadaService.getAll();
    const zakazky = await zakazkaService.getAll();

    setStats({
      celkemRevizi: revize.length,
      rozpracovanoRevizi: revize.filter(r => r.stav === 'rozpracováno').length,
      celkemZavad: zavady.length,
      otevrenychZavad: zavady.filter(z => z.stav === 'otevřená').length,
      planovaneZakazky: zakazky.filter(z => z.stav === 'plánováno').length,
    });

    setRecentRevize(revize.slice(-5).reverse());
    setUpcomingZakazky(zakazky.filter(z => z.stav === 'plánováno').slice(0, 5));
    setOpenZavady(zavady.filter(z => z.stav === 'otevřená').slice(0, 5));
  };

  const StatCard = ({ title, value, icon, color, link }: { 
    title: string; 
    value: number; 
    icon: string;
    color: string;
    link: string;
  }) => (
    <Link to={link} className="block">
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center text-2xl`}>
            {icon}
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500">Přehled elektrotechnických revizí</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Celkem revizí"
          value={stats.celkemRevizi}
          icon="📋"
          color="bg-blue-100"
          link="/revize"
        />
        <StatCard
          title="Rozpracováno"
          value={stats.rozpracovanoRevizi}
          icon="✏️"
          color="bg-amber-100"
          link="/revize"
        />
        <StatCard
          title="Otevřené závady"
          value={stats.otevrenychZavad}
          icon="⚠️"
          color="bg-red-100"
          link="/zavady"
        />
        <StatCard
          title="Plánované zakázky"
          value={stats.planovaneZakazky}
          icon="📅"
          color="bg-green-100"
          link="/planovani"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Poslední revize">
          {recentRevize.length > 0 ? (
            <div className="space-y-3">
              {recentRevize.map((revize) => (
                <Link
                  key={revize.id}
                  to={`/revize/${revize.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <p className="font-medium">{revize.nazev}</p>
                    <p className="text-sm text-slate-500">{revize.cisloRevize}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    revize.stav === 'dokončeno' ? 'bg-green-100 text-green-700' :
                    revize.stav === 'rozpracováno' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {revize.stav}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">
              Zatím nemáte žádné revize. 
              <Link to="/revize" className="text-blue-600 hover:underline ml-1">
                Vytvořit první revizi
              </Link>
            </p>
          )}
        </Card>

        <Card title="Nadcházející zakázky">
          {upcomingZakazky.length > 0 ? (
            <div className="space-y-3">
              {upcomingZakazky.map((zakazka) => (
                <Link
                  key={zakazka.id}
                  to={`/planovani/${zakazka.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <p className="font-medium">{zakazka.nazev}</p>
                    <p className="text-sm text-slate-500">{zakazka.klient}</p>
                  </div>
                  <span className="text-sm text-slate-600">
                    {new Date(zakazka.datumPlanovany).toLocaleDateString('cs-CZ')}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">
              Žádné plánované zakázky.
              <Link to="/planovani" className="text-blue-600 hover:underline ml-1">
                Naplánovat zakázku
              </Link>
            </p>
          )}
        </Card>
      </div>

      {openZavady.length > 0 && (
        <Card title="Otevřené závady">
          <div className="space-y-3">
            {openZavady.map((zavada) => (
              <div
                key={zavada.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
              >
                <div>
                  <p className="font-medium">{zavada.popis}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(zavada.datumZjisteni).toLocaleDateString('cs-CZ')}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  zavada.zavaznost === 'C1' ? 'bg-red-100 text-red-700' :
                  zavada.zavaznost === 'C2' ? 'bg-orange-100 text-orange-700' :
                  zavada.zavaznost === 'C3' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {zavada.zavaznost}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
