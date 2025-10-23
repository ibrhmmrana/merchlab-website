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
      className={`relative inline-flex items-center justify-center rounded-lg border-2 bg-white
        ${selected ? "border-gray-400" : "border-gray-300"}
        ${disabled ? "opacity-40 cursor-not-allowed" : "hover:border-gray-400 cursor-pointer"}
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
    </button>
  );
}
