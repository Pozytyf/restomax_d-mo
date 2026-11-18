import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#182333] to-[#24344D] text-white/80 p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <UtensilsCrossed className="w-7 h-7 text-[#FF8738] mb-2" />
        {fallbackTitle && (
          <span className="text-xs font-medium text-center text-white/90 line-clamp-2">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
