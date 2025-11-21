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
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              Recursive Creator
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Create and publish content sequences mixing images and videos
            </p>

            {/* Sign In CTA */}
            <div className="bg-gray-800 rounded-lg p-8 max-w-2xl mx-auto border border-gray-700">
              <h2 className="text-2xl font-semibold text-white mb-4">
                Get Started
              </h2>
              <p className="text-gray-400 mb-6">
                Sign in to start creating your own content sequences. Mix images and videos,
                add narration, and publish to share with the community.
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg shadow-lg"
              >
                ✨ Sign In to Create
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-3xl mb-3">📸</div>
                <h3 className="text-lg font-semibold text-white mb-2">Mix Media</h3>
                <p className="text-sm text-gray-400">
                  Combine images and videos from Google Drive or YouTube
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-3xl mb-3">🎨</div>
                <h3 className="text-lg font-semibold text-white mb-2">Live Preview</h3>
                <p className="text-sm text-gray-400">
                  See exactly how your content will look while creating
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-3xl mb-3">🌐</div>
                <h3 className="text-lg font-semibold text-white mb-2">Publish & Share</h3>
                <p className="text-sm text-gray-400">
                  Get a public link and submit to community channels
                </p>
              </div>
            </div>
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
