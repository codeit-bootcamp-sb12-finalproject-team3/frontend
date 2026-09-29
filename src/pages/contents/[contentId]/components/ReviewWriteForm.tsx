import { useState } from 'react';
import { createReview, updateReview } from '@/lib/api/reviews';
import useReviewStore from '@/lib/stores/useReviewStore';
import type { ReviewCreateRequest, ReviewUpdateRequest, ReviewDto} from '@/lib/types';
import icArrowLeft from '@/assets/ic_arrow_left.svg';
import StarRating from './StarRating';

interface ReviewWriteFormProps {
  contentId: string;
  onCancel: () => void;
  onComplete: () => void | Promise<void>;
  editMode?: boolean;
  initialData?: ReviewDto;
}

export default function ReviewWriteForm({
  contentId,
  onCancel,
  onComplete,
  editMode = false,
  initialData,
}: ReviewWriteFormProps) {
  const [rating, setRating] = useState(editMode && initialData ? initialData.rating : 0);
  const [comment, setComment] = useState(editMode && initialData ? initialData.text : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating < 0.5 || rating > 5 || !Number.isInteger(rating * 2)) {
      setError('0.5점부터 5.0점까지 0.5점 단위로 선택해주세요');
      return;
    }
    if (comment.trim().length === 0) {
      setError('리뷰 내용을 작성해주세요');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editMode && initialData) {
        const reviewData: ReviewUpdateRequest = {
          rating,
          text: comment.trim(),
        };
        const updatedReview = await updateReview(initialData.id, reviewData);

        useReviewStore.getState().update(initialData.id, updatedReview);
      } else {
        const reviewData: ReviewCreateRequest = {
          contentId,
          rating,
          text: comment.trim(),
        };
        const newReview = await createReview(reviewData);

        useReviewStore.getState().add(newReview);
      }

      await onComplete();
    } catch (err) {
      console.error('Failed to create/update review:', err);
      setError('리뷰 처리에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 py-2 px-0">
        <button onClick={onCancel} className="w-5 h-5">
          <img src={icArrowLeft} alt="뒤로가기" className="w-full h-full" />
        </button>
        <h2 className="text-title1-sb text-gray-300">
          {editMode ? '리뷰 수정하기' : '리뷰 작성하기'}
        </h2>
      </div>

      <div className="flex items-center gap-4 pb-5">
        <StarRating value={rating} onChange={(nextRating) => { setRating(nextRating); setError(null); }} sizeClassName="size-[60px]" disabled={isSubmitting} />
        <output className="min-w-14 text-title1-sb text-pink-300" aria-live="polite">{rating > 0 ? `${rating.toFixed(1)}점` : '선택'}</output>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="오늘 진짜 재밌는 영화를 보게 돼서 기뻐요"
        className="w-full h-[200px] bg-gray-800/50 border-2 border-pink-600 rounded-xl px-5 py-4 text-body2-m-140 text-gray-100 placeholder:text-gray-100 resize-none focus:outline-none focus:border-pink-600"
        disabled={isSubmitting}
      />

      {error && (
        <p className="text-body3-m text-red-notification -mt-4">{error}</p>
      )}

      <div className="flex items-start gap-5">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 h-[54px] bg-gray-800 rounded-xl flex items-center justify-center gap-1 px-5 py-2.5 disabled:opacity-50"
        >
          <span className="text-body1-b text-gray-50">취소</span>
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 h-[54px] bg-pink-600 rounded-xl flex items-center justify-center gap-1 px-5 py-2.5 hover:bg-pink-700 disabled:opacity-50 disabled:hover:bg-pink-600"
        >
          <span className="text-body1-b text-white">
            {isSubmitting ? (editMode ? '수정 중...' : '작성 중...') : '완료'}
          </span>
        </button>
      </div>
    </div>
  );
}
