import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const OfflineBanner: React.FC = () => {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      className="w-full flex gap-3 bg-[var(--surface)] text-[var(--warning-text)] border-b border-[var(--warning)] border-l-[3px] border-l-[var(--warning)] text-sm py-2 px-4 fixed top-0 left-0 z-[60]"
    >
      <span><strong>Jste offline.</strong> Některé funkce nemusí být dostupné. Data budou synchronizována po obnovení připojení.</span>
    </div>
  );
};

export default OfflineBanner;
