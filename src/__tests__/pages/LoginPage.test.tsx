/**
 * Test 7: LoginPage
 * Ověřuje přihlašovací formulář, přepínání login/register, error handling.
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
    expect(screen.getByText('RevizeApp')).toBeInTheDocument();
    expect(screen.getByText('Přihlášení')).toBeInTheDocument();
  });

  it('should have username and password fields', () => {
    renderLoginPage();
    expect(screen.getByPlaceholderText(/uživatelské jméno/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/heslo/i)).toBeInTheDocument();
  });

  it('should switch to register mode', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    // Click the register tab
    const registerTab = screen.getByText('Registrace');
    await user.click(registerTab);

    // Should show additional fields (email, jméno)
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  it('should submit login and navigate on success', async () => {
    const user = userEvent.setup();
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'jwt-123', user: { id: 1, username: 'admin' } }),
    });

    renderLoginPage();

    await user.type(screen.getByPlaceholderText(/uživatelské jméno/i), 'admin');
    await user.type(screen.getByPlaceholderText(/heslo/i), 'heslo123');
    await user.click(screen.getByRole('button', { name: /přihlásit/i }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('jwt-123');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should show error on login failure', async () => {
    const user = userEvent.setup();
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Nesprávné heslo' }),
    });

    renderLoginPage();

    await user.type(screen.getByPlaceholderText(/uživatelské jméno/i), 'admin');
    await user.type(screen.getByPlaceholderText(/heslo/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /přihlásit/i }));

    await waitFor(() => {
      expect(screen.getByText('Nesprávné heslo')).toBeInTheDocument();
    });
  });

  it('should show error on network failure', async () => {
    const user = userEvent.setup();
    (global.fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

    renderLoginPage();

    await user.type(screen.getByPlaceholderText(/uživatelské jméno/i), 'admin');
    await user.type(screen.getByPlaceholderText(/heslo/i), 'heslo');
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

    await user.type(screen.getByPlaceholderText(/uživatelské jméno/i), 'testuser');
    await user.type(screen.getByPlaceholderText(/heslo/i), 'pass');
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
