'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, signOut } = useAuth();

  const showAuthModal = () => {
    if ((window as any).__openAuthModal) {
      (window as any).__openAuthModal();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <Image
                  src="/recursive-logo.svg"
                  alt="Recursive.eco"
                  width={60}
                  height={60}
                  className="h-12 w-auto"
                />
              </Link>

              <nav className="hidden md:flex space-x-6 items-center">
                {/* Channels Dropdown */}
                <div className="relative">
                  <button
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                  >
                    Channels
                    <svg className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
                      <a href="https://channels.recursive.eco/" className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">Wellness</div>
                            <div className="text-xs text-gray-500">Mental health & wellness tools</div>
                          </div>
                        </div>
                      </a>
                      <a href="https://channels.recursive.eco/channels/kids-stories" className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">Community Kids Stories</div>
                            <div className="text-xs text-gray-500">Parent-created stories for children</div>
                          </div>
                        </div>
                      </a>
                      <a href="https://channels.recursive.eco/channels/resources" className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">Resources for Parents</div>
                            <div className="text-xs text-gray-500">Curated parenting content</div>
                          </div>
                        </div>
                      </a>
                    </div>
                  )}
                </div>

                <a href="https://www.recursive.eco/pages/courses/index.html" className="text-gray-600 hover:text-gray-900 font-medium">Courses</a>
                <a href="https://www.recursive.eco/pages/studies.html" className="text-gray-600 hover:text-gray-900 font-medium">Studies</a>
                <a href="https://www.recursive.eco/pages/about.html" className="text-gray-600 hover:text-gray-900 font-medium">About</a>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {user ? (
                <div className="hidden sm:flex items-center space-x-4">
                  <Link
                    href="/dashboard"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Dashboard
                  </Link>
                  <span className="text-sm text-gray-600">Welcome, {user.email}</span>
                  <button
                    onClick={signOut}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={showAuthModal}
                  className="hidden sm:inline-block text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </button>
              )}

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 text-gray-600 hover:text-gray-900"
                aria-label="Open menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu panel */}
          {mobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
                {/* Channels Section */}
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Channels
                </div>
                <a href="https://channels.recursive.eco/" className="block pl-6 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  Wellness
                </a>
                <a href="https://channels.recursive.eco/channels/kids-stories" className="block pl-6 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  Community Kids Stories
                </a>
                <a href="https://channels.recursive.eco/channels/resources" className="block pl-6 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  Resources for Parents
                </a>

                {/* Divider */}
                <div className="border-t border-gray-200 my-2"></div>

                <a href="https://www.recursive.eco/pages/courses/index.html" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  Courses
                </a>
                <a href="https://www.recursive.eco/pages/studies.html" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  Studies
                </a>
                <a href="https://www.recursive.eco/pages/about.html" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  About
                </a>

                {/* Auth buttons in mobile menu */}
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:text-blue-800 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      showAuthModal();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
  );
}
