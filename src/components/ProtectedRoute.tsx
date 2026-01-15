import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      console.log('ProtectedRoute: Checking token...', token ? 'Found' : 'Not found');

      if (!token) {
        console.log('ProtectedRoute: No token found, redirecting to login');
        setIsAuthorized(false);
        return;
      }

      try {
        // V produkci používáme relativní URL
        const API_BASE = import.meta.env.VITE_API_URL || '/api';
        const verifyUrl = `${API_BASE}/auth/verify`;
        console.log('ProtectedRoute: Verifying token at', verifyUrl);
        
        const response = await fetch(verifyUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('ProtectedRoute: Verify response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('ProtectedRoute: Verification failed:', response.status, errorData);
          setError(`Ověření selhalo: ${response.status}`);
          setIsAuthorized(false);
          return;
        }

        await response.json();
        console.log('ProtectedRoute: Verification successful');
        setIsAuthorized(true);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('ProtectedRoute: Verification error:', errorMsg);
        setError(`Chyba: ${errorMsg}`);
        setIsAuthorized(false);
      }
    };

    verifyToken();
  }, []);

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ověřování přihlášení...</p>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    console.log('ProtectedRoute: Authorization failed, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute: Authorization successful, rendering children');
  return <>{children}</>;
}
