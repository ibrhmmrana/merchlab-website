'use client';

import * as React from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { listBrandingPositions, listBrandingChoices } from '@/lib/supabaseRest';
import type { BrandingSelection } from '@/types/branding';

export type { BrandingSelection };

interface BrandingModalProps {
  open: boolean;
  onClose: () => void;
  stockHeaderId?: number; // can be undefined; handle gracefully
  // Called when user clicks "Save selections"
  onComplete?: (selections: BrandingSelection[]) => void;
}

export default function BrandingModal({ open, onClose, stockHeaderId, onComplete }: BrandingModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Step 1: positions
  const [positions, setPositions] = React.useState<Array<{ name: string; count: number }>>([]);
  const [selectedPositions, setSelectedPositions] = React.useState<string[]>([]);

  // For each position, keep its available choices
  const [choicesByPosition, setChoicesByPosition] = React.useState<
    Record<string, Array<{ branding_type: string; branding_size: string }>>
  >({});

  // For each position, keep the in-progress form state
  const [formByPosition, setFormByPosition] = React.useState<
    Record<string, BrandingSelection>
  >({});

  // UI: which tab is active when there are multiple positions
  const [activePos, setActivePos] = React.useState<string | null>(null);

  // Load positions when opened
  React.useEffect(() => {
    if (!open) return;

    if (!stockHeaderId) {
      setErr('No stock header id found for this item.');
      setPositions([]);
      return;
    }

    setLoading(true);
    setErr(null);
    setSelectedPositions([]);
    setActivePos(null);
    setChoicesByPosition({});
    setFormByPosition({});

    (async () => {
      try {
        const rows = await listBrandingPositions(stockHeaderId);
        const mapped = rows.map(r => ({ name: r.branding_position, count: r.option_count }));
        setPositions(mapped);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to load branding positions.';
        setErr(errorMessage);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, stockHeaderId]);

  // When a position gets selected, prime its default form and fetch its choices
  async function ensureChoices(pos: string) {
    if (!stockHeaderId) return;

    if (!choicesByPosition[pos]) {
      const choices = await listBrandingChoices(stockHeaderId, pos);
      setChoicesByPosition(prev => ({ ...prev, [pos]: choices }));

      // Initialize default selection for this position (first available type/size if present)
      const firstType = choices[0]?.branding_type ?? '';
      const firstSize = choices.find(c => c.branding_type === firstType)?.branding_size ?? '';

      setFormByPosition(prev => ({
        ...prev,
        [pos]: {
          branding_position: pos,
          branding_type: firstType || '',
          branding_size: firstSize || '',
          color_count: firstType === 'Screen Printing' ? 1 : 1, // default 1
          artwork_url: '',
          comment: '',
        },
      }));
    }
  }

  function togglePosition(pos: string) {
    setSelectedPositions(prev => {
      const has = prev.includes(pos);
      const next = has ? prev.filter(p => p !== pos) : [...prev, pos];

      // set active tab to the newly selected (or fallback)
      if (!has) {
        setActivePos(pos);
        ensureChoices(pos).catch(err => setErr(String(err)));
      } else {
        // If removing active, switch to another if available
        if (activePos === pos) {
          setActivePos(next[0] ?? null);
        }
      }

      return next;
    });
  }

  function updateForm(pos: string, patch: Partial<BrandingSelection>) {
    setFormByPosition(prev => {
      const base = prev[pos] ?? {
        branding_position: pos,
        branding_type: '',
        branding_size: '',
        color_count: 1,
        artwork_url: '',
        comment: '',
      };

      const next = { ...base, ...patch };

      // If type changes, handle size list reset + color rule
      if (patch.branding_type !== undefined) {
        const type = next.branding_type;

        // Reset size if current size not in new type's sizes
        const options = choicesByPosition[pos] ?? [];
        const sizesForType = options.filter(o => o.branding_type === type).map(o => o.branding_size);

        if (!sizesForType.includes(next.branding_size)) {
          next.branding_size = sizesForType[0] ?? '';
        }

        // Color count rule
        next.color_count = type === 'Screen Printing' ? Math.min(Math.max(next.color_count || 1, 1), 10) : 1;
      }

      return { ...prev, [pos]: next };
    });
  }

  function canSave(): boolean {
    if (!selectedPositions.length) return false;

    // All selected positions must have valid form fields
    return selectedPositions.every(pos => {
      const f = formByPosition[pos];
      return f && f.branding_position && f.branding_type && f.branding_size && (f.color_count ?? 1) >= 1;
    });
  }

  function handleSave() {
    if (!canSave()) return;

    const selections = selectedPositions.map(pos => formByPosition[pos]).filter(Boolean) as BrandingSelection[];

    onComplete?.(selections);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o ? onClose() : null}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Branding Options</DialogTitle>
        </DialogHeader>

        {loading && <div className="py-4 text-sm">Loading branding positions…</div>}

        {err && <div className="py-2 text-sm text-red-600">{err}</div>}

        {!loading && !err && (
          <div className="space-y-4">
            {/* Positions list (multi-select chips) */}
            <div>
              <div className="mb-2 text-sm font-medium">Select branding position(s)</div>
              <div className="flex flex-wrap gap-2">
                {positions.map(p => {
                  const active = selectedPositions.includes(p.name);
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => togglePosition(p.name)}
                      className={[
                        'px-3 py-1 rounded-full border text-sm',
                        active ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
                      ].join(' ')}
                      title={`${p.name} (${p.count} options)`}
                    >
                      {p.name}
                    </button>
                  );
                })}
                {!positions.length && (
                  <div className="text-sm text-muted-foreground">No positions available for this item.</div>
                )}
              </div>
            </div>

            {/* Tabs for each selected position */}
            {selectedPositions.length > 0 && (
              <Tabs value={activePos ?? selectedPositions[0]} onValueChange={setActivePos}>
                <TabsList className="flex flex-wrap">
                  {selectedPositions.map(pos => (
                    <TabsTrigger key={pos} value={pos} className="mr-1 mb-1">
                      {pos}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {selectedPositions.map(pos => {
                  const f = formByPosition[pos];
                  const options = choicesByPosition[pos] ?? [];
                  const types = Array.from(new Set(options.map(o => o.branding_type)));
                  const sizesForType = options
                    .filter(o => o.branding_type === (f?.branding_type ?? ''))
                    .map(o => o.branding_size);

                  return (
                    <TabsContent key={pos} value={pos} className="mt-3 space-y-4">
                      {/* Type */}
                      <div className="grid gap-1.5">
                        <Label>Branding Type</Label>
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                          value={f?.branding_type ?? ''}
                          onChange={(e) => updateForm(pos, { branding_type: e.target.value })}
                        >
                          <option value="" disabled>Select a type…</option>
                          {types.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Size */}
                      <div className="grid gap-1.5">
                        <Label>Branding Size</Label>
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                          value={f?.branding_size ?? ''}
                          onChange={(e) => updateForm(pos, { branding_size: e.target.value })}
                          disabled={!f?.branding_type}
                        >
                          <option value="" disabled>{f?.branding_type ? 'Select a size…' : 'Choose a type first'}</option>
                          {sizesForType.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Colour count rule */}
                      <div className="grid gap-1.5">
                        <Label>Colour Count</Label>
                        {f?.branding_type === 'Screen Printing' ? (
                          <select
                            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                            value={f?.color_count ?? 1}
                            onChange={(e) => updateForm(pos, { color_count: Number(e.target.value) })}
                          >
                            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        ) : (
                          <Input readOnly value={1} />
                        )}
                      </div>

                      {/* Artwork URL (temporary) */}
                      <div className="grid gap-1.5">
                        <Label>Artwork URL (temporary)</Label>
                        <Input
                          placeholder="https://…/artwork.png"
                          value={f?.artwork_url ?? ''}
                          onChange={(e) => updateForm(pos, { artwork_url: e.target.value })}
                        />
                      </div>

                      {/* Comment */}
                      <div className="grid gap-1.5">
                        <Label>Comment (optional)</Label>
                        <Textarea
                          placeholder="Notes for branding…"
                          value={f?.comment ?? ''}
                          onChange={(e) => updateForm(pos, { comment: e.target.value })}
                        />
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!canSave()} onClick={handleSave}>Save selections</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
