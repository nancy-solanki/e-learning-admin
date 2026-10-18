import { useState } from 'react';
import { BookIcon } from '../icons/AdminIcons';

/** Pass a resolved image URL; attachment UUIDs are not image URLs. */
export function CourseImage({
  src,
  title,
  className = '',
}: {
  src?: string | null;
  title: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <div className={`aspect-video overflow-hidden bg-[#eee9f8] ${className}`}>
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={`Image unavailable for ${title}`}
          className="flex h-full flex-col items-center justify-center gap-2 text-[#8062bc]"
        >
          <BookIcon aria-hidden="true" className="size-10" />
          <span className="text-xs">No course image</span>
        </div>
      )}
    </div>
  );
}
