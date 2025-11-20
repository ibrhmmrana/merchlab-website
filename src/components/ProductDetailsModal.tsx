"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProductFeature {
  LineID: number;
  StockHeaderID: number;
  Features: string;
}

interface ProductDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockHeaderId: number;
  productName: string | null;
  productImage: string | null;
}

export default function ProductDetailsModal({
  open,
  onOpenChange,
  stockHeaderId,
  productName,
  productImage,
}: ProductDetailsModalProps) {
  const [features, setFeatures] = useState<ProductFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !stockHeaderId) {
      setFeatures([]);
      setError(null);
      return;
    }

    // Abort controller for request cancellation
    const abortController = new AbortController();

    async function fetchFeatures() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/product-features?stockHeaderId=${stockHeaderId}`,
          {
            signal: abortController.signal,
          }
        );
        
        if (!response.ok) {
          // Try to get error message from response
          let errorMessage = 'Failed to fetch product features';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If response is not JSON, use default message
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setFeatures(data.features || []);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Error fetching features:', err);
        setError(err instanceof Error ? err.message : 'Failed to load features');
      } finally {
        setLoading(false);
      }
    }

    fetchFeatures();

    // Cleanup: abort request if component unmounts or dependencies change
    return () => {
      abortController.abort();
    };
  }, [open, stockHeaderId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{productName || "Product Details"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Product Image - Left side */}
          {productImage && (
            <div className="relative w-full aspect-square bg-gray-50 rounded-lg overflow-hidden">
              <Image
                src={productImage}
                alt={productName || "Product"}
                fill
                className="object-contain"
                sizes="200px"
              />
            </div>
          )}

          {/* Features - Right side */}
          <div className="flex flex-col min-w-0">
            <h3 className="text-base font-semibold mb-2">Features</h3>
            {loading && (
              <div className="text-xs text-muted-foreground">Loading...</div>
            )}
            {error && (
              <div className="text-xs text-red-600">Error: {error}</div>
            )}
            {!loading && !error && features.length === 0 && (
              <div className="text-xs text-muted-foreground">No features available.</div>
            )}
            {!loading && !error && features.length > 0 && (
              <ul className="space-y-1.5 overflow-y-auto pr-1">
                {features.map((feature) => (
                  <li key={feature.LineID} className="flex items-start gap-1.5">
                    <span className="text-primary mt-1 text-xs">•</span>
                    <span className="text-xs leading-relaxed">{feature.Features}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

