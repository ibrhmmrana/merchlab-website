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

    async function fetchFeatures() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/product-features?stockHeaderId=${stockHeaderId}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch product features');
        }

        const data = await response.json();
        setFeatures(data.features || []);
      } catch (err) {
        console.error('Error fetching features:', err);
        setError(err instanceof Error ? err.message : 'Failed to load features');
      } finally {
        setLoading(false);
      }
    }

    fetchFeatures();
  }, [open, stockHeaderId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{productName || "Product Details"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Image */}
          {productImage && (
            <div className="relative w-full aspect-square bg-gray-50 rounded-lg overflow-hidden">
              <Image
                src={productImage}
                alt={productName || "Product"}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </div>
          )}

          {/* Features */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Features</h3>
            {loading && (
              <div className="text-sm text-muted-foreground">Loading features...</div>
            )}
            {error && (
              <div className="text-sm text-red-600">Error: {error}</div>
            )}
            {!loading && !error && features.length === 0 && (
              <div className="text-sm text-muted-foreground">No features available for this product.</div>
            )}
            {!loading && !error && features.length > 0 && (
              <ul className="space-y-2">
                {features.map((feature) => (
                  <li key={feature.LineID} className="flex items-start gap-2">
                    <span className="text-primary mt-1.5">•</span>
                    <span className="text-sm">{feature.Features}</span>
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

