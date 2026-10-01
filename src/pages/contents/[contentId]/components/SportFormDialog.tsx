import { useEffect, useState, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { getContentSportTypes, updateContent } from '@/lib/api/contents';
import { getSportTypeLabel } from '@/lib/sport-types';
import useContentStore from '@/lib/stores/useContentStore';
import useContentDetailStore from '@/lib/stores/useContentDetailStore';
import type { ContentResponse, ContentSportType, ContentUpdateRequest, ErrorResponse } from '@/lib/types';
import icX from '@/assets/ic_X.svg';

const toKoreaDateTimeInput = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
};

const toInstant = (value: string) => value ? new Date(`${value}:00+09:00`).toISOString() : null;

interface Props { open: boolean; onOpenChange: (open: boolean) => void; content: ContentResponse; onBeforeRefresh?: () => void; onSuccess?: (content: ContentResponse) => void; }

export default function SportFormDialog({ open, onOpenChange, content, onBeforeRefresh, onSuccess }: Props) {
  const sport = content.sport;
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [sportTypeId, setSportTypeId] = useState(''); const [sportTypes, setSportTypes] = useState<ContentSportType[]>([]);
  const [scheduledAt, setScheduledAt] = useState(''); const [league, setLeague] = useState(''); const [season, setSeason] = useState(''); const [round, setRound] = useState('');
  const [homeTeam, setHomeTeam] = useState(''); const [awayTeam, setAwayTeam] = useState(''); const [venue, setVenue] = useState(''); const [country, setCountry] = useState('');
  const [homeScore, setHomeScore] = useState(''); const [awayScore, setAwayScore] = useState('');
  const [thumbnail, setThumbnail] = useState<File | null>(null); const [thumbnailPreview, setThumbnailPreview] = useState(''); const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false); const [submitting, setSubmitting] = useState(false); const [duplicateOpen, setDuplicateOpen] = useState(false);

  useEffect(() => {
    if (!open || !sport) return;
    setTitle(content.title); setDescription(content.description || ''); setSportTypeId(sport.sportType.id); setScheduledAt(toKoreaDateTimeInput(sport.scheduledAt));
    setLeague(sport.league || ''); setSeason(sport.season || ''); setRound(sport.round || ''); setHomeTeam(sport.homeTeam || ''); setAwayTeam(sport.awayTeam || ''); setVenue(sport.venue || ''); setCountry(sport.country || '');
    setHomeScore(sport.homeScore?.toString() || ''); setAwayScore(sport.awayScore?.toString() || ''); setThumbnail(null); setThumbnailPreview(content.thumbnailUrl || ''); setRemoveThumbnail(false); setDuplicateOpen(false);
    setLoadingTypes(true); void getContentSportTypes().then(setSportTypes).catch(() => toast.error('스포츠 종목 목록을 불러오지 못했습니다.')).finally(() => setLoadingTypes(false));
  }, [content, open, sport]);

  const changeThumbnail = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return void toast.error('JPG, PNG, WebP 이미지만 선택할 수 있습니다.');
    if (file.size > 5 * 1024 * 1024) return void toast.error('썸네일은 5MB 이하만 업로드할 수 있습니다.');
    setThumbnail(file); setRemoveThumbnail(false); const reader = new FileReader(); reader.onloadend = () => setThumbnailPreview(reader.result as string); reader.readAsDataURL(file);
  };
  const toggleRemoveThumbnail = () => { const next = !removeThumbnail; setRemoveThumbnail(next); setThumbnail(null); setThumbnailPreview(next ? '' : content.thumbnailUrl || ''); };

  const valid = () => {
    if (!title.trim() || title.trim().length > 255) return toast.error('제목은 필수이며 255자 이하여야 합니다.'), false;
    if (!description.trim()) return toast.error('설명을 입력해주세요.'), false;
    if (!sportTypeId) return toast.error('종목을 선택해주세요.'), false;
    if (!homeTeam.trim() || homeTeam.trim().length > 255 || !awayTeam.trim() || awayTeam.trim().length > 255) return toast.error('홈팀과 원정팀은 필수이며 255자 이하여야 합니다.'), false;
    if (league.trim().length > 255 || venue.trim().length > 255) return toast.error('리그와 경기장은 255자 이하여야 합니다.'), false;
    if (season.trim().length > 100 || round.trim().length > 100 || country.trim().length > 100) return toast.error('시즌, 라운드, 개최 국가는 100자 이하여야 합니다.'), false;
    if (scheduledAt && Number.isNaN(new Date(`${scheduledAt}:00+09:00`).getTime())) return toast.error('경기 일시를 확인해주세요.'), false;
    if ((homeScore === '') !== (awayScore === '')) return toast.error('홈팀과 원정팀 점수는 함께 입력하거나 함께 비워주세요.'), false;
    if ([homeScore, awayScore].some((value) => value !== '' && (!Number.isInteger(Number(value)) || Number(value) < 0))) return toast.error('점수는 0 이상의 정수로 입력해주세요.'), false;
    return true;
  };

  const submit = async (duplicateConfirmed = false) => {
    if (!valid()) return;
    const request: ContentUpdateRequest = { title: title.trim(), description: description.trim(), sportTypeId, scheduledAt: toInstant(scheduledAt), league: league.trim() || null, season: season.trim() || null, round: round.trim() || null, homeTeam: homeTeam.trim(), awayTeam: awayTeam.trim(), venue: venue.trim() || null, country: country.trim() || null, homeScore: homeScore === '' ? null : Number(homeScore), awayScore: awayScore === '' ? null : Number(awayScore), removeThumbnail, duplicateConfirmed };
    setSubmitting(true);
    try {
      const updatedContent = await updateContent(content.id, request, thumbnail || undefined);
      onBeforeRefresh?.();
      await Promise.all([useContentStore.getState().fetch(), useContentDetailStore.getState().fetch({ ignoreLoading: true, throwError: true })]);
      toast.success('스포츠 콘텐츠가 수정되었습니다.'); onOpenChange(false); onSuccess?.(updatedContent);
    } catch (error) {
      const duplicate = isAxiosError<ErrorResponse>(error) && error.response?.status === 409 && error.response.data.exceptionName === 'DuplicateContentConfirmationRequiredException';
      if (duplicate && !duplicateConfirmed) setDuplicateOpen(true); else toast.error(isAxiosError<ErrorResponse>(error) && error.response?.data.message ? error.response.data.message : '스포츠 콘텐츠 수정에 실패했습니다.');
    } finally { setSubmitting(false); }
  };

  if (!sport) return null;
  return <><Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}><DialogContent hideCloseButton className="max-h-[92vh] max-w-[780px] overflow-y-auto rounded-3xl border border-gray-800 bg-gray-900/95 p-8 backdrop-blur-[25px]">
    <div className="mb-6 flex items-center justify-between"><div><h2 className="text-title1-sb text-gray-50">스포츠 정보 수정</h2><p className="mt-1 text-body3-m text-gray-500">경기 정보와 썸네일을 수정합니다.</p></div><button type="button" onClick={() => onOpenChange(false)} disabled={submitting}><img src={icX} alt="닫기" className="size-6" /></button></div>
    <div className="flex flex-col gap-6">
      <section className="grid gap-5 sm:grid-cols-[210px_1fr]"><div><Label className="text-body2-sb text-gray-300">썸네일</Label><div className="mt-2 flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-gray-800">{thumbnailPreview ? <img src={thumbnailPreview} alt="경기 썸네일 미리보기" className="h-full w-full object-cover" /> : <ImageOff className="size-8 text-gray-600" />}</div></div><div className="flex flex-col justify-end gap-3"><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={changeThumbnail} disabled={removeThumbnail} className="border-gray-700 bg-gray-800 text-gray-300" />{content.thumbnailUrl && <label className="flex cursor-pointer items-center gap-2 text-body3-m text-gray-300"><input type="checkbox" checked={removeThumbnail} onChange={toggleRemoveThumbnail} className="accent-pink-500" />현재 썸네일 삭제</label>}<p className="text-caption1-m text-gray-500">JPG, PNG, WebP · 최대 5MB</p></div></section>
      <Field label="제목" required><Input value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field>
      <Field label="설명" required><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full resize-none rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-body2-m text-gray-50 outline-none focus:ring-2 focus:ring-pink-500" /></Field>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="종목" required><Select value={sportTypeId} onValueChange={setSportTypeId} disabled={loadingTypes}><SelectTrigger className="border-gray-700 bg-gray-800 text-gray-50"><SelectValue placeholder="종목 선택" /></SelectTrigger><SelectContent className="border-gray-600 bg-gray-800">{sportTypes.map((item) => <SelectItem key={item.id} value={item.id} className="text-gray-50 focus:bg-gray-700 focus:text-white">{getSportTypeLabel(item.code, item.name)}</SelectItem>)}</SelectContent></Select></Field><Field label="경기 예정 일시"><Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50 [color-scheme:dark]" /><p className="text-caption1-m text-gray-500">대한민국 시간 기준</p></Field></div>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="홈팀" required><Input value={homeTeam} maxLength={255} onChange={(e) => setHomeTeam(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="원정팀" required><Input value={awayTeam} maxLength={255} onChange={(e) => setAwayTeam(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field></div>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="홈팀 점수"><Input type="number" min={0} step={1} value={homeScore} onChange={(e) => setHomeScore(e.target.value)} placeholder="미입력" className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="원정팀 점수"><Input type="number" min={0} step={1} value={awayScore} onChange={(e) => setAwayScore(e.target.value)} placeholder="미입력" className="border-gray-700 bg-gray-800 text-gray-50" /></Field></div>
      <div className="grid gap-5 sm:grid-cols-3"><Field label="리그"><Input value={league} maxLength={255} onChange={(e) => setLeague(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="시즌"><Input value={season} maxLength={100} onChange={(e) => setSeason(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="라운드"><Input value={round} maxLength={100} onChange={(e) => setRound(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field></div>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="경기장"><Input value={venue} maxLength={255} onChange={(e) => setVenue(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="개최 국가"><Input value={country} maxLength={100} onChange={(e) => setCountry(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field></div>
      <div className="sticky -bottom-8 z-10 flex gap-3 border-t border-gray-800 bg-gray-900/95 pb-1 pt-5"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="flex-1 border-gray-700 bg-transparent text-gray-300">취소</Button><Button type="button" onClick={() => void submit()} disabled={submitting || loadingTypes} className="flex-1 bg-pink-500 text-white hover:bg-pink-600">{submitting ? '저장 중...' : '수정 내용 저장'}</Button></div>
    </div>
  </DialogContent></Dialog><ConfirmDialog open={duplicateOpen} onOpenChange={setDuplicateOpen} title="중복 경기 확인" description="같은 제목, 팀, 경기 일시의 스포츠 콘텐츠가 이미 있습니다. 그래도 수정하시겠습니까?" confirmText="수정" cancelText="취소" onConfirm={() => void submit(true)} /></>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) { return <div className="flex flex-col gap-2"><Label className="text-body2-sb text-gray-300">{label} {required && <span className="text-pink-500">*</span>}</Label>{children}</div>; }
