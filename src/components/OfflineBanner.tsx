import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const OfflineBanner: React.FC = () => {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div className="w-full bg-yellow-400 text-black text-center py-2 fixed top-0 left-0 z-50 shadow">
      <strong>Jste offline.</strong> Některé funkce nemusí být dostupné. Data budou synchronizována po obnovení připojení.
    </div>
  );
};

export default OfflineBanner;
