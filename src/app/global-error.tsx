'use client'; // Error components must be Client Components

import { useCallback, useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error Caught:', error);
  }, [error]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
            <h1 className="text-3xl font-bold text-red-600 mb-4">Something went wrong!</h1>
            <p className="text-gray-600 mb-6">
              We apologize for the inconvenience. An unexpected error occurred.
            </p>
            <div className="flex flex-col space-y-4">
              <button
                onClick={handleReset}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                Try again
              </button>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error has no router context */}
                <a
                    href="/"
                    className="text-blue-600 hover:text-blue-800 underline"
                >
                    Return to Home
                </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
