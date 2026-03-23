'use client';
import { useEffect, useState } from 'react';
import { getSession, AppSession } from '@/lib/auth';
import { reinitializeStore } from '@/lib/store';
import DashboardShell from '@/components/layout/DashboardShell';
import LandingPage from '@/components/auth/LandingPage';

export default function Home() {
  const [session, setSession] = useState<AppSession | null | 'loading'>('loading');

  useEffect(() => {
    setSession(getSession());
  }, []);

  // Loading screen — avoids flash of wrong content
  if (session === 'loading') {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)',
      }}>
        <div className="spinner" style={{ width: '24px', height: '24px' }} />
      </div>
    );
  }

  if (!session) {
    return (
      <LandingPage
        onSuccess={(s) => {
          reinitializeStore();
          setSession(s);
        }}
      />
    );
  }

  return (
    <DashboardShell
      onLogout={() => {
        reinitializeStore();
        setSession(null);
      }}
    />
  );
}
