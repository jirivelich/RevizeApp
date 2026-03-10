import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    jmeno: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // V produkci používáme relativní URL (frontend i backend na stejném serveru)
      const API_BASE = import.meta.env.VITE_API_URL || '/api';
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { username: formData.username, password: formData.password }
        : formData;

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Chyba při ověřování');
        setLoading(false);
        return;
      }

      // Uložit token
      console.log('LoginPage: Login successful, saving token');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Přesměrovat na dashboard
      console.log('LoginPage: Navigating to dashboard');
      navigate('/');
    } catch (err) {
      setError('Chyba připojení k serveru');
      console.error('Login error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8 text-slate-800">RevizeApp</h1>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setIsLogin(true);
              setError('');
              setFormData({ username: '', password: '', email: '', jmeno: '' });
            }}
            className={`flex-1 py-2 px-4 rounded text-sm font-medium transition ${
              isLogin
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Přihlášení
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError('');
              setFormData({ username: '', password: '', email: '', jmeno: '' });
            }}
            className={`flex-1 py-2 px-4 rounded text-sm font-medium transition ${
              !isLogin
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Registrace
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Jméno
              </label>
              <input
                type="text"
                name="jmeno"
                value={formData.jmeno}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                placeholder="Vaše jméno"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Uživatelské jméno
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
              placeholder="Vaše uživatelské jméno"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                placeholder="Váš email"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Heslo
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
              placeholder="Vaše heslo"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 text-sm"
          >
            {loading ? 'Čekání...' : (isLogin ? 'Přihlásit se' : 'Registrovat se')}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          {isLogin ? 'Nemáte účet?' : 'Již máte účet?'}{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setFormData({ username: '', password: '', email: '', jmeno: '' });
            }}
            className="text-slate-700 hover:text-slate-900 font-medium"
          >
            {isLogin ? 'Registrujte se' : 'Přihlaste se'}
          </button>
        </p>
      </div>
    </div>
  );
}
