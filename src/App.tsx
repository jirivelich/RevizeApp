import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
} from './pages';

function App() {
  return (
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
          <Route path="planovani" element={<PlanovaniPage />} />
          <Route path="sablony" element={<SablonyPage />} />
          <Route path="backup" element={<BackupRestorePage />} />
          <Route path="nastaveni" element={<NastaveniPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
