import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  addContentToPlaylist,
  getPlaylistErrorCode,
  getPlaylists,
} from '@/lib/api/playlists';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import type { PlaylistSummary } from '@/lib/types';
import icX from '@/assets/ic_X.svg';

interface AddToPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
}

export default function AddToPlaylistDialog({
  open,
  onOpenChange,
  contentId,
}: AddToPlaylistDialogProps) {
  const [userPlaylists, setUserPlaylists] = useState<PlaylistSummary[]>([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const { data: jwt } = useAuthStore();

  // 모달이 열릴 때 사용자의 플레이리스트 fetch
  useEffect(() => {
    if (open && jwt?.userDto.id) {
      fetchUserPlaylists();
    } else {
      // 모달이 닫힐 때 상태 초기화
      setUserPlaylists([]);
      setSelectedPlaylistIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jwt?.userDto.id]);

  const fetchUserPlaylists = async () => {
    if (!jwt?.userDto.id) return;

    setLoading(true);
    try {
      const response = await getPlaylists({
        ownerIdEqual: jwt.userDto.id,
        limit: 100,
        sortDirection: 'DESCENDING',
        sortBy: 'createdAt',
      });

      setUserPlaylists(response.data);
      setSelectedPlaylistIds(new Set()); // 초기 선택 없음
    } catch (err) {
      console.error('Failed to fetch playlists:', err);
      toast.error('플레이리스트를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (playlistId: string, isChecked: boolean) => {
    setSelectedPlaylistIds((prev) => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.add(playlistId);
      } else {
        newSet.delete(playlistId);
      }
      return newSet;
    });
  };

  const handleAddToPlaylists = async () => {
    setAdding(true);
    try {
      // 선택된 플레이리스트에 콘텐츠 추가
      await Promise.all(
        Array.from(selectedPlaylistIds).map((playlistId) =>
          addContentToPlaylist(playlistId, contentId)
        )
      );

      toast.success('플레이리스트에 추가되었습니다.');
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to add content to playlists:', err);
      const code = getPlaylistErrorCode(err);
      if (code === 'PLAYLIST_CONTENT_ALREADY_EXISTS') {
        toast.error('이미 플레이리스트에 포함된 콘텐츠입니다.');
        return;
      }
      if (code === 'CONTENT_TYPE_NOT_SUPPORTED') {
        toast.error('플레이리스트에 추가할 수 없는 콘텐츠 타입입니다.');
        return;
      }
      if (code === 'PLAYLIST_ACCESS_DENIED') {
        toast.error('플레이리스트에 콘텐츠를 추가할 권한이 없습니다.');
        return;
      }
      toast.error('플레이리스트 추가에 실패했습니다.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-[500px] max-h-[min(646px,calc(100vh-2rem))] overflow-hidden bg-gray-800/50 backdrop-blur-[25px] border border-gray-800 rounded-3xl p-9"
      >
        <PlaylistListView
          userPlaylists={userPlaylists}
          selectedPlaylistIds={selectedPlaylistIds}
          loading={loading}
          adding={adding}
          onCheckboxChange={handleCheckboxChange}
          onAddToPlaylists={handleAddToPlaylists}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface PlaylistListViewProps {
  userPlaylists: PlaylistSummary[];
  selectedPlaylistIds: Set<string>;
  loading: boolean;
  adding: boolean;
  onCheckboxChange: (playlistId: string, isChecked: boolean) => void;
  onAddToPlaylists: () => void;
  onClose: () => void;
}

function PlaylistListView({
  userPlaylists,
  selectedPlaylistIds,
  loading,
  adding,
  onCheckboxChange,
  onAddToPlaylists,
  onClose,
}: PlaylistListViewProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-6 shrink-0">
        <h2 className="text-title1-sb text-gray-300">플레이리스트 추가</h2>
        <DialogClose asChild>
          <button className="w-6 h-6" onClick={onClose}>
            <img src={icX} alt="닫기" className="w-full h-full" />
          </button>
        </DialogClose>
      </div>

      {/* 플레이리스트 목록: 헤더(48px)+버튼(54px)+여백(92px)을 제외한 나머지 뷰포트 높이만큼만 스크롤 영역 확보 */}
      <div className="max-h-[min(452px,calc(100vh-226px))] overflow-y-auto mb-5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-body2-m text-gray-400">로딩 중...</p>
          </div>
        ) : userPlaylists.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-body2-m text-gray-400">콘텐츠를 추가할 플레이리스트가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {userPlaylists.map((playlist) => (
              <PlaylistCheckboxItem
                key={playlist.id}
                playlist={playlist}
                checked={selectedPlaylistIds.has(playlist.id)}
                onChange={(isChecked) => onCheckboxChange(playlist.id, isChecked)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 하단 버튼 - 한 줄 배치 */}
      <div className="flex gap-4 shrink-0">
        {/* 추가 버튼 */}
        <button
          onClick={onAddToPlaylists}
          disabled={adding || selectedPlaylistIds.size === 0}
          className="w-full h-[54px] bg-pink-600 rounded-xl px-5 py-3 hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-body1-b text-white">
            {adding ? '추가 중...' : '추가'}
          </span>
        </button>
      </div>
    </div>
  );
}

interface PlaylistCheckboxItemProps {
  playlist: PlaylistSummary;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function PlaylistCheckboxItem({ playlist, checked, onChange }: PlaylistCheckboxItemProps) {
  return (
    <label className="flex items-center gap-2 py-2.5 px-1 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded border-2 border-gray-600 bg-transparent checked:bg-pink-600 checked:border-pink-600 cursor-pointer appearance-none flex items-center justify-center after:content-['✓'] after:text-white after:text-sm after:hidden checked:after:block"
      />
      <div className="flex-1">
        <p className="text-body2-sb text-gray-100">{playlist.title}</p>
      </div>
    </label>
  );
}
