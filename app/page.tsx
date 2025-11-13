'use client';

import { useAuth } from '@/components/AuthProvider';
import { PageModals } from '@/components/PageModals';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && user) {
      router.push('/dashboard');
    } else if (status === 'unauthenticated') {
      setShowAuthModal(true);
    }
  }, [status, user, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null; // Redirecting to dashboard
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Recursive Creator
            </h1>
            <p className="text-lg text-gray-400">
              Story publisher • Playlist wrapper • Creator hub
            </p>
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              Part of the Recursive.eco ecosystem
            </p>
          </div>
        </div>
      </div>

      <PageModals />
    </>
  );
}
