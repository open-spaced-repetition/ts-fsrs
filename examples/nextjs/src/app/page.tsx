'use client';

import { useState } from 'react';
import ClientTraining from '@/components/ClientTraining';
import ServerTraining from '@/components/ServerTraining';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'client' | 'server'>('client');
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            FSRS Parameter Optimization
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Train FSRS parameters using client-side or server-side processing
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('client')}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'client'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Client-Side Training
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('server')}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'server'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Server-Side Training
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
          {activeTab === 'client' ? (
            <ClientTraining onProcessingChange={setIsProcessing} />
          ) : (
            <ServerTraining onProcessingChange={setIsProcessing} />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Powered by{' '}
            <a
              href="https://github.com/open-spaced-repetition/ts-fsrs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              TS-FSRS
            </a>
            {' '}and{' '}
            <a
              href="https://github.com/open-spaced-repetition/fsrs-rs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              FSRS-RS
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
