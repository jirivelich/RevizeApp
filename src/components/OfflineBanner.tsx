import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const OfflineBanner: React.FC = () => {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div role="status" className="w-full bg-[var(--warning)] text-black text-center text-sm py-2 px-4 fixed top-0 left-0 z-[60] shadow-[var(--shadow-elevated)]">
      <strong>Jste offline.</strong> Některé funkce nemusí být dostupné. Data budou synchronizována po obnovení připojení.
    </div>
  );
};

export default OfflineBanner;
