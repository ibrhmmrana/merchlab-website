"use client";
import { useState } from "react";
import type { Facets } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export type FiltersState = {
  categories: string[] | null;
  types: string[] | null;
  brands: string[] | null;
  colours: string[] | null;
  sizes: string[] | null;
  genders: string[] | null;
  garment_types: string[] | null;
  stock_min?: number;
};

type Props = {
  facets: Facets | null;
  value: FiltersState;
  onApply: (f: FiltersState) => void;
  onReset: () => void;
};

// Color swatch component
function ColorSwatch({ color, name, selected, onClick }: { color: string; name: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded-full border-2 transition-all duration-200 relative ${
        selected 
          ? 'border-blue-600 ring-4 ring-blue-200 shadow-lg scale-110' 
          : 'border-gray-300 hover:border-gray-400 hover:scale-105'
      }`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {selected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
        </div>
      )}
    </button>
  );
}

// Size button component
function SizeButton({ size, selected, onClick }: { size: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all duration-200 ${
        selected 
          ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105 ring-2 ring-blue-200' 
          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:scale-102'
      }`}
    >
      {size}
    </button>
  );
}

// Checkbox option component
function CheckboxOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-blue-50 transition-all duration-200 group">
      <Checkbox
        id={label}
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 w-5 h-5"
      />
      <Label htmlFor={label} className="text-base font-semibold text-gray-700 cursor-pointer group-hover:text-blue-700 transition-colors">
        {label}
      </Label>
    </div>
  );
}

export default function FiltersDialog({ facets, value, onApply, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<FiltersState>(value);

  // Count active filters
  const activeFilterCount = (value.colours?.length || 0) + (value.sizes?.length || 0) + (value.garment_types?.length || 0);

  // Color options with hex values
  const colorOptions = [
    { name: "Black", hex: "#000000" },
    { name: "Dark Blue", hex: "#1e3a8a" },
    { name: "Red", hex: "#ef4444" },
    { name: "Blue", hex: "#3b82f6" },
    { name: "Dark Grey", hex: "#374151" },
    { name: "Grey", hex: "#6b7280" },
    { name: "Dark Green", hex: "#166534" },
    { name: "Green", hex: "#22c55e" },
    { name: "Beige", hex: "#f5f5dc" },
    { name: "Brown", hex: "#8b4513" }
  ];

  // Size options
  const sizeOptions = ["LAR", "MED", "XL", "SML", "2XL", "3XL", "4XL", "XS", "5XL"];

  // Fabric options
  const fabricOptions = ["Cotton", "Poly Cotton", "Straw", "Nylon"];

  // Gender options
  const genderOptions = ["Men", "Women", "Unisex"];

  // Garment type options
  const garmentTypeOptions = ["Hats", "Floppy", "Bucket", "Caps", "Visors"];

  const handleColorToggle = (colorName: string) => {
    const current = local.colours || [];
    const updated = current.includes(colorName)
      ? current.filter(c => c !== colorName)
      : [...current, colorName];
    setLocal(prev => ({ ...prev, colours: updated.length ? updated : null }));
  };

  const handleSizeToggle = (size: string) => {
    const current = local.sizes || [];
    const updated = current.includes(size)
      ? current.filter(s => s !== size)
      : [...current, size];
    setLocal(prev => ({ ...prev, sizes: updated.length ? updated : null }));
  };

  const handleFabricToggle = (fabric: string) => {
    const current = local.garment_types || [];
    const updated = current.includes(fabric)
      ? current.filter(f => f !== fabric)
      : [...current, fabric];
    setLocal(prev => ({ ...prev, garment_types: updated.length ? updated : null }));
  };

  const handleGenderToggle = (gender: string) => {
    const current = local.genders || [];
    const updated = current.includes(gender)
      ? current.filter(g => g !== gender)
      : [...current, gender];
    setLocal(prev => ({ ...prev, genders: updated.length ? updated : null }));
  };

  const handleGarmentTypeToggle = (type: string) => {
    const current = local.garment_types || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setLocal(prev => ({ ...prev, garment_types: updated.length ? updated : null }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 relative">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gray-50">
          <DialogTitle className="text-xl font-semibold text-gray-900">Apply Filters</DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-8">
          {/* Colours */}
          <div>
            <h3 className="font-semibold text-base mb-4 text-gray-900">Colours</h3>
            <div className="grid grid-cols-8 gap-3">
              {colorOptions.map((color) => (
                <ColorSwatch
                  key={color.name}
                  color={color.hex}
                  name={color.name}
                  selected={local.colours?.includes(color.name) || false}
                  onClick={() => handleColorToggle(color.name)}
                />
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div>
            <h3 className="font-semibold text-base mb-4 text-gray-900">Sizes</h3>
            <div className="grid grid-cols-5 gap-3">
              {sizeOptions.map((size) => (
                <SizeButton
                  key={size}
                  size={size}
                  selected={local.sizes?.includes(size) || false}
                  onClick={() => handleSizeToggle(size)}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center px-8 py-6 border-t" style={{background: 'linear-gradient(to right, #f9fafb, #f3f4f6)'}}>
          <button 
            onClick={() => {
              onReset();
              setLocal({
                categories: null,
                types: null,
                brands: null,
                colours: null,
                sizes: null,
                genders: null,
                garment_types: null,
                stock_min: 0
              });
            }} 
            className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Reset All
          </button>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => { 
                onApply(local); 
                setOpen(false); 
              }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}