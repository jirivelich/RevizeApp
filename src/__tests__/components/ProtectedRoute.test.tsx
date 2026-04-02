/**
 * Test 6: ProtectedRoute component
 * Ověřuje redirect bez tokenu, loading stav, úspěšnou verifikaci.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';

vi.stubEnv('VITE_API_URL', '/api');

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn();
  localStorage.clear();
});

function renderWithRouter(children: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/protected"
          element={<ProtectedRoute>{children}</ProtectedRoute>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('should show loading spinner initially', () => {
    localStorage.setItem('token', 'valid-token');
    // Never resolves the fetch, so stays in loading
    (global.fetch as Mock).mockReturnValueOnce(new Promise(() => {}));

    renderWithRouter(<div>Secret Content</div>);

    expect(screen.getByText('Ověřování přihlášení...')).toBeInTheDocument();
  });

  it('should redirect to /login when no token', async () => {
    // No token in localStorage
    renderWithRouter(<div>Secret Content</div>);

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('should render children when token is valid', async () => {
    localStorage.setItem('token', 'valid-token');
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ valid: true, user: { id: 1 } }),
    });

    renderWithRouter(<div>Secret Content</div>);

    await waitFor(() => {
      expect(screen.getByText('Secret Content')).toBeInTheDocument();
    });
  });

  it('should redirect to /login when token verification fails', async () => {
    localStorage.setItem('token', 'invalid-token');
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Invalid token' }),
    });

    renderWithRouter(<div>Secret Content</div>);

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('should trust cached token on network error (offline-friendly)', async () => {
    localStorage.setItem('token', 'valid-token');
    (global.fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

    renderWithRouter(<div>Secret Content</div>);

    await waitFor(() => {
      expect(screen.getByText('Secret Content')).toBeInTheDocument();
    });
  });

  it('should call verify endpoint with correct headers', async () => {
    localStorage.setItem('token', 'my-jwt-token');
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ valid: true }),
    });

    renderWithRouter(<div>Content</div>);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/verify'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer my-jwt-token',
          }),
        }),
      );
    });
  });
});
