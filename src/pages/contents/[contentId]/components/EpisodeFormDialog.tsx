import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createContentEpisode, getContentEpisode, updateContentEpisode } from '@/lib/api/contents';
import type { EpisodeCreateRequest, EpisodeResponse, EpisodeUpdateRequest } from '@/lib/types';
import icX from '@/assets/ic_X.svg';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasonId: string;
  episode?: EpisodeResponse;
  suggestedEpisodeNumber?: number;
  onSaved: (episode: EpisodeResponse) => Promise<void> | void;
}

export default function EpisodeFormDialog({ open, onOpenChange, seasonId, episode, suggestedEpisodeNumber = 1, onSaved }: Props) {
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [runtime, setRuntime] = useState('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const createMode = !episode;

  useEffect(() => {
    if (!open) return;
    setEpisodeNumber(String(episode?.episodeNumber ?? suggestedEpisodeNumber));
    setTitle(episode?.title || '');
    setDescription(episode?.description || '');
    setRuntime(episode?.runtime?.toString() || '');
    setThumbnail(null);
    setThumbnailPreview(episode?.thumbnailUrl || '');
    setRemoveThumbnail(false);
  }, [episode, open, suggestedEpisodeNumber]);

  const changeThumbnail = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return void toast.error('JPG, PNG, WebP 이미지만 선택할 수 있습니다.');
    if (file.size > 5 * 1024 * 1024) return void toast.error('썸네일은 5MB 이하만 업로드할 수 있습니다.');
    setThumbnail(file);
    setRemoveThumbnail(false);
    const reader = new FileReader();
    reader.onloadend = () => setThumbnailPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleRemoveThumbnail = () => {
    const next = !removeThumbnail;
    setRemoveThumbnail(next);
    setThumbnail(null);
    setThumbnailPreview(next ? '' : episode?.thumbnailUrl || '');
  };

  const submit = async () => {
    const number = Number(episodeNumber);
    if (!Number.isInteger(number) || number < 0) return void toast.error('회차 번호는 0 이상의 정수로 입력해주세요.');
    if (title.trim().length > 255) return void toast.error('제목은 255자 이하로 입력해주세요.');
    if (runtime && (!Number.isInteger(Number(runtime)) || Number(runtime) <= 0)) return void toast.error('러닝타임은 1분 이상의 정수로 입력해주세요.');

    setSubmitting(true);
    try {
      let refreshed: EpisodeResponse;
      if (createMode) {
        const request: EpisodeCreateRequest = {
          episodeNumber: number,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          runtime: runtime ? Number(runtime) : undefined,
        };
        refreshed = await createContentEpisode(seasonId, request, thumbnail || undefined);
      } else {
        const request: EpisodeUpdateRequest = {
          episodeNumber: number,
          title: title.trim() || null,
          description: description.trim() || null,
          runtime: runtime ? Number(runtime) : null,
          removeThumbnail,
        };
        await updateContentEpisode(seasonId, episode.id, request, thumbnail || undefined);
        refreshed = await getContentEpisode(seasonId, episode.id);
      }
      try {
        await onSaved(refreshed);
      } catch (refreshError) {
        console.error(refreshError);
        toast.warning(`${createMode ? '등록' : '수정'}은 완료됐지만 최신 목록을 불러오지 못했습니다. 화면을 새로고침해주세요.`);
        onOpenChange(false);
        return;
      }
      toast.success(createMode ? '에피소드가 등록되었습니다.' : '에피소드가 수정되었습니다.');
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(createMode ? '에피소드를 등록하지 못했습니다. 동일한 회차 번호가 있는지 확인해주세요.' : '에피소드를 수정하지 못했습니다. 회차 중복 또는 Watch Party 상태를 확인해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
    <DialogContent hideCloseButton className="max-h-[92vh] max-w-[680px] overflow-y-auto rounded-3xl border border-gray-800 bg-gray-900/95 p-8 backdrop-blur-[25px]">
      <div className="mb-6 flex items-center justify-between"><div><h2 className="text-title1-sb text-gray-50">에피소드 {createMode ? '등록' : '정보 수정'}</h2><p className="mt-1 text-body3-m text-gray-500">회차 정보와 썸네일을 {createMode ? '등록' : '수정'}합니다.</p></div><button type="button" onClick={() => onOpenChange(false)} disabled={submitting}><img src={icX} alt="닫기" className="size-6" /></button></div>
      <div className="flex flex-col gap-6">
        <section className="grid gap-5 sm:grid-cols-[210px_1fr]"><div><Label className="text-body2-sb text-gray-300">썸네일</Label><div className="mt-2 flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-gray-800">{thumbnailPreview ? <img src={thumbnailPreview} alt="에피소드 썸네일 미리보기" className="h-full w-full object-cover" /> : <ImageOff className="size-8 text-gray-600" />}</div></div><div className="flex flex-col justify-end gap-3"><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={changeThumbnail} disabled={removeThumbnail} className="border-gray-700 bg-gray-800 text-gray-300" />{episode?.thumbnailUrl && <label className="flex cursor-pointer items-center gap-2 text-body3-m text-gray-300"><input type="checkbox" checked={removeThumbnail} onChange={toggleRemoveThumbnail} className="accent-pink-500" />현재 썸네일 삭제</label>}<p className="text-caption1-m text-gray-500">JPG, PNG, WebP · 최대 5MB · 선택 입력</p></div></section>
        <div className="grid gap-5 sm:grid-cols-2"><Field label="회차 번호" required><Input type="number" min={0} step={1} value={episodeNumber} onChange={(event) => setEpisodeNumber(event.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="러닝타임(분)"><Input type="number" min={1} step={1} value={runtime} onChange={(event) => setRuntime(event.target.value)} placeholder="예: 55" className="border-gray-700 bg-gray-800 text-gray-50" /></Field></div>
        <Field label="제목"><Input value={title} maxLength={255} onChange={(event) => setTitle(event.target.value)} placeholder={`${episodeNumber || episode?.episodeNumber || suggestedEpisodeNumber}화`} className="border-gray-700 bg-gray-800 text-gray-50" /></Field>
        <Field label="설명"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={6} className="w-full resize-none rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-body2-m text-gray-50 outline-none focus:ring-2 focus:ring-pink-500" /></Field>
        <div className="flex gap-3 border-t border-gray-800 pt-5"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="flex-1 border-gray-700 bg-transparent text-gray-300">취소</Button><Button type="button" onClick={() => void submit()} disabled={submitting} className="flex-1 bg-pink-500 text-white hover:bg-pink-600">{submitting ? '저장 중...' : createMode ? '에피소드 등록' : '수정 내용 저장'}</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="flex flex-col gap-2"><Label className="text-body2-sb text-gray-300">{label} {required && <span className="text-pink-500">*</span>}</Label>{children}</div>;
}
