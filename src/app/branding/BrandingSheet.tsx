"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { fetchBrandingPositions, fetchBrandingTypes, fetchBrandingSizes } from '@/lib/branding';
import type { BrandingCompletePayload } from './types';
import { getOrCreateSessionToken } from '@/lib/session';

export type PositionOption = string;
export type TypeOption = string;
export type SizeOption = string;

export type BrandingSheetProps = {
  open: boolean;
  onClose: () => void;

  productName: string;
  stockHeaderId: number;

  // initial variant/qty context if you want to show it in the header later
  colour?: string | null;
  size?: string | null;
  itemKey?: string; // Cart item key for saving branding selections

  // when user presses "Save Branding", we resolve with selections
  onComplete: (payload: BrandingCompletePayload) => void;
};

type PosDraft = {
  type: string | null;
  size: string | null;
  colorCount: number;
  comment?: string;
  artwork_url?: string;
};

export default function BrandingSheet(props: BrandingSheetProps) {
  const { open, onClose, productName, stockHeaderId, colour, size, itemKey, onComplete } = props;

  const [screen, setScreen] = useState<"choose" | "details">("choose");
  const [picked, setPicked] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<string[]>([]);
  
  // Cache for types and sizes by position/type
  const [typesByPosition, setTypesByPosition] = useState<Record<string, string[]>>({});
  const [sizesByPositionType, setSizesByPositionType] = useState<Record<string, Record<string, string[]>>>({});
  
  // Track what's currently loading to prevent duplicate requests
  const loadingRef = React.useRef<{ types: Set<string>; sizes: Set<string> }>({ types: new Set(), sizes: new Set() });

  // per-position form state
  const [drafts, setDrafts] = useState<Record<string, PosDraft>>({});
  
  // Upload state per position
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<Record<string, string>>({});

  // Load positions when modal opens
  useEffect(() => {
    let alive = true;
    async function load() {
      if (!open) return;
      if (!stockHeaderId || Number.isNaN(Number(stockHeaderId))) {
        console.warn('Branding modal: missing/invalid stockHeaderId', stockHeaderId);
        setPositions([]);
        return;
      }
      try {
        setLoading(true);
        const pos = await fetchBrandingPositions(Number(stockHeaderId));
        if (!alive) return;
        setPositions(pos);
        setPicked([]);
        setActive(null);
        setDrafts({});
        setTypesByPosition({});
        setSizesByPositionType({});
        loadingRef.current = { types: new Set(), sizes: new Set() };
      } catch (e) {
        console.error(e);
        if (alive) setPositions([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [open, stockHeaderId]);

  useEffect(() => {
    if (!open) {
      setScreen("choose");
      setPicked([]);
      setActive(null);
      setDrafts({});
    }
  }, [open]);

  // initialize a draft when a position is first selected and load types for that position
  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const p of picked) {
        if (!next[p]) next[p] = { type: null, size: null, colorCount: 1 };
      }
      // remove drafts for unpicked
      Object.keys(next).forEach((k) => {
        if (!picked.includes(k)) delete next[k];
      });
      return next;
    });
    
    // Load types for newly picked positions
    for (const p of picked) {
      // Check if already loaded or currently loading
      if (typesByPosition[p] && typesByPosition[p].length > 0) {
        continue; // Already loaded
      }
      if (loadingRef.current.types.has(p)) {
        continue; // Already loading
      }
      
      // Mark as loading and start fetch
      loadingRef.current.types.add(p);
      console.log(`Loading types for position: ${p}, stockHeaderId: ${stockHeaderId}`);
      fetchBrandingTypes(Number(stockHeaderId), p)
        .then(types => {
          console.log(`Loaded ${types.length} types for position ${p}:`, types);
          loadingRef.current.types.delete(p);
          setTypesByPosition(prevState => {
            // Double-check we haven't already loaded this
            if (prevState[p] && prevState[p].length > 0) {
              return prevState;
            }
            return { ...prevState, [p]: types };
          });
        })
        .catch(err => {
          console.error(`Failed to load types for position ${p}:`, err);
          loadingRef.current.types.delete(p);
        });
    }
  }, [picked, stockHeaderId, typesByPosition]);

  // Load sizes when type changes for a position
  useEffect(() => {
    for (const p of picked) {
      const d = drafts[p];
      if (d?.type) {
        const sizeKey = `${p}:${d.type}`;
        // Check if already loaded or currently loading
        if (sizesByPositionType[p]?.[d.type] && sizesByPositionType[p][d.type].length > 0) {
          continue; // Already loaded
        }
        if (loadingRef.current.sizes.has(sizeKey)) {
          continue; // Already loading
        }
        
        // Mark as loading and start fetch
        loadingRef.current.sizes.add(sizeKey);
        console.log(`Loading sizes for position: ${p}, type: ${d.type}, stockHeaderId: ${stockHeaderId}`);
        fetchBrandingSizes(Number(stockHeaderId), p, d.type!)
          .then(sizes => {
            console.log(`Loaded ${sizes.length} sizes for position ${p}, type ${d.type}:`, sizes);
            loadingRef.current.sizes.delete(sizeKey);
            setSizesByPositionType(prevState => {
              // Double-check we haven't already loaded this
              if (prevState[p]?.[d.type!] && prevState[p][d.type!].length > 0) {
                return prevState;
              }
              return {
                ...prevState,
                [p]: { ...(prevState[p] || {}), [d.type!]: sizes }
              };
            });
          })
          .catch(err => {
            console.error(`Failed to load sizes for position ${p}, type ${d.type}:`, err);
            loadingRef.current.sizes.delete(sizeKey);
          });
      }
    }
  }, [picked, drafts, stockHeaderId, sizesByPositionType]);

  const canNext = picked.length > 0;
  const allValid = useMemo(() => {
    if (picked.length === 0) return false;
    return picked.every((p) => {
      const d = drafts[p];
      return d && d.type && d.size && d.colorCount >= 1;
    });
  }, [picked, drafts]);

  function togglePick(p: string) {
    setPicked((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function setDraft(p: string, patch: Partial<PosDraft>) {
    setDrafts((prev) => {
      const updated = { ...prev, [p]: { ...prev[p], ...patch } as PosDraft };
      // Auto-save to database when type/size/colorCount changes (preserve artwork_url)
      // Only save if we have complete selection (type and size) and the change is to type/size/colorCount
      const draft = updated[p];
      if (itemKey && draft?.type && draft?.size && (patch.type || patch.size || patch.colorCount !== undefined)) {
        // Debounce: save after a short delay to avoid too many calls
        setTimeout(() => {
          saveBrandingSelectionToDb(p, draft);
        }, 500);
      }
      return updated;
    });
  }

  async function saveBrandingSelectionToDb(position: string, draft: PosDraft) {
    if (!itemKey || !draft.type || !draft.size) {
      // Don't save incomplete selections
      return;
    }

    try {
      const sessionToken = getOrCreateSessionToken();
      const response = await fetch('/api/save-branding-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          itemKey,
          stockHeaderId,
          position,
          brandingType: draft.type,
          brandingSize: draft.size,
          colorCount: draft.colorCount,
          comment: draft.comment || null,
          artwork_url: draft.artwork_url || null, // Preserve existing artwork_url
        }),
      });

      if (!response.ok) {
        console.warn('Failed to save branding selection to DB:', await response.text());
      }
    } catch (error) {
      console.error('Error saving branding selection:', error);
    }
  }

  async function handleFileUpload(position: string, file: File) {
    if (!itemKey) {
      setUploadError((prev) => ({ ...prev, [position]: 'Item key is required for upload' }));
      return;
    }

    setUploading((prev) => ({ ...prev, [position]: true }));
    setUploadError((prev) => ({ ...prev, [position]: '' }));

    try {
      const sessionToken = getOrCreateSessionToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionToken', sessionToken);
      formData.append('itemKey', itemKey);
      formData.append('stockHeaderId', stockHeaderId.toString());
      formData.append('position', position);
      
      // Include current draft values if available
      const draft = drafts[position];
      if (draft?.type) formData.append('brandingType', draft.type);
      if (draft?.size) formData.append('brandingSize', draft.size);
      if (draft?.colorCount) formData.append('colorCount', draft.colorCount.toString());
      if (draft?.comment) formData.append('comment', draft.comment);

      const response = await fetch('/api/upload-branding', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `Upload failed: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          const text = await response.text().catch(() => '');
          errorMessage = text || errorMessage;
        }
        console.error('Upload API error:', { status: response.status, error: errorMessage });
        throw new Error(errorMessage);
      }

      const { url } = await response.json();
      if (!url) {
        throw new Error('No URL returned from upload');
      }
      
      setDraft(position, { artwork_url: url });
      setUploadError((prev) => ({ ...prev, [position]: '' }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      setUploadError((prev) => ({ ...prev, [position]: errorMessage }));
      console.error('Upload error:', error);
    } finally {
      setUploading((prev) => ({ ...prev, [position]: false }));
    }
  }

  function handleSave() {
    if (!allValid) {
      console.warn('Cannot save: validation failed', { allValid, picked, drafts });
      return;
    }

    const selections = picked.map((p) => ({
      position: p,
      type: drafts[p].type!,
      size: drafts[p].size!,
      colorCount: drafts[p].colorCount,
      comment: drafts[p].comment?.trim() || undefined,
      artwork_url: drafts[p].artwork_url,
    }));

    console.log('Saving branding selections:', { stockHeaderId, selections });
    
    onComplete({
      stockHeaderId,
      selections,
    });

    // Don't call onClose here - let onComplete handle it
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {screen === "choose" ? "Choose your position type(s)" : "Choose your branding details"}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            <div className="font-medium">{productName}</div>
            <div className="space-x-2">
              {colour ? <span>Colour: {colour}</span> : null}
              {size ? <span>Size: {size}</span> : null}
            </div>
          </div>
        </DialogHeader>

        {screen === "choose" ? (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              Choosing branding positions helps define how your brand is perceived. Select one or more positions to proceed
            </p>

            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading positions...</div>
            ) : positions.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No branding positions available for this item.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {positions.map((p) => {
                  const is = picked.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePick(p)}
                      className={cn(
                        "rounded-xl border px-4 py-6 text-center text-sm transition",
                        is ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" onClick={onClose}>
                Skip Branding
              </Button>
              <Button disabled={!canNext} onClick={() => { setScreen("details"); setActive(picked[0] ?? null); }}>
                Next
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              You&apos;ve selected your positions! Now select branding details for each position.
            </div>

            <Tabs value={active ?? undefined} onValueChange={(v) => setActive(v)}>
              <TabsList className="mb-2 flex flex-wrap gap-2">
                {picked.map((p) => (
                  <TabsTrigger key={p} value={p} className="capitalize">
                    {p}
                  </TabsTrigger>
                ))}
              </TabsList>

              {picked.map((p) => {
                const d = drafts[p];
                const typeOptions = typesByPosition[p] ?? [];
                const sizeOptions = d?.type ? (sizesByPositionType[p]?.[d.type] ?? []) : [];
                const isScreenPrint = (d?.type ?? "").toLowerCase().includes("screen") && (d?.type ?? "").toLowerCase().includes("print");
                
                // Debug logging
                if (typeOptions.length === 0 && picked.includes(p)) {
                  console.warn(`No types loaded for position: ${p}`, { typesByPosition, p });
                }
                if (d?.type && sizeOptions.length === 0) {
                  console.warn(`No sizes loaded for position: ${p}, type: ${d.type}`, { sizesByPositionType, p, type: d.type });
                }

                return (
                  <TabsContent key={p} value={p} className="mt-3 space-y-4">
                    {/* Artwork upload */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Upload Artwork (Optional)</div>
                      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          {d?.artwork_url ? (
                            <>
                              <div className="flex items-center gap-2 text-green-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-sm font-medium">Image uploaded successfully</span>
                              </div>
                              <img 
                                src={d.artwork_url} 
                                alt="Uploaded artwork" 
                                className="max-h-32 max-w-full rounded border object-contain"
                              />
                              <button
                                type="button"
                                onClick={() => setDraft(p, { artwork_url: undefined })}
                                className="text-xs text-red-600 hover:text-red-700 underline"
                              >
                                Remove image
                              </button>
                            </>
                          ) : (
                            <>
                              <label
                                htmlFor={`file-upload-${p}`}
                                className="cursor-pointer rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
                              >
                                {uploading[p] ? 'Uploading...' : 'Select a file'}
                              </label>
                              <input
                                id={`file-upload-${p}`}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(p, file);
                                  }
                                }}
                                disabled={uploading[p]}
                              />
                              <div className="text-xs text-center">
                                JPG, PNG, or WebP • Max size 10MB
                              </div>
                            </>
                          )}
                          {uploadError[p] && (
                            <div className="text-xs text-red-600 mt-2">{uploadError[p]}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-sm">Select your branding type</div>
                        {loadingRef.current.types.has(p) ? (
                          <div className="text-xs text-muted-foreground py-2">Loading types...</div>
                        ) : (
                          <Select
                            value={d?.type ?? ""}
                            onValueChange={(v) => {
                              // reset size when type changes
                              setDraft(p, { type: v, size: null });
                            }}
                            disabled={typeOptions.length === 0}
                          >
                            <SelectTrigger><SelectValue placeholder={typeOptions.length === 0 ? "No types available" : "Select an option"} /></SelectTrigger>
                            <SelectContent>
                              {typeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm">Select your branding size</div>
                        {d?.type && loadingRef.current.sizes.has(`${p}:${d.type}`) ? (
                          <div className="text-xs text-muted-foreground py-2">Loading sizes...</div>
                        ) : (
                          <Select 
                            value={d?.size ?? ""} 
                            onValueChange={(v) => setDraft(p, { size: v })}
                            disabled={!d?.type || sizeOptions.length === 0}
                          >
                            <SelectTrigger><SelectValue placeholder={!d?.type ? "Choose a type first" : sizeOptions.length === 0 ? "No sizes available" : "Select an option"} /></SelectTrigger>
                            <SelectContent>
                              {sizeOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm">Select your branding colour count</div>
                        <Select
                          value={String(d?.colorCount ?? 1)}
                          onValueChange={(v) => setDraft(p, { colorCount: Number(v) })}
                          disabled={!isScreenPrint}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 10 }).map((_, i) => (
                              <SelectItem key={i+1} value={String(i+1)}>{i+1}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!isScreenPrint && <div className="text-xs text-muted-foreground">Fixed to 1 for non Screen Printing</div>}
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <div className="text-sm">Comment (Optional)</div>
                        <Textarea
                          placeholder="Add any extra info"
                          value={d?.comment ?? ""}
                          onChange={(e) => setDraft(p, { comment: e.target.value })}
                        />
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>

            <div className="flex items-center justify-between">
              <Button variant="secondary" onClick={() => setScreen("choose")}>Back</Button>
              <Button disabled={!allValid} onClick={handleSave}>Save Branding</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

