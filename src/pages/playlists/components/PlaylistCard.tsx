import { useNavigate } from 'react-router-dom';
import type { PlaylistSummary } from '@/lib/types';
import icStarFull from '@/assets/ic_star_full.svg';
import icClock from '@/assets/ic_clock.svg';

interface PlaylistCardProps {
  playlist: PlaylistSummary;
}

export default function PlaylistCard({ playlist }: PlaylistCardProps) {
  const navigate = useNavigate();
  const thumbnails = playlist.previewContents.slice(0, 4);
  const remainingCount = Math.max(playlist.contentCount - 4, 0);

  const formatUpdatedTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    if (diffInHours < 48) return '어제';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}일 전`;

    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  };

  return (
    <div
      onClick={() => navigate(`/playlists/${playlist.id}`)}
      className="group flex w-full min-w-0 cursor-pointer flex-col gap-4 overflow-hidden rounded-[24px] border border-white/10 bg-gray-900 p-5 transition-colors hover:border-white/30"
    >
      <h3 className="truncate text-header2-b text-white" title={playlist.title}>
        {playlist.title}
      </h3>

      <div className="grid grid-cols-4 gap-2">
        {thumbnails.map((content, index) => (
          <div key={content.id} className="relative aspect-[2/3] min-w-0 overflow-hidden rounded-lg bg-gray-800">
            {content.thumbnailUrl ? (
              <img src={content.thumbnailUrl} alt={content.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center px-1 text-center text-caption1-m text-gray-400">
                {content.title}
              </div>
            )}
            {index === 3 && remainingCount > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/65 text-header2-b text-white">
                +{remainingCount}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-400">
        <div className="flex items-center gap-1">
          <img src={icStarFull} alt="" className="h-4 w-4" />
          <span className="text-caption1-m">{playlist.subscriberCount}명 구독</span>
        </div>
        <span className="text-caption1-sb">∙</span>
        <span className="text-caption1-m">콘텐츠 {playlist.contentCount}개</span>
        <span className="text-caption1-sb">∙</span>
        <div className="flex items-center gap-1">
          <img src={icClock} alt="" className="h-4 w-4" />
          <span className="text-caption1-m">{formatUpdatedTime(playlist.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
