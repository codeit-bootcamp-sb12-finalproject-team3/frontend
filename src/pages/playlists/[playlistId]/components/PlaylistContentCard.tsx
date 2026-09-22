import { useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { PlaylistContentSummary, PlaylistContentType } from '@/lib/types';
import icStarFull from '@/assets/ic_star_full.svg';
import ConfirmDialog from '@/components/ui/confirm-dialog';

const ContentTypeLabel: Record<PlaylistContentType, string> = {
  movie: '영화',
  tvSeason: 'TV 시즌',
};

interface PlaylistContentCardProps {
  content: PlaylistContentSummary;
  playlistId: string;
  canDelete: boolean;
  deleteDisabled: boolean;
  onDelete: () => void;
}

export default function PlaylistContentCard({
  content,
  canDelete,
  deleteDisabled,
  onDelete,
}: PlaylistContentCardProps) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleCardClick = () => {
    navigate(`/contents/${content.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteDisabled) {
      toast.error('플레이리스트에는 최소 4개의 콘텐츠가 필요합니다.');
      return;
    }
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className="flex flex-col gap-2 cursor-pointer group transition-transform hover:scale-[1.02] relative"
      >
        {/* Thumbnail Container */}
        <div className="relative w-full aspect-[260/390] rounded-2xl overflow-hidden">
          {/* Thumbnail Image */}
          <img
            src={content.thumbnailUrl || '/placeholder-movie.png'}
            alt={content.title}
            className="w-full h-full object-cover"
          />

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Delete Button Overlay (Owner Only) */}
          {canDelete && (
            <button
              onClick={handleDeleteClick}
              aria-disabled={deleteDisabled}
              title={deleteDisabled ? '최소 4개의 콘텐츠가 필요해 삭제할 수 없습니다.' : undefined}
              className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10 ${
                deleteDisabled
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-pink-600 hover:bg-pink-700'
              }`}
              aria-label="플레이리스트에서 삭제"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        {/* Content Info */}
        <div className="flex flex-col gap-1.5 pt-1.5">
          {/* Title */}
          <h3 className="text-body2-sb text-gray-50 line-clamp-1">
            {content.title}
          </h3>

          {/* Description - Fixed height to maintain consistent card size */}
          <p className="text-body3-m text-gray-200 line-clamp-2 min-h-[2lh] overflow-hidden text-ellipsis whitespace-nowrap">
            {content.description || '\u00A0'}
          </p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-0.5 pb-1">
          <img src={icStarFull} alt="" className="w-3.5 h-3.5" />
          <span className="text-caption1-m text-gray-300">
              {content.averageRating.toFixed(1)} ({content.reviewCount || 0})
            </span>
        </div>

        {/* Category Tags */}
        <div className="flex gap-1.5 items-center flex-wrap">
          <div className="px-2 py-1 rounded-full bg-gray-800 h-[22px] flex items-center justify-center">
            <span className="text-caption1-sb text-gray-300 leading-none">
              {ContentTypeLabel[content.type]}
            </span>
          </div>
          {content.tags.slice(0, 2).map((tag) => (
            <div
              key={tag}
              className="px-2 py-1 rounded-full bg-gray-800 h-[22px] flex items-center justify-center"
            >
              <span className="text-caption1-sb text-gray-300 leading-none">
                {tag}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="콘텐츠 삭제"
        description={`플레이리스트에서 "${content.title}"을(를) 삭제하시겠습니까?`}
        onConfirm={handleConfirmDelete}
        confirmText="삭제"
        cancelText="취소"
        variant="destructive"
      />
    </>
  );
}
