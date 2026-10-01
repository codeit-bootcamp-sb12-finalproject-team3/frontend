import { useState } from 'react';
import icStarFull from '@/assets/ic_star_full.svg';
import icStarEmpty from '@/assets/ic_star_empty.svg';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  sizeClassName?: string;
  disabled?: boolean;
}

export default function StarRating({ value, onChange, sizeClassName = 'size-[18px]', disabled = false }: StarRatingProps) {
  const [previewValue, setPreviewValue] = useState<number | null>(null);
  const displayedValue = previewValue ?? value;
  const interactive = Boolean(onChange) && !disabled;

  return (
    <div
      className="flex items-center gap-0.5"
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? '평점 선택' : `평점 ${value.toFixed(1)}점`}
      onMouseLeave={() => setPreviewValue(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = displayedValue >= star ? 100 : displayedValue >= star - 0.5 ? 50 : 0;
        const halfValue = star - 0.5;
        return (
          <span key={star} className={`relative block shrink-0 ${sizeClassName}`}>
            <img src={icStarEmpty} alt="" className="absolute inset-0 size-full" />
            <img
              src={icStarFull}
              alt=""
              className="absolute inset-0 size-full"
              style={{ clipPath: `inset(0 ${100 - fill}% 0 0)` }}
            />
            {interactive && <>
              <button
                type="button"
                role="radio"
                aria-checked={value === halfValue}
                aria-label={`${halfValue.toFixed(1)}점`}
                onMouseEnter={() => setPreviewValue(halfValue)}
                onFocus={() => setPreviewValue(halfValue)}
                onBlur={() => setPreviewValue(null)}
                onClick={() => onChange?.(halfValue)}
                className="absolute inset-y-0 left-0 w-1/2 rounded-l-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              />
              <button
                type="button"
                role="radio"
                aria-checked={value === star}
                aria-label={`${star.toFixed(1)}점`}
                onMouseEnter={() => setPreviewValue(star)}
                onFocus={() => setPreviewValue(star)}
                onBlur={() => setPreviewValue(null)}
                onClick={() => onChange?.(star)}
                className="absolute inset-y-0 right-0 w-1/2 rounded-r-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              />
            </>}
          </span>
        );
      })}
    </div>
  );
}
