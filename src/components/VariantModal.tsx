"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useEffect } from "react";
import type { Variant } from "@/lib/data/types";
import Image from "next/image";
import ColorSwatch from "@/components/ColorSwatch";
import { sortSizes } from "@/lib/sizeUtils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loading?: boolean;
  variants: Variant[];
  onAdd: (v: Variant) => void;
  title?: string;
  initialPreview?: string;
};

type ColourOption = { name: string; image_url: string | null; sizes: string[] };

function buildColourOptions(variants: Variant[]): ColourOption[] {
  const map = new Map<string, ColourOption>();
  for (const v of variants) {
    const key = (v.colour || "default").trim();
    const cur = map.get(key);
    if (cur) {
      if (v.size && !cur.sizes.includes(v.size)) cur.sizes.push(v.size);
      if (!cur.image_url && v.image_url) cur.image_url = v.image_url;
    } else {
      map.set(key, { name: key, image_url: v.image_url ?? null, sizes: v.size ? [v.size] : [] });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function VariantModal({ open, onOpenChange, loading, variants, onAdd, title, initialPreview }: Props) {
  const colours = useMemo(() => buildColourOptions(variants), [variants]);
  const [colour, setColour] = useState<string | null>(colours[0]?.name ?? null);
  const [size, setSize] = useState<string | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  const preview = useMemo(() => {
    const c = colours.find((x) => x.name === colour);
    return c?.image_url ?? initialPreview ?? variants[0]?.image_url ?? null;
  }, [colours, colour, initialPreview, variants]);

  const sizes = useMemo(() => {
    const rawSizes = colour ? colours.find((x) => x.name === colour)?.sizes ?? [] : [];
    return sortSizes(rawSizes);
  }, [colour, colours]);

  const chosen = useMemo(
    () => variants.find((v) => v.colour === colour && v.size === size),
    [variants, colour, size]
  );

  // Preselect size if only one is available
  useEffect(() => {
    if (sizes.length === 1 && !size) {
      setSize(sizes[0]);
    }
  }, [sizes, size]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title ?? "Select variant"}</DialogTitle></DialogHeader>

        {loading && <div className="text-sm text-muted-foreground">Loading variants…</div>}

        {!loading && (
          <div className="space-y-4">
            {/* Large preview */}
            {preview && (
              <div className="relative w-full aspect-[1/1] bg-gray-50 rounded">
                <Image src={preview} alt="Preview" fill className="object-contain" />
              </div>
            )}

            <div>
              <div className="text-sm mb-2">Colour</div>
              <div className="flex flex-wrap gap-2">
                {colours.map((c) => (
                  <ColorSwatch
                    key={c.name}
                    src={c.image_url}
                    label={c.name}
                    selected={colour === c.name}
                    onClick={() => { setColour(c.name); setSize(null); }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm mb-2">Size</div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`px-2 py-1 text-sm rounded border ${size === s ? "bg-primary text-white border-primary" : ""}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

    <button
      disabled={!chosen}
      onClick={() => { 
        if (chosen) { 
          setIsPressed(true);
          onAdd(chosen); 
          onOpenChange(false);
          setTimeout(() => setIsPressed(false), 150);
        } 
      }}
      className={`luxury-btn w-full ${
        isPressed 
          ? 'scale-95 shadow-inner' 
          : 'scale-100'
      } ${!chosen ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {chosen ? (isPressed ? "Adding..." : "Add to cart") : "Select options"}
    </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}