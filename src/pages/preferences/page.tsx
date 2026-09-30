import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Logo from '@/assets/Logo.svg';
import {
  createMyPreferences,
  getMyPreferences,
  getPreferenceCandidates,
  isPreferenceNotFoundError,
} from '@/lib/api/preferences';
import { markRecommendationPreparation } from '@/lib/recommendation-preparation';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import type { ContentSummaryResponse } from '@/lib/types';
import PreferenceContentCard from './components/PreferenceContentCard';

const MIN_SELECTION_COUNT = 3;

export default function PreferenceSelectionPage() {
  const navigate = useNavigate();
  const authentication = useAuthStore((state) => state.data);
  const [candidates, setCandidates] = useState<ContentSummaryResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const data = await getPreferenceCandidates();
      setCandidates(data);
    } catch (loadError) {
      console.error('Failed to load preference candidates:', loadError);
      setError('선택할 콘텐츠를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authentication?.userDto.role === 'ADMIN') {
      navigate('/contents', { replace: true });
      return;
    }

    const checkExistingPreference = async () => {
      try {
        await getMyPreferences();
        navigate('/contents', { replace: true });
      } catch (preferenceError) {
        if (isPreferenceNotFoundError(preferenceError)) {
          await loadCandidates();
          return;
        }
        setError('선호 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        setLoading(false);
      }
    };

    void checkExistingPreference();
  }, [authentication?.userDto.role, loadCandidates, navigate]);

  const toggleContent = (contentId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(contentId)) next.delete(contentId);
      else next.add(contentId);
      return next;
    });
  };

  const submitPreferences = async () => {
    if (selectedIds.size < MIN_SELECTION_COUNT || submitting) return;
    setSubmitting(true);
    try {
      await createMyPreferences(Array.from(selectedIds));
      const userId = authentication?.userDto.id;
      if (userId) markRecommendationPreparation(userId);
      toast.success('취향 설정이 완료되었습니다.');
      navigate('/contents', { replace: true });
    } catch (submitError) {
      console.error('Failed to create preferences:', submitError);
      toast.error('취향 설정에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-36">
      <header className="flex h-20 items-center border-b border-gray-800 px-5 sm:px-[42px]">
        <img src={Logo} alt="모두의 플리" className="size-9" />
      </header>

      <main className="mx-auto w-full max-w-[1680px] px-5 py-10 sm:px-8 xl:px-[70px]">
        <div className="mb-10">
          <p className="text-body3-b text-pink-500">나만의 MOPL 시작하기</p>
          <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.04em] text-white sm:text-[36px]">
            좋아하는 콘텐츠를 골라주세요
          </h1>
          <p className="mt-3 text-body2-m text-gray-400">
            3개 이상 선택하면 취향에 맞는 콘텐츠와 플레이리스트를 추천해 드려요.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-gray-800 bg-gray-950/60 px-6 text-center">
            <p className="text-body2-m text-red-notification">{error}</p>
            <Button
              type="button"
              onClick={() => void loadCandidates()}
              className="mt-5 rounded-xl bg-gray-800 px-5 text-white hover:bg-gray-700"
            >
              다시 불러오기
            </Button>
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-gray-800">
            <p className="text-body2-m text-gray-500">선택할 수 있는 콘텐츠가 아직 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {candidates.map((content) => (
              <PreferenceContentCard
                key={content.id}
                content={content}
                selected={selectedIds.has(content.id)}
                onToggle={() => toggleContent(content.id)}
              />
            ))}
          </div>
        )}
      </main>

      {!loading && !error && candidates.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-800 bg-gray-950/95 px-5 py-5 backdrop-blur sm:px-8 xl:px-[70px]">
          <div className="mx-auto flex w-full max-w-[1540px] items-center justify-between gap-5">
            <div>
              <p className="text-body1-b text-white">{selectedIds.size}개 선택</p>
              <p className="mt-1 text-body3-m text-gray-500">
                {selectedIds.size < MIN_SELECTION_COUNT
                  ? `앞으로 ${MIN_SELECTION_COUNT - selectedIds.size}개 더 선택해 주세요.`
                  : '선택한 콘텐츠로 추천을 준비할게요.'}
              </p>
            </div>
            <Button
              type="button"
              disabled={selectedIds.size < MIN_SELECTION_COUNT || submitting}
              onClick={() => void submitPreferences()}
              className="h-[52px] min-w-36 rounded-xl bg-pink-500 px-6 text-body2-b text-white hover:bg-pink-600 disabled:bg-gray-800 disabled:text-gray-600"
            >
              {submitting ? '추천 준비 중...' : '선택 완료'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
