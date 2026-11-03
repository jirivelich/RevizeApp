import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { buildApiUrl, getAuthHeaders } from '../services/httpClient';
import { Modal, Input, Button } from './ui';
import { Icon } from './icons';

interface ZmenaHeslaModalProps {
  onClose: () => void;
}

export default function ZmenaHeslaModal({ onClose }: ZmenaHeslaModalProps) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.newPassword.length < 8) {
      setError('Nové heslo musí mít alespoň 8 znaků');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Nová hesla se neshodují');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/auth/change-password'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Chyba při změně hesla');
      } else {
        setSuccess(true);
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch {
      setError('Chyba připojení k serveru');
    } finally {
      setLoading(false);
    }
  };

  const footer = success ? (
    <Button onClick={onClose}>Zavřít</Button>
  ) : (
    <>
      <Button variant="secondary" onClick={onClose}>Zrušit</Button>
      <Button type="submit" form="zmena-hesla-form" disabled={loading}>
        <Icon name="check" size={16} className="mr-1.5" />
        {loading ? 'Ukládám...' : 'Změnit heslo'}
      </Button>
    </>
  );

  return createPortal(
    <Modal isOpen onClose={onClose} title="Změna hesla" size="sm" footer={footer}>
      {success ? (
        <div role="status" className="flex flex-col items-center gap-2 py-3 text-[var(--success-text)]">
          <Icon name="checkCircle" size={32} />
          <div className="text-sm font-semibold">Heslo bylo úspěšně změněno</div>
        </div>
      ) : (
        <form id="zmena-hesla-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <p className="text-xs text-[var(--text-muted)]">Zadejte aktuální a nové heslo</p>
          <Input
            type="password" name="currentPassword" label="Aktuální heslo"
            value={form.currentPassword} onChange={handleChange} required
            placeholder="••••••••" autoComplete="current-password"
          />
          <Input
            type="password" name="newPassword" label="Nové heslo (min. 8 znaků)"
            value={form.newPassword} onChange={handleChange} required
            placeholder="••••••••" autoComplete="new-password"
          />
          <Input
            type="password" name="confirmPassword" label="Potvrzení nového hesla"
            value={form.confirmPassword} onChange={handleChange} required
            placeholder="••••••••" autoComplete="new-password"
          />
          {error && (
            <div role="alert" className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--danger)]/30 border-l-[3px] border-l-[var(--danger)] bg-[var(--danger-bg)] text-[var(--danger-text)] text-[13px]">
              {error}
            </div>
          )}
        </form>
      )}
    </Modal>,
    document.body
  );
}
