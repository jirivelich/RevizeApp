import { Outlet, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { AIChatAssistant } from './AIChatAssistant';
import { useIdleTimeout } from '../hooks/useIdleTimeout';
import { IdleWarningModal } from './IdleWarningModal';
import { logoutApi } from '../services/api';

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    await logoutApi();
    navigate('/login');
  }, [navigate]);

  const { showWarning, remainingSeconds, resetTimer } = useIdleTimeout({ onLogout: handleLogout });

  return (
    <div className="min-h-screen">
      {/* Mobilní overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - vždy fixní */}
      <div className={`fixed top-0 left-0 h-full z-50 transition-transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>
      
      {/* Main content - s paddingem pro sidebar na velkých obrazovkách */}
      <main className="lg:ml-56 h-screen flex flex-col" style={{ background: 'var(--bg-page)' }}>
        {/* Mobilní header s menu tlačítkem */}
        <div className="lg:hidden px-4 py-3 flex items-center justify-between sticky top-0 z-30 flex-shrink-0" style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-table)' }}>
          <h1 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>RevizeApp</h1>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg"
            style={{ color: '#475569' }}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <div className="p-4 sm:p-6 flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
      <AIChatAssistant />
      {showWarning && (
        <IdleWarningModal
          remainingSeconds={remainingSeconds}
          onStay={resetTimer}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
