'use client';

import { useState } from 'react';
import { Header, Footer, DualAuth, useAuth, AuthProvider } from '@playful_process/components';

function TestContent() {
  const [showAuth, setShowAuth] = useState(false);
  const { user, status } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header from npm package */}
      <Header />

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">🧪 Testing npm Package Components</h1>

        <div className="space-y-6">
          {/* Auth Status Test */}
          <div className="border rounded-lg p-6 bg-white dark:bg-gray-800">
            <h2 className="text-2xl font-semibold mb-4">Auth Status (from useAuth hook)</h2>
            <div className="space-y-2">
              <p><strong>Status:</strong> {status}</p>
              <p><strong>User Email:</strong> {user?.email || 'Not signed in'}</p>
            </div>
          </div>

          {/* Auth Modal Test */}
          <div className="border rounded-lg p-6 bg-white dark:bg-gray-800">
            <h2 className="text-2xl font-semibold mb-4">DualAuth Modal Test</h2>
            <button
              onClick={() => setShowAuth(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Open Auth Modal
            </button>
          </div>

          {/* Package Info */}
          <div className="border rounded-lg p-6 bg-green-50 dark:bg-green-900/20">
            <h2 className="text-2xl font-semibold mb-4">✅ Package Info</h2>
            <p className="mb-2">
              <strong>Package:</strong> <code>@playful_process/components@1.0.1</code>
            </p>
            <p className="mb-2">
              <strong>Components Used:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Header (visible at top)</li>
              <li>Footer (visible at bottom)</li>
              <li>DualAuth (modal, click button to test)</li>
              <li>useAuth (hook, status shown above)</li>
            </ul>
          </div>

          {/* Success Indicators */}
          <div className="border rounded-lg p-6 bg-blue-50 dark:bg-blue-900/20">
            <h2 className="text-2xl font-semibold mb-4">✅ What Should Work</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Header should render with logo and navigation</li>
              <li>Footer should render at bottom</li>
              <li>Auth status should show "loading" → "authenticated" or "unauthenticated"</li>
              <li>Auth modal should open when clicking button</li>
              <li>Mobile menu should work (test on phone or narrow window)</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer from npm package */}
      <Footer />

      {/* Auth Modal */}
      <DualAuth isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}

// Wrap with AuthProvider from npm package
export default function TestComponentsPage() {
  return (
    <AuthProvider>
      <TestContent />
    </AuthProvider>
  );
}
