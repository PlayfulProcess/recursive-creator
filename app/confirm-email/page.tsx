'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        {/* Icon */}
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
          Check Your Email
        </h1>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
          We've sent a 6-digit code to{' '}
          {email && <strong className="text-gray-900 dark:text-gray-100">{email}</strong>}
        </p>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 dark:text-blue-200 mb-2">
            <strong>How to sign in:</strong>
          </p>
          <ol className="text-xs text-blue-800 dark:text-blue-300 space-y-2 list-decimal list-inside">
            <li>Check your email for the 6-digit code</li>
            <li>Return to the sign-in page</li>
            <li>Enter your email and the code</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Sign In Page
          </Link>

          {email && (
            <Link
              href={`/auth/auth-code-error?email=${encodeURIComponent(email)}`}
              className="block w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center py-3 px-4 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Enter Code Directly
            </Link>
          )}
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
          Code not received? Check your spam folder.<br />
          Need help? Email <strong>pp@playfulprocess.com</strong>
        </p>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  );
}
