"use client";

import { useEffect, useState } from "react";

export default function SuccessNotification() {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Check if we have a success message from quote submission
    const quoteSuccess = sessionStorage.getItem('quoteSuccess');
    if (quoteSuccess === 'true') {
      setShowSuccess(true);
      // Clear the success flag so it doesn't show again on refresh
      sessionStorage.removeItem('quoteSuccess');
    }
  }, []);

  if (!showSuccess) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4 text-center">
        <div className="mb-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Quote Request Submitted!
        </h3>
        
        <p className="text-sm text-gray-500 mb-6">
          Thank you for your interest! We've received your quote request and will be in touch shortly with pricing and availability.
        </p>
        
        <button
          onClick={() => setShowSuccess(false)}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
