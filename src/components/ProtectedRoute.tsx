import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { verifySession } from '../services/httpClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    verifySession().then(setIsAuthorized);
  }, []);

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-[var(--border-input)] border-t-[var(--primary)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Ověřování přihlášení...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
