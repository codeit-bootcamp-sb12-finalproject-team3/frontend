import {useCallback, useEffect, useRef, useState} from 'react';
import {getContents} from '@/lib/api/contents';
import type {ContentSummaryResponse, CursorResponseContentSummary} from '@/lib/types';
import ContentGrid from '@/pages/contents/components/ContentGrid';

type Cursor = Pick<CursorResponseContentSummary, 'nextCursor' | 'nextIdAfter' | 'hasNext'>;
const initialCursor: Cursor = {nextCursor: null, nextIdAfter: null, hasNext: false};

export default function LikedContentsSection({userId}: {userId: string}) {
  const [contents, setContents] = useState<ContentSummaryResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [cursor, setCursor] = useState<Cursor>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const loadingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setContents([]);
    setTotalCount(0);
    setCursor(initialCursor);
    setError(undefined);
    setLoading(true);
    loadingRef.current = true;

    getContents({likedByUserIdEqual: userId, limit: 20})
      .then((response) => {
        if (cancelled) return;
        setContents(response.data);
        setTotalCount(response.totalCount);
        setCursor(response);
      })
      .catch(() => {
        if (!cancelled) setError('좋아요한 콘텐츠를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          loadingRef.current = false;
        }
      });

    return () => {cancelled = true;};
  }, [userId]);

  const fetchMore = useCallback(async () => {
    if (loadingRef.current || !cursor.hasNext || !cursor.nextCursor || !cursor.nextIdAfter) return;
    loadingRef.current = true;
    setLoading(true);
    setError(undefined);
    try {
      const response = await getContents({
        likedByUserIdEqual: userId,
        limit: 20,
        cursor: cursor.nextCursor,
        idAfter: cursor.nextIdAfter,
      });
      setContents((previous) => Array.from(new Map([...previous, ...response.data].map((item) => [item.id, item])).values()));
      setTotalCount(response.totalCount);
      setCursor(response);
    } catch {
      setError('좋아요한 콘텐츠를 추가로 불러오지 못했습니다.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [cursor, userId]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (container && container.scrollHeight - container.scrollTop - container.clientHeight < 100) {
      void fetchMore();
    }
  };

  return (
    <section className="mt-[60px]">
      <div className="flex items-center gap-2 mb-[20px]">
        <h2 className="text-header1-sb text-gray-50">좋아요한 콘텐츠</h2>
        <span className="text-header1-sb text-gray-500">{totalCount}</span>
      </div>
      <div ref={scrollRef} onScroll={handleScroll} className="h-[420px] py-1 pl-2 pr-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        <ContentGrid contents={contents} loading={loading} error={error}/>
        {error && contents.length > 0 && <p className="mt-3 text-body2-m text-red-notification">{error}</p>}
        {loading && contents.length > 0 && <p className="py-4 text-center text-body2-m text-gray-400">불러오는 중...</p>}
      </div>
    </section>
  );
}
