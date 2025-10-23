"use client";

export function ProductLoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Shopping Cart with Sparkles Animation */}
      <div className="relative">
        {/* Main Cart */}
        <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center relative z-10">
          <svg 
            className="w-8 h-8 text-white" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
          </svg>
        </div>
        
        {/* Sparkles Animation */}
        <div className="absolute inset-0">
          {/* Top sparkles */}
          <div className="absolute -top-2 -right-2 w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>
          <div className="absolute -top-1 -left-3 w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
          
          {/* Right sparkles */}
          <div className="absolute top-1 -right-4 w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-4 -right-1 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
          
          {/* Bottom sparkles */}
          <div className="absolute -bottom-2 -right-1 w-2.5 h-2.5 bg-blue-300 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute -bottom-1 -left-2 w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '2.5s'}}></div>
          
          {/* Left sparkles */}
          <div className="absolute top-2 -left-4 w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{animationDelay: '3s'}}></div>
          <div className="absolute top-6 -left-1 w-1 h-1 bg-blue-300 rounded-full animate-pulse" style={{animationDelay: '3.5s'}}></div>
        </div>
      </div>
      
      {/* Loading Text */}
      <p className="mt-6 text-gray-500 text-sm font-medium">Loading products...</p>
    </div>
  );
}
