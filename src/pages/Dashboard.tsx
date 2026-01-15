import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui';
import { revizeService, zakazkaService, pristrojService } from '../services/database';
import type { Revize, Zakazka, MericiPristroj } from '../types';

interface DashboardStats {
  celkemRevizi: number;
  rozpracovanoRevizi: number;
  pristrojeKRekalibraci: number;
  planovaneZakazky: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    celkemRevizi: 0,
    rozpracovanoRevizi: 0,
    pristrojeKRekalibraci: 0,
    planovaneZakazky: 0,
  });
  const [recentRevize, setRecentRevize] = useState<Revize[]>([]);
  const [upcomingZakazky, setUpcomingZakazky] = useState<Zakazka[]>([]);
  const [expiringPristroje, setExpiringPristroje] = useState<MericiPristroj[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const revize = await revizeService.getAll();
    const pristroje = await pristrojService.getAll();
    const zakazky = await zakazkaService.getAll();

    // Přístroje s kalibrací končící do 30 dní nebo již prošlou
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);
    
    const expiringOrExpired = pristroje.filter(p => {
      if (!p.platnostKalibrace) return false;
      const expDate = new Date(p.platnostKalibrace);
      return expDate <= in30Days;
    });

    setStats({
      celkemRevizi: revize.length,
      rozpracovanoRevizi: revize.filter(r => r.stav === 'rozpracováno').length,
      pristrojeKRekalibraci: expiringOrExpired.length,
      planovaneZakazky: zakazky.filter(z => z.stav === 'plánováno').length,
    });

    setRecentRevize(revize.slice(-5).reverse());
    setUpcomingZakazky(zakazky.filter(z => z.stav === 'plánováno').slice(0, 5));
    setExpiringPristroje(expiringOrExpired.slice(0, 5));
  };

  const StatCard = ({ title, value, icon, color, link }: { 
    title: string; 
    value: number; 
    icon: string;
    color: string;
    link: string;
  }) => (
    <Link to={link} className="block">
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 hover:shadow-md transition-shadow`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs sm:text-sm">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${color} flex items-center justify-center text-xl sm:text-2xl`}>
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

      {/* Statistiky - 2 sloupce na mobilu, 4 na desktopu */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          title="K rekalibraci"
          value={stats.pristrojeKRekalibraci}
          icon="🔧"
          color="bg-orange-100"
          link="/pristroje"
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

      {expiringPristroje.length > 0 && (
        <Card title="Přístroje k rekalibraci">
          <div className="space-y-3">
            {expiringPristroje.map((pristroj) => (
              <Link
                key={pristroj.id}
                to="/pristroje"
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div>
                  <p className="font-medium">{pristroj.nazev}</p>
                  <p className="text-sm text-slate-500">
                    {pristroj.vyrobce} {pristroj.model}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  new Date(pristroj.platnostKalibrace) < new Date() 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {new Date(pristroj.platnostKalibrace).toLocaleDateString('cs-CZ')}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
