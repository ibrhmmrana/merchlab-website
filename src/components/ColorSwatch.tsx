"use client";
import Image from "next/image";

type Props = {
  src: string | null;
  label: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: number; // px
};

export default function ColorSwatch({ src, label, selected, onClick, disabled, size = 35 }: Props) {
  const dim = size;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center rounded-lg border-2 bg-white transition-all
        ${selected 
          ? "border-primary ring-2 ring-primary/30 ring-offset-2 shadow-md scale-105" 
          : "border-gray-300 hover:border-gray-400"
        }
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        flex-shrink-0
      `}
      style={{ width: dim, height: dim }}
    >
      {src ? (
        <Image
          src={src}
          alt={label}
          width={dim - 4}
          height={dim - 4}
          className="rounded-md object-contain"
        />
      ) : (
        <span className="rounded-md bg-gray-200" style={{ width: dim - 4, height: dim - 4 }} />
      )}
      {selected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-white flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}
