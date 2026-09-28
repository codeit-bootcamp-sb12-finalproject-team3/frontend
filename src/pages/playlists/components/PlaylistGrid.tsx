import type { PlaylistSummary } from '@/lib/types';
import PlaylistCard from './PlaylistCard';

interface PlaylistGridProps {
  playlists: PlaylistSummary[];
  loading?: boolean;
  error?: string;
}

const gridClassName = 'grid grid-cols-1 lg:grid-cols-2 gap-x-[30px] gap-y-[30px]';

function PlaylistCardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4 rounded-[24px] border border-gray-700 bg-gray-800 p-5 animate-pulse">
      <div className="h-7 w-2/3 rounded-md bg-gray-700" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="aspect-[2/3] rounded-lg bg-gray-700" />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-20 rounded-md bg-gray-700" />
        <div className="h-4 w-20 rounded-md bg-gray-700" />
        <div className="h-4 w-16 rounded-md bg-gray-700" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20">
      <p className="text-body1-m text-gray-400 mb-2">플레이리스트가 없습니다</p>
      <p className="text-body3-m text-gray-500">검색 조건을 변경해보세요</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20">
      <p className="text-body1-m text-red-notification mb-2">오류가 발생했습니다</p>
      <p className="text-body3-m text-gray-500">{message}</p>
    </div>
  );
}

export default function PlaylistGrid({ playlists, loading, error }: PlaylistGridProps) {
  if (error) {
    return <div className={gridClassName}><ErrorState message={error} /></div>;
  }

  if (loading && playlists.length === 0) {
    return (
      <div className={gridClassName}>
        {Array.from({ length: 6 }).map((_, index) => <PlaylistCardSkeleton key={index} />)}
      </div>
    );
  }

  if (!loading && playlists.length === 0) {
    return <div className={gridClassName}><EmptyState /></div>;
  }

  return (
    <div className={gridClassName}>
      {playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}
      {loading && playlists.length > 0 && Array.from({ length: 6 }).map((_, index) => (
        <PlaylistCardSkeleton key={`skeleton-${index}`} />
      ))}
    </div>
  );
}
