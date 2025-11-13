'use client';

import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/recursive-logo.svg"
              alt="Recursive.eco"
              width={100}
              height={100}
              className="h-24 w-auto opacity-60"
            />
          </div>

          <div className="bg-amber-800 text-amber-200 p-4 rounded-lg mb-6 max-w-2xl mx-auto">
            <div className="text-lg font-semibold mb-2">Beta Version | 🧪 Active experiment in recursive virtuous meaning-making</div>
          </div>

          <div className="flex flex-wrap justify-center items-center space-x-6">
            <a href="https://lifeisprocess.substack.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              Substack
            </a>
            <a href="https://www.goodreads.com/review/list/176283912-playfulprocess?shelf=read" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              Goodreads
            </a>
            <a href="https://github.com/PlayfulProcess" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              GitHub
            </a>
            <a href="https://channels.recursive.eco/contact" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 text-gray-500 text-sm">
          <p className="mb-2 text-center">
            Platform under{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.en" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300 underline">
              CC BY-SA 4.0
            </a>
            {' '}| User content remains with creators | © 2025 Recursive.eco by PlayfulProcess LLC
          </p>
        </div>
      </div>
    </footer>
  );
}
