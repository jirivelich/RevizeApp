/**
 * Test 7: LoginPage
 * Ověřuje přihlašovací formulář, zobrazení hesla, zapamatování jména a chyby.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../pages/LoginPage';

vi.stubEnv('VITE_API_URL', '/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn();
  localStorage.clear();
  mockNavigate.mockClear();
});

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  it('should render login form by default', () => {
    renderLoginPage();
    expect(screen.getAllByText('Veli').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Přihlášení' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /přihlásit se/i })).toBeInTheDocument();
  });

  it('should have username and password fields', () => {
    renderLoginPage();
    expect(screen.getByLabelText('Uživatelské jméno')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Heslo')).toHaveAttribute('type', 'password');
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await user.click(screen.getByRole('button', { name: 'Zobrazit heslo' }));
    expect(screen.getByLabelText('Heslo')).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Skrýt heslo' }));
    expect(screen.getByLabelText('Heslo')).toHaveAttribute('type', 'password');
  });

  it('should prefill last successful username', () => {
    localStorage.setItem('reveli_posledni_jmeno', 'jiri');
    renderLoginPage();
    expect(screen.getByLabelText('Uživatelské jméno')).toHaveValue('jiri');
  });

  it('should submit login and navigate on success', async () => {
    const user = userEvent.setup();
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'jwt-123', user: { id: 1, username: 'admin' } }),
    });

    renderLoginPage();

    await user.type(screen.getByLabelText('Uživatelské jméno'), 'admin');
    await user.type(screen.getByLabelText('Heslo'), 'heslo123');
    await user.click(screen.getByRole('button', { name: /přihlásit/i }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('jwt-123');
      expect(mockNavigate).toHaveBeenCalledWith('/');
      expect(localStorage.getItem('reveli_posledni_jmeno')).toBe('admin');
    });
  });

  it('should show error on login failure', async () => {
    const user = userEvent.setup();
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Nesprávné heslo' }),
    });

    renderLoginPage();

    await user.type(screen.getByLabelText('Uživatelské jméno'), 'admin');
    await user.type(screen.getByLabelText('Heslo'), 'wrong');
    await user.click(screen.getByRole('button', { name: /přihlásit/i }));

    await waitFor(() => {
      expect(screen.getByText('Nesprávné heslo')).toBeInTheDocument();
    });
  });

  it('should show error on network failure', async () => {
    const user = userEvent.setup();
    (global.fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

    renderLoginPage();

    await user.type(screen.getByLabelText('Uživatelské jméno'), 'admin');
    await user.type(screen.getByLabelText('Heslo'), 'heslo');
    await user.click(screen.getByRole('button', { name: /přihlásit/i }));

    await waitFor(() => {
      expect(screen.getByText('Chyba připojení k serveru')).toBeInTheDocument();
    });
  });

  it('should send correct payload on login', async () => {
    const user = userEvent.setup();
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'x', user: {} }),
    });

    renderLoginPage();

    await user.type(screen.getByLabelText('Uživatelské jméno'), 'testuser');
    await user.type(screen.getByLabelText('Heslo'), 'pass');
    await user.click(screen.getByRole('button', { name: /přihlásit/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'testuser', password: 'pass' }),
        }),
      );
    });
  });
});
