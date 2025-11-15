'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-red-600 mb-4">{error.message}</p>
      {error.digest && (
        <p className="text-sm text-gray-500 mb-4">Error ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}

