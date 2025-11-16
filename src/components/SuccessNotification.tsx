"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SuccessNotification() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [message, setMessage] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    // Check if we have a success message from quote submission
    const quoteSuccess = sessionStorage.getItem('quoteSuccess');
    if (quoteSuccess) {
      setMessage(quoteSuccess);
      setShowSuccess(true);
      // Clear the success message so it doesn't show again on refresh
      sessionStorage.removeItem('quoteSuccess');
    }
  }, []);

  const handleClose = () => {
    setShowSuccess(false);
    setMessage("");
  };

  const handleContinueShopping = () => {
    handleClose();
    router.push('/shop');
  };

  if (!showSuccess) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4 text-center relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="mb-4">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
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
        
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          Quote Request Submitted!
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          {message || "Thank you for your interest! We've received your quote request and will be in touch shortly with pricing and availability."}
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
          <button
            onClick={handleContinueShopping}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
