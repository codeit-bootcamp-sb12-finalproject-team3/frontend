import {
  Children,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HorizontalCarouselProps {
  children: ReactNode;
  itemClassName: string;
  ariaLabel: string;
}

export default function HorizontalCarousel({
  children,
  itemClassName,
  ariaLabel,
}: HorizontalCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrowState = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    setCanScrollLeft(element.scrollLeft > 1);
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateArrowState();
    const element = scrollRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(updateArrowState);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [children, updateArrowState]);

  const scroll = (direction: -1 | 1) => {
    const element = scrollRef.current;
    if (!element) return;

    const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
    const targetScrollLeft = Math.min(
      maxScrollLeft,
      Math.max(0, element.scrollLeft + element.clientWidth * 0.8 * direction),
    );

    // 부드러운 스크롤이 시작되는 즉시 반대 방향 버튼을 노출하고,
    // 실제 스크롤 이벤트에서 최종 위치를 다시 동기화한다.
    setCanScrollLeft(targetScrollLeft > 1);
    setCanScrollRight(targetScrollLeft < maxScrollLeft - 1);
    element.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
  };

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const element = scrollRef.current;
    if (!element) return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: element.scrollLeft,
    };
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const element = scrollRef.current;
    const drag = dragRef.current;
    if (!element || !drag.active) return;

    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 5) {
      drag.moved = true;
      event.preventDefault();
    }
    element.scrollLeft = drag.scrollLeft - distance;
  };

  const finishDragging = () => {
    dragRef.current.active = false;
    window.setTimeout(() => {
      dragRef.current.moved = false;
    }, 0);
  };

  const preventClickAfterDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="group/carousel relative min-w-0 max-w-full">
      <div
        ref={scrollRef}
        role="region"
        aria-label={ariaLabel}
        onScroll={updateArrowState}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={finishDragging}
        onMouseLeave={finishDragging}
        onClickCapture={preventClickAfterDrag}
        onDragStart={(event) => event.preventDefault()}
        className="flex w-full max-w-full snap-x snap-mandatory gap-[30px] overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (child) => (
          <div className={cn('shrink-0 snap-start', itemClassName)}>{child}</div>
        ))}
      </div>

      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="이전 항목 보기"
          className="absolute left-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-gray-950/90 text-white shadow-xl backdrop-blur transition hover:bg-gray-800"
        >
          <ChevronLeft className="size-6" aria-hidden="true" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="다음 항목 보기"
          className="absolute right-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-gray-950/90 text-white shadow-xl backdrop-blur transition hover:bg-gray-800"
        >
          <ChevronRight className="size-6" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
