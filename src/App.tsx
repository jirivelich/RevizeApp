import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Layout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import {
  Dashboard,
  RevizePage,
  RevizeDetailPage,
  RozvadecDetailPage,
  ZavadyPage,
  PlanovaniPage,
  NastaveniPage,
  SablonyPage,
  PristrojePage,
  FirmyPage,
  BackupRestorePage,
  ZakazniciPage,
  PDFDesignerPage,
} from './pages';

// Error Boundary pro zachycení JavaScript chyb
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Něco se pokazilo</h1>
            <p className="text-slate-600 mb-4">
              {this.state.error?.message || 'Neočekávaná chyba aplikace'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
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
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
            <Route path="sablony" element={<SablonyPage />} />
            <Route path="pdf-designer" element={<PDFDesignerPage />} />
            <Route path="backup" element={<BackupRestorePage />} />
            <Route path="nastaveni" element={<NastaveniPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
