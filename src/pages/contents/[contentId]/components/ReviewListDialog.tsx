import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import {
  Dialog,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUp, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { deleteReview } from '@/lib/api/reviews';
import useReviewStore from '@/lib/stores/useReviewStore';
import useContentStore from '@/lib/stores/useContentStore';
import useContentDetailStore from '@/lib/stores/useContentDetailStore';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import type { ReviewDto } from '@/lib/types';
import icX from '@/assets/ic_X.svg';
import ReviewWriteForm from './ReviewWriteForm';
import StarRating from './StarRating';

interface ReviewListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  selectedReview?: ReviewDto;
}

export default function ReviewListDialog({
  open,
  onOpenChange,
  contentId,
  selectedReview,
}: ReviewListDialogProps) {
  const [view, setView] = useState<'list' | 'focused' | 'write' | 'edit'>(selectedReview ? 'focused' : 'list');
  const [focusedReview, setFocusedReview] = useState<ReviewDto | null>(selectedReview ?? null);
  const [editingReview, setEditingReview] = useState<ReviewDto | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const savedListScrollTop = useRef<number | null>(null);
  const editingFromFocused = useRef(false);
  const { data, loading, fetch, fetchMore, hasNext, updateParams, clearData } = useReviewStore();
  const { ref: sentinelRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (open) {
      updateParams({ contentId, limit: 20 });
    } else {
      setView('list');
      setShowScrollTop(false);
      savedListScrollTop.current = null;
      editingFromFocused.current = false;
      clearData();
    }
  }, [open, contentId, updateParams, clearData]);

  useLayoutEffect(() => {
    if (view !== 'list' || savedListScrollTop.current === null || !listScrollRef.current) return;
    listScrollRef.current.scrollTop = savedListScrollTop.current;
    savedListScrollTop.current = null;
  }, [view]);

  useEffect(() => {
    if (open && view === 'list' && inView && hasNext() && !loading) {
      fetchMore();
    }
  }, [open, view, inView, hasNext, loading, fetchMore]);

  const refreshContentData = async () => {
    const detailStore = useContentDetailStore.getState();
    detailStore.updateParams({ contentId }, { autoFetch: false });
    const results = await Promise.allSettled([
      detailStore.fetch({ ignoreLoading: true, throwError: true }),
      useContentStore.getState().fetch(),
    ]);
    if (results.some((result) => result.status === 'rejected')) {
      toast.error('평균 평점과 리뷰 수를 새로고침하지 못했습니다.');
    }
  };

  const handleWriteComplete = async (savedReview: ReviewDto) => {
    const wasEditing = view === 'edit';
    if (wasEditing && editingFromFocused.current) {
      setFocusedReview(savedReview);
      setView('focused');
    } else {
      setView('list');
    }
    setEditingReview(null);
    editingFromFocused.current = false;
    if (wasEditing) {
      await refreshContentData();
    } else {
      setShowScrollTop(false);
      await Promise.all([fetch(), refreshContentData()]);
    }
  };

  const handleEdit = (review: ReviewDto) => {
    editingFromFocused.current = view === 'focused';
    if (!editingFromFocused.current) savedListScrollTop.current = listScrollRef.current?.scrollTop ?? 0;
    setEditingReview(review);
    setView('edit');
  };

  const handleDeleteClick = (reviewId: string) => {
    setDeletingReviewId(reviewId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingReviewId) return;

    setIsDeleting(true);
    try {
      await deleteReview(deletingReviewId);

      useReviewStore.getState().delete(deletingReviewId);

      await refreshContentData();

      setDeletingReviewId(null);
      if (focusedReview?.id === deletingReviewId) {
        setFocusedReview(null);
        setView('list');
      }
    } catch (err) {
      console.error('Failed to delete review:', err);
      alert('리뷰 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingReviewId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-[1000px] h-[646px] bg-gray-800/50 backdrop-blur-[25px] border border-gray-800 rounded-3xl p-9 flex flex-col"
      >
        {view === 'focused' && focusedReview ? (
          <>
            <div className="flex items-center justify-between pb-6 flex-shrink-0">
              <h2 className="text-title1-sb text-gray-300">리뷰</h2>
              <DialogClose asChild>
                <button type="button" className="w-6 h-6"><img src={icX} alt="닫기" className="w-full h-full" /></button>
              </DialogClose>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <p className="text-body3-sb text-pink-300">선택한 리뷰</p>
              <ReviewItem review={focusedReview} onEdit={handleEdit} onDelete={handleDeleteClick} />
            </div>
            <button type="button" onClick={() => setView('list')} className="h-[54px] w-full flex-shrink-0 rounded-xl border border-gray-700 bg-gray-800 text-body2-sb text-gray-100 hover:bg-gray-700">전체 리뷰 보기</button>
          </>
        ) : view === 'list' ? (
          <>
            <div className="flex items-center justify-between pb-6 flex-shrink-0">
              <h2 className="text-title1-sb text-gray-300">리뷰</h2>
              <div className="flex items-center gap-3">
                {showScrollTop && (
                  <button type="button" onClick={() => listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="최신 리뷰로 이동" className="flex size-8 items-center justify-center rounded-full border border-gray-600 bg-gray-700 text-gray-100 transition hover:bg-gray-600">
                    <ArrowUp className="size-4" />
                  </button>
                )}
                <DialogClose asChild>
                  <button className="w-6 h-6">
                    <img src={icX} alt="닫기" className="w-full h-full" />
                  </button>
                </DialogClose>
              </div>
            </div>

            <div ref={listScrollRef} onScroll={(event) => setShowScrollTop(event.currentTarget.scrollTop > 120)} className="flex-1 overflow-y-auto min-h-0">
              {data.length === 0 && !loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-body2-m text-gray-400">아직 리뷰가 없습니다.</p>
                </div>
              ) : (
                <>
                  {data.map((review) => (
                    <ReviewItem
                      key={review.id}
                      review={review}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                  {/* Infinite Scroll Sentinel */}
                  {hasNext() && (
                    <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                      {loading && (
                        <p className="text-body3-m text-gray-400">로딩 중...</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={() => { setShowScrollTop(false); setView('write'); }}
              className="h-[54px] w-full bg-gray-800/50 border-[1.5px] border-gray-800 rounded-xl px-5 py-3.5 flex items-center mt-6 flex-shrink-0"
            >
              <span className="text-body2-m-140 text-gray-400">리뷰를 작성해주세요</span>
            </button>
          </>
        ) : view === 'write' ? (
          <ReviewWriteForm
            contentId={contentId}
            onCancel={() => setView('list')}
            onComplete={handleWriteComplete}
          />
        ) : (
          <ReviewWriteForm
            contentId={contentId}
            onCancel={() => {
              setView(editingFromFocused.current ? 'focused' : 'list');
              setEditingReview(null);
              editingFromFocused.current = false;
            }}
            onComplete={handleWriteComplete}
            editMode
            initialData={editingReview || undefined}
          />
        )}

        {deletingReviewId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
            <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-title1-sb text-gray-100 mb-2">리뷰 삭제</h3>
              <p className="text-body2-m text-gray-300 mb-6">
                정말 삭제하시겠습니까?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className="flex-1 h-[48px] bg-gray-700 rounded-xl text-body2-sb text-gray-100 hover:bg-gray-600 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 h-[48px] bg-pink-600 rounded-xl text-body2-sb text-white hover:bg-pink-700 disabled:opacity-50"
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ReviewItemProps {
  review: ReviewDto;
  onEdit: (review: ReviewDto) => void;
  onDelete: (reviewId: string) => void;
}

function ReviewItem({ review, onEdit, onDelete }: ReviewItemProps) {
  const { data: jwt } = useAuthStore();
  const isOwner = jwt?.userDto.id === review.author.userId;

  const getProfileColor = (userId: string) => {
    const colors = ['#467db2', '#ac5959', '#7754a9', '#6e6e6e', '#5a9e6f', '#b87333'];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="border-b border-[#212126] py-6 first:pt-6">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className="w-[22px] h-[22px] rounded-full border border-white/10"
              style={{ backgroundColor: getProfileColor(review.author.userId) }}
            />
            <span className="text-body2-sb text-gray-300">{review.author.name}</span>
          </div>

          <StarRating value={review.rating} />
        </div>

        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-gray-700 transition-colors">
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-gray-800 border-gray-700 min-w-[120px]"
            >
              <DropdownMenuItem
                onClick={() => onEdit(review)}
                className="text-body3-m text-gray-100 cursor-pointer hover:bg-gray-700 focus:bg-gray-700"
              >
                수정
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(review.id)}
                className="text-body3-m text-red-notification cursor-pointer hover:bg-gray-700 focus:bg-gray-700"
              >
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <p className="text-body2-m-140 text-gray-50">{review.text}</p>
    </div>
  );
}
