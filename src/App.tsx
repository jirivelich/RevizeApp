import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Component, useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import OfflineBanner from './components/OfflineBanner';
import {
  Dashboard,
  RevizePage,
  RevizeDetailPage,
  RozvadecDetailPage,
  ZavadyPage,
  PlanovaniPage,
  NastaveniPage,
  PristrojePage,
  FirmyPage,
  ZakazniciPage,
  NahledRouter,
} from './pages';
import { useOfflineQueueSync } from './hooks/useOfflineQueue';
import { ThemeProvider } from './context/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30s – data se považují za čerstvá
      gcTime: 5 * 60 * 1000,       // 5 min – garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Něco se pokazilo</h1>
            <p className="text-[var(--text-secondary)] mb-4">
              {this.state.error?.message || 'Neočekávaná chyba aplikace'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primary-hover)]"
            >
              Zpět na úvodní stránku
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const { sync } = useOfflineQueueSync();

  useEffect(() => {
    // Sync pending requests on mount (if any remain from previous session)
    if (navigator.onLine) {
      sync().then(({ syncedCount }) => {
        if (syncedCount > 0) queryClient.refetchQueries({ type: 'active' });
      });
    }

    // Sync pending requests whenever we come back online
    const handleOnline = () => {
      sync().then(({ syncedCount }) => {
        if (syncedCount > 0) queryClient.refetchQueries({ type: 'active' });
      });
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [sync]);

  return (
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <OfflineBanner />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/revize/:id/nahled" element={
              <ProtectedRoute>
                <NahledRouter />
              </ProtectedRoute>
            } />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="revize" element={<RevizePage />} />
              <Route path="revize/:id" element={<RevizeDetailPage />} />
              <Route path="revize/:revizeId/rozvadec/:id" element={<RozvadecDetailPage />} />
              <Route path="zavady" element={<ZavadyPage />} />
              <Route path="pristroje" element={<PristrojePage />} />
              <Route path="firmy" element={<FirmyPage />} />
              <Route path="zakaznici" element={<ZakazniciPage />} />
              <Route path="planovani" element={<PlanovaniPage />} />
              <Route path="nastaveni" element={<NastaveniPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
