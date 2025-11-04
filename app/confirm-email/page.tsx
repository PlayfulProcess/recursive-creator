'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [manualOtp, setManualOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  const confirmationUrl = searchParams.get('confirmation_url');
  const email = searchParams.get('email');

  useEffect(() => {
    // If no confirmation URL or email, show error
    if (!confirmationUrl && !email) {
      setMessage({
        type: 'error',
        text: 'Invalid confirmation link. Please request a new one.',
      });
    }
  }, [confirmationUrl, email]);

  const handleMagicLinkConfirm = async () => {
    if (!confirmationUrl) return;

    setLoading(true);
    setMessage(null);

    try {
      // Call our API route to verify server-side
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation_url: confirmationUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Success! Redirect to app
      setMessage({
        type: 'success',
        text: 'Email confirmed! Redirecting...',
      });

      setTimeout(() => {
        router.push(data.redirect || '/dashboard');
      }, 1500);
    } catch (error: unknown) {
      console.error('Verification error:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to verify. Please try the OTP code instead.',
      });
      setShowOtpInput(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !manualOtp) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token: manualOtp,
          type: 'email',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      setMessage({
        type: 'success',
        text: 'Verified! Redirecting...',
      });

      setTimeout(() => {
        router.push(data.redirect || '/dashboard');
      }, 1500);
    } catch (error: unknown) {
      console.error('OTP verification error:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Invalid code. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

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
          Confirm Your Email
        </h1>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
          Click the button below to complete your sign in
        </p>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 dark:text-blue-200 mb-2">
            <strong>Why this extra step?</strong>
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-300">
            This page protects your sign-in from being scanned by corporate email security tools (like Microsoft SafeLinks).
            You must click the button below to complete verification.
          </p>
        </div>

        {/* Main Confirmation Button */}
        {confirmationUrl && !showOtpInput && (
          <button
            onClick={handleMagicLinkConfirm}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors mb-4"
          >
            {loading ? 'Verifying...' : 'Complete Sign In'}
          </button>
        )}

        {/* OTP Fallback */}
        {(showOtpInput || email) && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 text-center">
              Or enter the 6-digit code from your email:
            </p>
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <input
                type="text"
                value={manualOtp}
                onChange={(e) => setManualOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                pattern="\d{6}"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={loading || manualOtp.length !== 6}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm mt-4 ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700'
                : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Help Text */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
          Having trouble? Email us at <strong>pp@playfulprocess.com</strong>
        </p>
      </div>
    </div>
  );
}
