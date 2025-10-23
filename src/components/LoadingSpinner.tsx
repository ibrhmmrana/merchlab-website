"use client";

import { useState, useEffect } from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  overlay?: boolean;
}

export function LoadingSpinner({ size = "md", text = "Loading...", overlay = false }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}></div>
      {text && <p className="text-sm text-gray-600 font-medium">{text}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
}

// Global loading overlay component
export function GlobalLoadingOverlay({ isLoading, text = "Loading..." }: { isLoading: boolean; text?: string }) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 shadow-2xl max-w-sm mx-4">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  );
}

// Page transition loading
export function PageLoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-40">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-gray-600 font-medium">Loading page...</p>
      </div>
    </div>
  );
}
