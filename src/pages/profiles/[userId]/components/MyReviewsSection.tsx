import {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {getReviews} from '@/lib/api/reviews';
import {getContent} from '@/lib/api/contents';
import type {CursorResponseReviewDto, ReviewDto} from '@/lib/types';

type Cursor = Pick<CursorResponseReviewDto, 'nextCursor' | 'nextIdAfter' | 'hasNext'>;
const initialCursor: Cursor = {nextCursor: undefined, nextIdAfter: undefined, hasNext: false};

export default function MyReviewsSection({userId}: {userId: string}) {
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [cursor, setCursor] = useState<Cursor>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const loadingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadTitles = useCallback(async (items: ReviewDto[], isCancelled: () => boolean) => {
    const contentIds = [...new Set(items.map((review) => review.contentId))];
    const results = await Promise.allSettled(contentIds.map((id) => getContent(id)));
    if (isCancelled()) return;
    setTitles((previous) => {
      const next = {...previous};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') next[contentIds[index]] = result.value.title;
      });
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReviews([]);
    setTitles({});
    setTotalCount(0);
    setCursor(initialCursor);
    setError(undefined);
    setLoading(true);
    loadingRef.current = true;

    getReviews({userIdEqual: userId, limit: 20, sortBy: 'createdAt', sortDirection: 'DESCENDING'})
      .then((response) => {
        if (cancelled) return;
        setReviews(response.data);
        setTotalCount(response.totalCount);
        setCursor(response);
        void loadTitles(response.data, () => cancelled);
      })
      .catch(() => {
        if (!cancelled) setError('작성한 리뷰를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          loadingRef.current = false;
        }
      });

    return () => {cancelled = true;};
  }, [userId, loadTitles]);

  const fetchMore = useCallback(async () => {
    if (loadingRef.current || !cursor.hasNext || !cursor.nextCursor || !cursor.nextIdAfter) return;
    loadingRef.current = true;
    setLoading(true);
    setError(undefined);
    try {
      const response = await getReviews({
        userIdEqual: userId,
        limit: 20,
        sortBy: 'createdAt',
        sortDirection: 'DESCENDING',
        cursor: cursor.nextCursor,
        idAfter: cursor.nextIdAfter,
      });
      setReviews((previous) => Array.from(new Map([...previous, ...response.data].map((item) => [item.id, item])).values()));
      setTotalCount(response.totalCount);
      setCursor(response);
      void loadTitles(response.data, () => false);
    } catch {
      setError('리뷰를 추가로 불러오지 못했습니다.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [cursor, userId, loadTitles]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (container && container.scrollHeight - container.scrollTop - container.clientHeight < 100) void fetchMore();
  };

  return (
    <section className="mt-[60px]">
      <div className="flex items-center gap-2 mb-[20px]">
        <h2 className="text-header1-sb text-gray-50">내가 작성한 리뷰</h2>
        <span className="text-header1-sb text-gray-500">{totalCount}</span>
      </div>
      <div ref={scrollRef} onScroll={handleScroll} className="h-[420px] py-1 pl-2 pr-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {loading && reviews.length === 0 && <p className="py-8 text-center text-body2-m text-gray-400">불러오는 중...</p>}
        {error && reviews.length === 0 && <p className="py-8 text-center text-body2-m text-red-notification">{error}</p>}
        {!loading && !error && reviews.length === 0 && <p className="py-8 text-center text-body2-m text-gray-400">작성한 리뷰가 없습니다.</p>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-lg border border-gray-700 bg-gray-900 p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <Link to={`/contents/${review.contentId}`} className="text-body1-sb text-gray-50 hover:text-primary truncate cursor-pointer">
                  {titles[review.contentId] ?? '콘텐츠 보기'}
                </Link>
                <span className="text-body2-m text-gray-300 shrink-0">★ {review.rating.toFixed(1)}</span>
              </div>
              <p className="text-body2-m-140 text-gray-200 whitespace-pre-wrap break-words">{review.text}</p>
            </article>
          ))}
        </div>
        {error && reviews.length > 0 && <p className="mt-3 text-body2-m text-red-notification">{error}</p>}
        {loading && reviews.length > 0 && <p className="py-4 text-center text-body2-m text-gray-400">불러오는 중...</p>}
      </div>
    </section>
  );
}
