import { Link, useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/revize', label: 'Revize', icon: '📋' },
  { path: '/zavady', label: 'Závady', icon: '⚠️' },
  { path: '/pristroje', label: 'Přístroje', icon: '📟' },
  { path: '/firmy', label: 'Firmy', icon: '🏢' },
  { path: '/zakaznici', label: 'Zákazníci', icon: '👥' },
  { path: '/planovani', label: 'Plánování', icon: '📅' },
  { path: '/sablony', label: 'Šablony PDF', icon: '🎨' },
  { path: '/pdf-designer', label: 'PDF Designer', icon: '✏️' },
  { path: '/backup', label: 'Backup', icon: '💾' },
  { path: '/nastaveni', label: 'Nastavení', icon: '⚙️' },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;

  return (
    <aside className="w-64 bg-slate-800 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span>⚡</span>
            <span>RevizeApp</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Správa elektro revizí</p>
        </div>
        {/* Tlačítko pro zavření menu na mobilu */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-slate-700 rounded"
          aria-label="Zavřít menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="border-t border-slate-700 p-4 space-y-3">
        {user && (
          <div className="text-slate-300 text-sm">
            <p className="font-semibold">{user.username}</p>
            <p className="text-slate-400 text-xs">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          Odhlásit se
        </button>
        <p className="text-slate-400 text-xs text-center">© 2026 RevizeApp v1.0.0</p>
      </div>
    </aside>
  );
}
