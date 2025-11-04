'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // Initialize spiral after component mounts and script loads
    const initSpiral = () => {
      if (typeof window !== 'undefined' && (window as any).createSpiral) {
        const container = document.getElementById('header-logo-container');
        if (container) {
          (window as any).createSpiral(container, {
            size: 100,
            turns: 6,
            color: '#9333ea',
            strokeWidth: 0.8,
            opacity: 0.8,
            animated: true
          });
        }
      }
    };

    // Try immediately, then retry after short delay
    initSpiral();
    const timer = setTimeout(initSpiral, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Load spiral.js */}
      <Script
        src="/spiral/spiral.js"
        strategy="afterInteractive"
        onLoad={() => {
          // Reinitialize when script loads
          if (typeof window !== 'undefined' && (window as any).createSpiral) {
            const container = document.getElementById('header-logo-container');
            if (container) {
              (window as any).createSpiral(container, {
                size: 100,
                turns: 6,
                color: '#9333ea',
                strokeWidth: 0.8,
                opacity: 0.8,
                animated: true
              });
            }
          }
        }}
      />

      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <Link href="/" className="flex items-center space-x-2">
                  <div id="header-logo-container" className="h-20 w-20">
                    {/* Animated spiral logo will be inserted here by JavaScript */}
                  </div>
                </Link>
              </div>

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
              <a
                href="https://buy.stripe.com/fZu9AS2IZdeS58tfoa9ws00"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Donate
              </a>

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
                <a
                  href="https://buy.stripe.com/fZu9AS2IZdeS58tfoa9ws00"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 rounded-md text-base font-medium bg-gradient-to-r from-pink-500 to-purple-600 text-white text-center">
                  ❤️ Donate
                </a>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
