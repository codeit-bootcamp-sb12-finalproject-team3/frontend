import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCircle2, ImageOff, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { createContent, getContentGenres, getContentPlatformCatalog, getContentPlatforms, getContentSportTypes, restoreContentSeason, searchContentSeriesForAdmin, updateContent } from '@/lib/api/contents';
import { getSportTypeLabel } from '@/lib/sport-types';
import useContentStore from '@/lib/stores/useContentStore';
import useContentDetailStore from '@/lib/stores/useContentDetailStore';
import type { ContentCastCreateRequest, ContentCreateRequest, ContentDto, ContentGenre, ContentPlatformCatalogItem, ContentPlatformCreateRequest, ContentResponse, ContentSeriesSuggestion, ContentSportType, ContentSummaryResponse, ContentType, ContentUpdateRequest, ErrorResponse } from '@/lib/types';
import icX from '@/assets/ic_X.svg';

const labels: Record<ContentType, string> = { movie: '영화', tvSeries: '시리즈', sport: '스포츠' };
interface Props { mode: 'create' | 'edit'; open: boolean; onOpenChange: (open: boolean) => void; initialData?: ContentDto | ContentResponse | ContentSummaryResponse; onBeforeRefresh?: () => void; onSuccess?: (content: ContentResponse) => void; onCreateSuccess?: (contentId: string) => void; }
const emptyCast = (): ContentCastCreateRequest => ({ name: '', roleName: '', profileImageUrl: '' });
const isDetail = (value: Props['initialData']): value is ContentResponse => Boolean(value && 'cast' in value && 'movie' in value && 'englishTitle' in value);
type ContentApiErrorResponse = ErrorResponse & { code?: string; exceptionName?: string; details?: Record<string, string> };

const normalizeReleaseDate = (input: string): string | null => {
  const value = input.trim();
  if (!value) return '';

  let year: number;
  let month: number;
  let day: number;
  const digits = value.replace(/\D/g, '');
  const parts = value.split(/\D+/).filter(Boolean);

  if (digits.length === 8 && parts.length === 1) {
    if (/^(19|20)\d{6}$/.test(digits)) {
      year = Number(digits.slice(0, 4)); month = Number(digits.slice(4, 6)); day = Number(digits.slice(6, 8));
    } else {
      year = Number(digits.slice(4, 8));
      const first = Number(digits.slice(0, 2));
      const second = Number(digits.slice(2, 4));
      if (first > 12) { day = first; month = second; } else { month = first; day = second; }
    }
  } else if (parts.length === 3 && parts[0].length === 4) {
    [year, month, day] = parts.map(Number);
  } else if (parts.length === 3 && parts[2].length === 4) {
    year = Number(parts[2]);
    const first = Number(parts[0]);
    const second = Number(parts[1]);
    if (first > 12) { day = first; month = second; } else { month = first; day = second; }
  } else {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1000 || year > 9999 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export default function ContentFormDialog({ mode, open, onOpenChange, initialData, onBeforeRefresh, onSuccess, onCreateSuccess }: Props) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [englishTitle, setEnglishTitle] = useState('');
  const [seriesTitle, setSeriesTitle] = useState('');
  const [seasonNumber, setSeasonNumber] = useState('');
  const [episodeCount, setEpisodeCount] = useState('');
  const [description, setDescription] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [runtime, setRuntime] = useState('');
  const [type, setType] = useState<ContentType>('movie');
  const [seriesMode, setSeriesMode] = useState<'new' | 'existing'>('new');
  const [seriesQuery, setSeriesQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<ContentSeriesSuggestion | null>(null);
  const [seriesSuggestions, setSeriesSuggestions] = useState<ContentSeriesSuggestion[]>([]);
  const [seriesSearchLoading, setSeriesSearchLoading] = useState(false);
  const [seriesSearchError, setSeriesSearchError] = useState(false);
  const [seriesListOpen, setSeriesListOpen] = useState(false);
  const [activeSeriesIndex, setActiveSeriesIndex] = useState(-1);
  const seriesSearchCache = useRef(new Map<string, ContentSeriesSuggestion[]>());
  const [sportTypes, setSportTypes] = useState<ContentSportType[]>([]);
  const [sportTypeId, setSportTypeId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [league, setLeague] = useState('');
  const [sportSeason, setSportSeason] = useState('');
  const [round, setRound] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [venue, setVenue] = useState('');
  const [country, setCountry] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [genres, setGenres] = useState<ContentGenre[]>([]);
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [genreQuery, setGenreQuery] = useState('');
  const [casts, setCasts] = useState<ContentCastCreateRequest[]>([]);
  const [catalog, setCatalog] = useState<ContentPlatformCatalogItem[]>([]);
  const [platforms, setPlatforms] = useState<ContentPlatformCreateRequest[]>([]);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState<{ hiddenSeasonId: string; seasonNumber: number } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const movieEdit = mode === 'edit' && isDetail(initialData) && initialData.type === 'movie';
  const seasonEdit = mode === 'edit' && isDetail(initialData) && initialData.type === 'tvSeason';
  const seasonCreateReady = mode !== 'create' || type !== 'tvSeries' || seriesMode === 'new' || Boolean(selectedSeries);

  useEffect(() => {
    if (!open) return;
    setThumbnail(null); setRemoveThumbnail(false); setDuplicateOpen(false); setRestoreCandidate(null); setRestoring(false); setTagInput(''); setGenreQuery('');
    if (mode === 'edit' && initialData) {
      setTitle(initialData.title); setDescription(initialData.description || '');
      setType(initialData.type === 'tvSeason' ? 'tvSeries' : initialData.type);
      setTags(initialData.tags.map((tag) => typeof tag === 'string' ? tag : tag.name));
      setThumbnailPreview(initialData.thumbnailUrl || '');
      if (isDetail(initialData)) {
        setEnglishTitle(initialData.englishTitle || ''); setReleaseDate(initialData.releaseDate || '');
        setRuntime(initialData.movie?.runtime?.toString() || ''); setGenreIds(initialData.genres.map(({ id }) => id));
        setSeriesTitle(initialData.tvSeason?.seriesTitle || ''); setSeasonNumber(initialData.tvSeason?.seasonNumber?.toString() || ''); setEpisodeCount(initialData.tvSeason?.episodeCount?.toString() || '');
        setCasts(initialData.cast.map(({ name, roleName, profileImageUrl }) => ({ name, roleName: roleName || '', profileImageUrl: profileImageUrl || '' })));
      }
    } else {
      setTitle(''); setEnglishTitle(''); setSeriesTitle(''); setSeasonNumber(''); setEpisodeCount(''); setDescription(''); setReleaseDate(''); setRuntime(''); setType('movie');
      setSeriesMode('new'); setSeriesQuery(''); setSelectedSeries(null); setSeriesSuggestions([]); setSeriesSearchLoading(false); setSeriesSearchError(false); setSeriesListOpen(false); setActiveSeriesIndex(-1); setSportTypeId(''); setScheduledAt(''); setLeague(''); setSportSeason(''); setRound(''); setHomeTeam(''); setAwayTeam(''); setHomeScore(''); setAwayScore(''); setVenue(''); setCountry('');
      setTags([]); setGenreIds([]); setCasts([]); setPlatforms([]); setThumbnailPreview('');
    }
  }, [mode, initialData, open]);

  useEffect(() => {
    if (!open || (type !== 'movie' && type !== 'tvSeries' && !seasonEdit)) return;
    let cancelled = false;
    setLoadingOptions(true);
    void Promise.all([getContentGenres(type === 'tvSeries' || seasonEdit ? 'tvSeries' : 'movie'), getContentPlatformCatalog()]).then(async ([genreItems, platformItems]) => {
      if (cancelled) return;
      setGenres(genreItems); setCatalog(platformItems);
      if (mode === 'edit' && initialData) {
        const current = await getContentPlatforms(initialData.id);
        if (!cancelled) setPlatforms(current.otts.map(({ platformId, url }) => ({ platformId, url })));
      }
    }).catch((error) => { console.error(error); if (!cancelled) toast.error('장르 또는 플랫폼 목록을 불러오지 못했습니다.'); })
      .finally(() => { if (!cancelled) setLoadingOptions(false); });
    return () => { cancelled = true; };
  }, [mode, open, type, initialData, seasonEdit]);

  useEffect(() => {
    if (!open || mode !== 'create' || type !== 'sport') return;
    setLoadingOptions(true);
    void getContentSportTypes().then(setSportTypes).catch(() => toast.error('스포츠 종목 목록을 불러오지 못했습니다.')).finally(() => setLoadingOptions(false));
  }, [mode, open, type]);

  useEffect(() => {
    if (!open || mode !== 'create' || type !== 'tvSeries' || seriesMode !== 'existing' || seriesQuery.trim().length === 0 || selectedSeries) {
      setSeriesSuggestions([]);
      setSeriesSearchLoading(false);
      setSeriesSearchError(false);
      setSeriesListOpen(false);
      setActiveSeriesIndex(-1);
      return;
    }
    const normalizedQuery = seriesQuery.trim().toLocaleLowerCase();
    const cached = seriesSearchCache.current.get(normalizedQuery);
    if (cached) {
      setSeriesSuggestions(cached);
      setSeriesSearchLoading(false);
      setSeriesSearchError(false);
      setSeriesListOpen(!selectedSeries);
      setActiveSeriesIndex(-1);
      return;
    }
    const controller = new AbortController();
    setSeriesSearchLoading(true);
    setSeriesSearchError(false);
    setSeriesListOpen(!selectedSeries);
    setActiveSeriesIndex(-1);
    const timer = window.setTimeout(() => {
      void searchContentSeriesForAdmin(seriesQuery, controller.signal).then((response) => {
        seriesSearchCache.current.set(normalizedQuery, response.data);
        setSeriesSuggestions(response.data);
      }).catch(() => {
        if (!controller.signal.aborted) {
          setSeriesSuggestions([]);
          setSeriesSearchError(true);
        }
      }).finally(() => {
        if (!controller.signal.aborted) setSeriesSearchLoading(false);
      });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [mode, open, selectedSeries, seriesMode, seriesQuery, type]);

  const selectedPlatforms = useMemo(() => new Set(platforms.map(({ platformId }) => platformId)), [platforms]);
  const changeCreateType = (nextType: ContentType) => {
    setType(nextType);
    setTitle(''); setEnglishTitle(''); setSeriesTitle(''); setDescription(''); setReleaseDate(''); setRuntime('');
    setSeasonNumber(''); setEpisodeCount(''); setTags([]); setTagInput(''); setGenreIds([]); setGenreQuery(''); setCasts([]); setPlatforms([]);
    setThumbnail(null); setThumbnailPreview(''); setSeriesMode('new'); setSeriesQuery(''); setSelectedSeries(null); setSeriesSuggestions([]); setSeriesSearchLoading(false); setSeriesSearchError(false); setSeriesListOpen(false); setActiveSeriesIndex(-1);
    setSportTypeId(''); setScheduledAt(''); setLeague(''); setSportSeason(''); setRound(''); setHomeTeam(''); setAwayTeam(''); setHomeScore(''); setAwayScore(''); setVenue(''); setCountry('');
  };
  const changeThumbnail = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('JPG, PNG, WebP 이미지만 선택할 수 있습니다.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('썸네일은 5MB 이하만 업로드할 수 있습니다.'); return; }
    setThumbnail(file); setRemoveThumbnail(false);
    const reader = new FileReader(); reader.onloadend = () => setThumbnailPreview(reader.result as string); reader.readAsDataURL(file);
  };
  const toggleRemoveThumbnail = () => { const next = !removeThumbnail; setRemoveThumbnail(next); if (next) { setThumbnail(null); setThumbnailPreview(''); } else setThumbnailPreview(initialData?.thumbnailUrl || ''); };
  const addTag = () => { const value = tagInput.trim(); if (!value || tags.includes(value)) return; if (value.length > 100) return void toast.error('태그는 100자 이하로 입력해주세요.'); if (tags.length >= 3) return void toast.error('태그는 최대 3개까지 등록할 수 있습니다.'); setTags([...tags, value]); setTagInput(''); };
  const tagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addTag(); } };
  const selectSeries = (series: ContentSeriesSuggestion) => {
    setSelectedSeries(series);
    setSeriesQuery(series.title);
    setSeriesListOpen(false);
    setActiveSeriesIndex(-1);
  };
  const seriesSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setSeriesListOpen(false);
      setActiveSeriesIndex(-1);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (seriesSuggestions.length === 0) return;
      event.preventDefault();
      setSeriesListOpen(true);
      setActiveSeriesIndex((current) => {
        if (event.key === 'ArrowDown') return current >= seriesSuggestions.length - 1 ? 0 : current + 1;
        return current <= 0 ? seriesSuggestions.length - 1 : current - 1;
      });
      return;
    }
    if (event.key === 'Enter' && seriesListOpen && activeSeriesIndex >= 0) {
      event.preventDefault();
      selectSeries(seriesSuggestions[activeSeriesIndex]);
    }
  };
  const toggleGenre = (id: string) => setGenreIds((current) => {
    if (current.includes(id)) return current.filter((value) => value !== id);
    if (current.length >= 3) {
      toast.error('장르는 최대 3개까지 선택할 수 있습니다.');
      return current;
    }
    return [...current, id];
  });
  const updateCast = (index: number, key: keyof ContentCastCreateRequest, value: string) => setCasts((current) => current.map((cast, i) => i === index ? { ...cast, [key]: value } : cast));
  const togglePlatform = (platformId: string) => setPlatforms((current) => current.some((item) => item.platformId === platformId) ? current.filter((item) => item.platformId !== platformId) : [...current, { platformId, url: '' }]);
  const updatePlatformUrl = (platformId: string, url: string) => setPlatforms((current) => current.map((item) => item.platformId === platformId ? { ...item, url } : item));
  const normalizeDateField = () => {
    const normalized = normalizeReleaseDate(releaseDate);
    if (normalized === null) { toast.error(`${seasonEdit || type === 'tvSeries' ? '방영일' : '개봉일'}을 올바른 날짜로 입력해주세요. 예: 2023-08-15`); return; }
    setReleaseDate(normalized);
  };

  const valid = () => {
    if (!title.trim()) return toast.error('제목을 입력해주세요.'), false;
    if (title.trim().length > 255) return toast.error('제목은 255자 이하로 입력해주세요.'), false;
    if (!(mode === 'create' && type === 'sport') && !description.trim()) return toast.error('설명을 입력해주세요.'), false;
    const movieOrSeason = (mode === 'create' && type !== 'sport') || movieEdit || seasonEdit;
    if (movieOrSeason && englishTitle.trim().length > 255) return toast.error('영문 제목은 255자 이하로 입력해주세요.'), false;
    if (movieOrSeason && normalizeReleaseDate(releaseDate) === null) return toast.error(`${type === 'tvSeries' || seasonEdit ? '방영일' : '개봉일'}을 올바른 날짜로 입력해주세요. 예: 2023-08-15`), false;
    if (movieOrSeason && genreIds.length === 0) return toast.error('장르를 1개 이상 선택해주세요.'), false;
    if (((mode === 'create' && type === 'movie') || movieEdit) && runtime && (!Number.isInteger(Number(runtime)) || Number(runtime) <= 0)) return toast.error('러닝타임은 1분 이상의 정수로 입력해주세요.'), false;
    if (movieOrSeason && casts.some(({ name }) => !name.trim())) return toast.error('출연진 이름을 입력해주세요.'), false;
    if (movieOrSeason && casts.some((cast) => cast.name.trim().length > 100 || (cast.roleName?.trim().length || 0) > 255 || (cast.profileImageUrl?.trim().length || 0) > 500)) return toast.error('출연진 입력 길이를 확인해주세요.'), false;
    if (movieOrSeason && platforms.some(({ url }) => !/^https?:\/\/.+/.test(url.trim()) || url.trim().length > 1000)) return toast.error('선택한 플랫폼의 http(s) 주소를 입력해주세요.'), false;
    if (mode === 'create' && type === 'tvSeries' && seriesMode === 'new' && !seriesTitle.trim()) return toast.error('신규 시리즈명을 입력해주세요.'), false;
    if (mode === 'create' && type === 'tvSeries' && seriesMode === 'existing' && !selectedSeries) return toast.error('기존 시리즈를 검색해 선택해주세요.'), false;
    if (mode === 'create' && type === 'tvSeries' && (!Number.isInteger(Number(seasonNumber)) || Number(seasonNumber) < 0)) return toast.error('시즌 번호는 0 이상의 정수로 입력해주세요.'), false;
    if (mode === 'create' && type === 'tvSeries' && episodeCount && (!Number.isInteger(Number(episodeCount)) || Number(episodeCount) < 0)) return toast.error('전체 회차 수는 0 이상의 정수로 입력해주세요.'), false;
    if (mode === 'create' && type === 'sport') {
      if (!sportTypeId) return toast.error('종목을 선택해주세요.'), false;
      if (!homeTeam.trim() || !awayTeam.trim()) return toast.error('홈팀과 원정팀을 입력해주세요.'), false;
      if (scheduledAt && Number.isNaN(new Date(`${scheduledAt}:00+09:00`).getTime())) return toast.error('경기 예정 일시를 올바르게 입력해주세요.'), false;
      if ((homeScore === '') !== (awayScore === '')) return toast.error('홈팀과 원정팀 점수는 함께 입력하거나 함께 비워주세요.'), false;
      if ([homeScore, awayScore].some((value) => value !== '' && (!Number.isInteger(Number(value)) || Number(value) < 0))) return toast.error('점수는 0 이상의 정수로 입력해주세요.'), false;
    }
    if (seasonEdit && !seriesTitle.trim()) return toast.error('시리즈명을 입력해주세요.'), false;
    if (seasonEdit && (!Number.isInteger(Number(seasonNumber)) || Number(seasonNumber) < 0)) return toast.error('시즌 번호는 0 이상의 정수로 입력해주세요.'), false;
    if (seasonEdit && episodeCount && (!Number.isInteger(Number(episodeCount)) || Number(episodeCount) < 0)) return toast.error('전체 회차 수는 0 이상의 정수로 입력해주세요.'), false;
    if (seasonEdit && episodeCount && isDetail(initialData) && initialData.tvSeason && Number(episodeCount) < initialData.tvSeason.registeredEpisodeCount) return toast.error(`전체 회차 수는 현재 등록된 ${initialData.tvSeason.registeredEpisodeCount}편보다 작게 설정할 수 없습니다.`), false;
    if (seasonEdit && casts.some(({ name }) => !name.trim())) return toast.error('출연진 이름을 입력해주세요.'), false;
    if (seasonEdit && casts.some((cast) => cast.name.trim().length > 100 || (cast.roleName?.trim().length || 0) > 255 || (cast.profileImageUrl?.trim().length || 0) > 500)) return toast.error('출연진 입력 길이를 확인해주세요.'), false;
    if (seasonEdit && platforms.some(({ url }) => !/^https?:\/\/.+/.test(url.trim()) || url.trim().length > 1000)) return toast.error('선택한 플랫폼의 http(s) 주소를 입력해주세요.'), false;
    return true;
  };
  const updateRequest = (duplicateConfirmed: boolean): ContentUpdateRequest => movieEdit ? ({
    title: title.trim(), englishTitle: englishTitle.trim() || null, description: description.trim(), releaseDate: normalizeReleaseDate(releaseDate) || null,
    runtime: runtime ? Number(runtime) : null, genreIds, tags,
    casts: casts.map((cast) => ({ name: cast.name.trim(), roleName: cast.roleName?.trim() || undefined, profileImageUrl: cast.profileImageUrl?.trim() || undefined })),
    platforms: platforms.map((item) => ({ ...item, url: item.url.trim() })), removeThumbnail, duplicateConfirmed,
  }) : seasonEdit ? ({
    title: title.trim(), seriesTitle: seriesTitle.trim(), englishTitle: englishTitle.trim() || null,
    description: description.trim(), releaseDate: normalizeReleaseDate(releaseDate) || null,
    seasonNumber: Number(seasonNumber), episodeCount: episodeCount ? Number(episodeCount) : null,
    genreIds, tags, casts: casts.map((cast) => ({ name: cast.name.trim(), roleName: cast.roleName?.trim() || undefined, profileImageUrl: cast.profileImageUrl?.trim() || undefined })),
    platforms: platforms.map((item) => ({ ...item, url: item.url.trim() })), removeThumbnail, duplicateConfirmed,
  }) : ({ title: title.trim(), description: description.trim(), tags, duplicateConfirmed });
  const restoreDeletedSeason = async () => {
    if (!restoreCandidate || restoring) return;
    setRestoring(true);
    try {
      const restoredSeason = await restoreContentSeason(restoreCandidate.hiddenSeasonId);
      onBeforeRefresh?.();
      await useContentStore.getState().fetch();
      toast.success(`시즌 ${restoreCandidate.seasonNumber}을(를) 복원했습니다.`);
      setRestoreCandidate(null);
      onOpenChange(false);
      if (mode === 'create' && onCreateSuccess) onCreateSuccess(restoredSeason.id);
      else navigate(`/contents/${restoredSeason.id}`);
    } catch (error) {
      const message = isAxiosError<ContentApiErrorResponse>(error) && error.response?.data.message;
      toast.error(message || '삭제된 시즌을 복원하지 못했습니다.');
      console.error(error);
    } finally {
      setRestoring(false);
    }
  };
  const submit = async (duplicateConfirmed = false) => {
    if (!valid()) return; setSubmitting(true);
    try {
      if (mode === 'create') {
        const cleanCasts = casts.map((cast) => ({ name: cast.name.trim(), roleName: cast.roleName?.trim() || undefined, profileImageUrl: cast.profileImageUrl?.trim() || undefined }));
        const cleanPlatforms = platforms.map((item) => ({ ...item, url: item.url.trim() }));
        let request: ContentCreateRequest;
        let namedThumbnails: Record<string, File> | undefined;
        if (type === 'movie') {
          request = { type: 'movie', title: title.trim(), englishTitle: englishTitle.trim() || undefined, description: description.trim(), genreIds, tags, releaseDate: normalizeReleaseDate(releaseDate) || undefined, runtime: runtime ? Number(runtime) : undefined, casts: cleanCasts, platforms: cleanPlatforms, duplicateConfirmed };
        } else if (type === 'tvSeries' && seriesMode === 'new') {
          const thumbnailKey = thumbnail ? 'season-0' : undefined;
          request = { type: 'tvSeries', title: seriesTitle.trim(), englishTitle: englishTitle.trim() || undefined, duplicateConfirmed, seasons: [{ seasonNumber: Number(seasonNumber), title: title.trim(), description: description.trim(), thumbnailKey, releaseDate: normalizeReleaseDate(releaseDate) || undefined, episodeCount: episodeCount ? Number(episodeCount) : undefined, genreIds, tags, casts: cleanCasts, platforms: cleanPlatforms }] };
          namedThumbnails = thumbnail ? { 'thumbnails[season-0]': thumbnail } : undefined;
        } else if (type === 'tvSeries') {
          request = { type: 'tvSeason', parentContentId: selectedSeries!.id, seasonNumber: Number(seasonNumber), title: title.trim(), description: description.trim(), releaseDate: normalizeReleaseDate(releaseDate) || undefined, episodeCount: episodeCount ? Number(episodeCount) : undefined, genreIds, tags, casts: cleanCasts, platforms: cleanPlatforms };
        } else {
          request = { type: 'sport', title: title.trim(), description: description.trim() || undefined, sportTypeId, homeTeam: homeTeam.trim(), awayTeam: awayTeam.trim(), scheduledAt: scheduledAt ? new Date(`${scheduledAt}:00+09:00`).toISOString() : undefined, league: league.trim() || undefined, season: sportSeason.trim() || undefined, round: round.trim() || undefined, venue: venue.trim() || undefined, country: country.trim() || undefined, homeScore: homeScore === '' ? undefined : Number(homeScore), awayScore: awayScore === '' ? undefined : Number(awayScore), duplicateConfirmed };
        }
        const createdContent = await createContent(request, type === 'tvSeries' && seriesMode === 'new' ? undefined : thumbnail || undefined, namedThumbnails);
        const createdContentId = createdContent.contentIds[0];
        if (!createdContentId) throw new Error('등록된 콘텐츠 ID를 확인할 수 없습니다.');
        toast.success('콘텐츠가 등록되었습니다.');
        onOpenChange(false);
        onCreateSuccess?.(createdContentId);
        return;
      } else if (initialData) {
        const updatedContent = await updateContent(initialData.id, updateRequest(duplicateConfirmed), thumbnail || undefined);
        onBeforeRefresh?.();
        await Promise.all([useContentStore.getState().fetch(), useContentDetailStore.getState().fetch({ ignoreLoading: true, throwError: true })]);
        toast.success('콘텐츠가 수정되었습니다.');
        onOpenChange(false);
        onSuccess?.(updatedContent);
        return;
      }
      onOpenChange(false);
    } catch (error) {
      const errorData = isAxiosError<ContentApiErrorResponse>(error) ? error.response?.data : undefined;
      const errorStatus = isAxiosError(error) ? error.response?.status : undefined;
      const errorCode = errorData?.code ?? errorData?.exceptionName;
      const duplicate = errorStatus === 409 && (errorCode === 'DUPLICATE_CONFIRMATION_REQUIRED' || errorCode === 'DuplicateContentConfirmationRequiredException');
      const hiddenSeason = errorStatus === 409 && (errorCode === 'HIDDEN_SEASON_ALREADY_EXISTS' || errorCode === 'HiddenSeasonAlreadyExistsException');
      const hiddenSeasonId = errorData?.details?.hiddenSeasonId;
      if (hiddenSeason && hiddenSeasonId) {
        setRestoreCandidate({ hiddenSeasonId, seasonNumber: Number(errorData?.details?.seasonNumber ?? seasonNumber) });
      } else if (duplicate && !duplicateConfirmed) setDuplicateOpen(true);
      else toast.error(errorData?.message || (mode === 'create' ? '콘텐츠 등록에 실패했습니다.' : '콘텐츠 수정에 실패했습니다.'));
      console.error(error);
    } finally { setSubmitting(false); }
  };

  return <>
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
      <DialogContent hideCloseButton className="max-h-[92vh] max-w-[760px] overflow-y-auto rounded-3xl border border-gray-800 bg-gray-900/95 p-8 backdrop-blur-[25px]">
        <div className="mb-6 flex items-center justify-between"><div><h2 className="text-title1-sb text-gray-50">{mode === 'create' && type === 'tvSeries' ? `${seriesMode === 'new' ? '신규' : '기존'} 시리즈 · 시즌 등록` : mode === 'create' ? '콘텐츠 등록' : seasonEdit ? 'TV 시즌 정보 수정' : '영화 정보 수정'}</h2>{mode === 'create' && type === 'tvSeries' && <p className="mt-1 text-body3-m text-gray-500">{seriesMode === 'new' ? '시리즈 정보와 첫 시즌 정보를 함께 등록합니다.' : '선택한 시리즈에 새로운 시즌을 추가합니다.'}</p>}{(movieEdit || seasonEdit) && <p className="mt-1 text-body3-m text-gray-500">상세 정보와 연결 정보를 수정합니다.</p>}</div><button type="button" onClick={() => onOpenChange(false)} disabled={submitting}><img src={icX} alt="닫기" className="size-6" /></button></div>
        <div className="flex flex-col gap-7">
          {mode === 'create' ? <Field label="콘텐츠 유형" required><Select value={type} onValueChange={(value) => changeCreateType(value as ContentType)}><SelectTrigger className="border-gray-700 bg-gray-800 text-gray-50"><SelectValue /></SelectTrigger><SelectContent className="border-gray-600 bg-gray-800">{Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value} className="text-gray-50 focus:bg-gray-700 focus:text-white">{label}</SelectItem>)}</SelectContent></Select></Field> : <Field label="콘텐츠 유형"><ReadOnly value={seasonEdit ? 'TV 시즌' : labels[type]} /></Field>}
          {mode === 'create' && type === 'tvSeries' && <Field label="시리즈 등록 방식" required><div className="grid grid-cols-2 gap-2">{(['new', 'existing'] as const).map((value) => <button key={value} type="button" aria-pressed={seriesMode === value} onClick={() => { setSeriesMode(value); setSelectedSeries(null); setSeriesQuery(''); }} className={seriesMode === value ? 'rounded-xl border border-pink-500 bg-pink-500/15 px-4 py-3 text-body2-sb text-pink-300' : 'rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-body2-m text-gray-300'}>{value === 'new' ? '신규 시리즈' : '기존 시리즈'}</button>)}</div></Field>}
          {!(mode === 'create' && type === 'tvSeries') && <section className={`grid gap-5 ${mode === 'create' && type === 'sport' ? 'sm:grid-cols-[210px_1fr]' : 'sm:grid-cols-[180px_1fr]'}`}><div><Label className="text-body2-sb text-gray-300">썸네일</Label><div className={`mt-2 flex items-center justify-center overflow-hidden rounded-2xl bg-gray-800 ${mode === 'create' && type === 'sport' ? 'aspect-video' : 'aspect-[2/3]'}`}>{thumbnailPreview ? <img src={thumbnailPreview} alt={type === 'sport' ? '경기 썸네일 미리보기' : '썸네일 미리보기'} className="h-full w-full object-cover" /> : <ImageOff className="size-8 text-gray-600" />}</div></div><div className="flex flex-col justify-end gap-3"><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={changeThumbnail} disabled={removeThumbnail} className="border-gray-700 bg-gray-800 text-gray-300" />{mode === 'edit' && initialData?.thumbnailUrl && <label className="flex cursor-pointer items-center gap-2 text-body3-m text-gray-300"><input type="checkbox" checked={removeThumbnail} onChange={toggleRemoveThumbnail} className="accent-pink-500" />현재 썸네일 삭제</label>}<p className="text-caption1-m text-gray-500">JPG, PNG, WebP · 최대 5MB · 선택 입력</p></div></section>}
          {mode === 'create' && type === 'tvSeries' && seriesMode === 'new' && <div className="grid gap-5 sm:grid-cols-2"><Field label="시리즈명" required><Input value={seriesTitle} maxLength={255} onChange={(e) => setSeriesTitle(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="영문 시리즈명"><Input value={englishTitle} maxLength={255} onChange={(e) => setEnglishTitle(e.target.value)} placeholder="선택 입력" className="border-gray-700 bg-gray-800 text-gray-50" /></Field></div>}
          {mode === 'create' && type === 'tvSeries' && seriesMode === 'existing' && <Field label="기존 시리즈" required><div className="relative"><Input role="combobox" aria-autocomplete="list" aria-expanded={seriesListOpen} aria-controls="series-search-listbox" aria-activedescendant={activeSeriesIndex >= 0 ? `series-option-${seriesSuggestions[activeSeriesIndex]?.id}` : undefined} value={seriesQuery} maxLength={255} onFocus={() => { if (seriesQuery.trim() && !selectedSeries) setSeriesListOpen(true); }} onKeyDown={seriesSearchKeyDown} onChange={(e) => { setSeriesQuery(e.target.value); setSelectedSeries(null); setSeriesListOpen(Boolean(e.target.value.trim())); }} placeholder="시리즈 제목 검색" className="border-gray-700 bg-gray-800 text-gray-50" />{seriesListOpen && seriesQuery.trim() && !selectedSeries && <div id="series-search-listbox" role="listbox" aria-label="기존 시리즈 검색 결과" className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 p-1 shadow-xl">{seriesSearchLoading ? <p className="px-3 py-3 text-body3-m text-gray-400" role="status">시리즈를 검색하는 중입니다.</p> : seriesSearchError ? <div className="px-3 py-3"><p className="text-body3-sb text-red-400">검색 요청에 실패했습니다.</p><p className="mt-1 text-caption1-m text-gray-500">검색어를 수정하거나 잠시 후 다시 시도해주세요.</p></div> : seriesSuggestions.length === 0 ? <div className="px-3 py-3"><p className="text-body3-m text-gray-400">검색 결과가 없습니다.</p><p className="mt-1 text-caption1-m text-gray-500">다른 제목으로 검색해주세요.</p></div> : <>{seriesSuggestions.map((series, index) => <button id={`series-option-${series.id}`} role="option" aria-selected={activeSeriesIndex === index} key={series.id} type="button" onMouseEnter={() => setActiveSeriesIndex(index)} onClick={() => selectSeries(series)} className={`block w-full rounded-lg px-3 py-2 text-left ${activeSeriesIndex === index ? 'bg-gray-800' : 'hover:bg-gray-800'}`}><span className="block text-body3-sb text-gray-100">{series.title}</span>{series.englishTitle && <span className="block text-caption1-m text-gray-500">{series.englishTitle}</span>}</button>)}<p className="px-3 py-2 text-caption1-m text-gray-600">최대 10개 결과 · 찾는 시리즈가 없으면 검색어를 더 구체적으로 입력해주세요.</p></>}</div>}</div>{selectedSeries && <div className="flex items-center justify-between rounded-xl border border-pink-500/40 bg-pink-500/10 px-4 py-3"><div className="flex min-w-0 items-start gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-pink-400" /><div className="min-w-0"><p className="text-caption1-sb text-pink-300">선택된 시리즈</p><p className="truncate text-body2-sb text-gray-100">{selectedSeries.title}</p>{selectedSeries.englishTitle && <p className="truncate text-caption1-m text-gray-400">{selectedSeries.englishTitle}</p>}</div></div><button type="button" onClick={() => { setSelectedSeries(null); setSeriesQuery(''); setSeriesSuggestions([]); setSeriesListOpen(false); }} className="ml-3 shrink-0 rounded-lg px-2 py-1 text-caption1-sb text-gray-400 hover:bg-gray-800 hover:text-white">다시 선택</button></div>}</Field>}
          {seasonEdit && <div className="grid gap-5 sm:grid-cols-2"><Field label="시리즈명" required><Input value={seriesTitle} maxLength={255} onChange={(e) => setSeriesTitle(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="영문 시리즈명"><Input value={englishTitle} maxLength={255} onChange={(e) => setEnglishTitle(e.target.value)} placeholder="선택 입력" className="border-gray-700 bg-gray-800 text-gray-50" /></Field></div>}
          {mode === 'create' && type === 'tvSeries' && seasonCreateReady && <SeasonCreateBasics thumbnailPreview={thumbnailPreview} changeThumbnail={changeThumbnail} title={title} setTitle={setTitle} releaseDate={releaseDate} setReleaseDate={setReleaseDate} normalizeDateField={normalizeDateField} seasonNumber={seasonNumber} setSeasonNumber={setSeasonNumber} episodeCount={episodeCount} setEpisodeCount={setEpisodeCount} heading={seriesMode === 'new' ? '첫 시즌 정보' : '추가할 시즌 정보'} />}
          {!(mode === 'create' && type === 'tvSeries') && <div className="grid gap-5 sm:grid-cols-2"><Field label={seasonEdit ? '시즌 제목' : '제목'} required><Input value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field>{(movieEdit || (mode === 'create' && type === 'movie')) && <Field label="영문 제목"><Input value={englishTitle} maxLength={255} onChange={(e) => setEnglishTitle(e.target.value)} placeholder="선택 입력" className="border-gray-700 bg-gray-800 text-gray-50" /></Field>}</div>}
          {seasonCreateReady && <Field label="설명" required={!(mode === 'create' && type === 'sport')}><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full resize-none rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-body2-m text-gray-50 outline-none focus:ring-2 focus:ring-pink-500" /></Field>}
          {(((mode === 'create' && type === 'movie') || movieEdit)) && <><div className="grid gap-5 sm:grid-cols-2"><Field label="개봉일"><Input type="text" inputMode="numeric" value={releaseDate} maxLength={14} onChange={(e) => setReleaseDate(e.target.value)} onBlur={normalizeDateField} placeholder="YYYY-MM-DD" aria-describedby="release-date-help" className="border-gray-700 bg-gray-800 text-gray-50" /><p id="release-date-help" className="text-caption1-m text-gray-500">숫자만 또는 점·슬래시로 입력해도 YYYY-MM-DD로 변환됩니다.</p></Field><Field label="러닝타임(분)"><Input type="number" min={1} step={1} value={runtime} onChange={(e) => setRuntime(e.target.value)} placeholder="예: 180" className="border-gray-700 bg-gray-800 text-gray-50" /></Field></div><GenreSelector genres={genres} selectedIds={genreIds} query={genreQuery} onQueryChange={setGenreQuery} onToggle={toggleGenre} onClear={() => setGenreIds([])} loading={loadingOptions} /></>}
          {mode === 'create' && type === 'tvSeries' && seasonCreateReady && <GenreSelector genres={genres} selectedIds={genreIds} query={genreQuery} onQueryChange={setGenreQuery} onToggle={toggleGenre} onClear={() => setGenreIds([])} loading={loadingOptions} />}
          {mode === 'create' && type === 'sport' && <SportCreateFields sportTypes={sportTypes} sportTypeId={sportTypeId} setSportTypeId={setSportTypeId} scheduledAt={scheduledAt} setScheduledAt={setScheduledAt} league={league} setLeague={setLeague} season={sportSeason} setSeason={setSportSeason} round={round} setRound={setRound} homeTeam={homeTeam} setHomeTeam={setHomeTeam} awayTeam={awayTeam} setAwayTeam={setAwayTeam} homeScore={homeScore} setHomeScore={setHomeScore} awayScore={awayScore} setAwayScore={setAwayScore} venue={venue} setVenue={setVenue} country={country} setCountry={setCountry} />}
          {seasonEdit && <><div className="grid gap-5 sm:grid-cols-2"><Field label="방영일"><Input type="text" inputMode="numeric" value={releaseDate} maxLength={14} onChange={(e) => setReleaseDate(e.target.value)} onBlur={normalizeDateField} placeholder="YYYY-MM-DD" aria-describedby="season-air-date-help" className="border-gray-700 bg-gray-800 text-gray-50" /><p id="season-air-date-help" className="text-caption1-m text-gray-500">숫자만 또는 점·슬래시로 입력해도 YYYY-MM-DD로 변환됩니다.</p></Field><div className="grid grid-cols-2 gap-3"><Field label="시즌 번호" required><Input type="number" min={0} step={1} value={seasonNumber} onChange={(e) => setSeasonNumber(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="전체 회차 수"><Input type="number" min={isDetail(initialData) && initialData.tvSeason ? initialData.tvSeason.registeredEpisodeCount : 0} step={1} value={episodeCount} onChange={(e) => setEpisodeCount(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field></div></div><GenreSelector genres={genres} selectedIds={genreIds} query={genreQuery} onQueryChange={setGenreQuery} onToggle={toggleGenre} onClear={() => setGenreIds([])} loading={loadingOptions} /></>}
          {(mode !== 'create' || type !== 'sport') && seasonCreateReady && <Field label="태그"><div className="mb-2 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className="flex items-center gap-1 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-body3-m text-pink-300">#{tag}<button type="button" onClick={() => setTags(tags.filter((item) => item !== tag))} aria-label={`${tag} 태그 제거`}>×</button></span>)}</div><div className="flex gap-2"><Input value={tagInput} maxLength={100} onChange={(e) => setTagInput(e.target.value)} onKeyDown={tagKeyDown} placeholder="태그 입력 후 Enter" className="border-gray-700 bg-gray-800 text-gray-50" /><Button type="button" variant="outline" onClick={addTag} disabled={!tagInput.trim() || tags.length >= 3} className="border-gray-700 bg-gray-800 text-gray-300">추가</Button></div></Field>}
          {((mode === 'create' && type !== 'sport' && seasonCreateReady) || movieEdit) && <><section className="border-t border-gray-800 pt-6"><SectionTitle title="출연진" action="출연진 추가" onAction={() => setCasts([...casts, emptyCast()])} />{casts.length === 0 && <Empty value="등록된 출연진이 없습니다." />}<div className="space-y-3">{casts.map((cast, index) => <div key={index} className="grid gap-2 rounded-2xl border border-gray-800 bg-gray-950/50 p-4 sm:grid-cols-[1fr_1fr_1.4fr_auto]"><Input value={cast.name} maxLength={100} onChange={(e) => updateCast(index, 'name', e.target.value)} placeholder="이름 *" className="border-gray-700 bg-gray-800 text-gray-50" /><Input value={cast.roleName || ''} maxLength={255} onChange={(e) => updateCast(index, 'roleName', e.target.value)} placeholder="배역" className="border-gray-700 bg-gray-800 text-gray-50" /><Input value={cast.profileImageUrl || ''} maxLength={500} onChange={(e) => updateCast(index, 'profileImageUrl', e.target.value)} placeholder="사진 URL" className="border-gray-700 bg-gray-800 text-gray-50" /><button type="button" onClick={() => setCasts(casts.filter((_, i) => i !== index))} aria-label="출연진 삭제" className="flex size-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-800 hover:text-pink-300"><Trash2 className="size-4" /></button></div>)}</div></section>
          <section className="border-t border-gray-800 pt-6"><SectionTitle title="시청 가능한 플랫폼" /><p className="mb-4 text-caption1-m text-gray-500">플랫폼을 선택하고 해당 {type === 'tvSeries' ? '시즌' : '영화'}의 실제 제공 주소를 입력해주세요.</p>{loadingOptions ? <Empty value="플랫폼 목록을 불러오는 중입니다." /> : <div className="space-y-3">{catalog.map((platform) => { const selected = selectedPlatforms.has(platform.id); const url = platforms.find((item) => item.platformId === platform.id)?.url || ''; return <div key={platform.id} className="rounded-xl border border-gray-800 bg-gray-950/50 p-3"><label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={selected} onChange={() => togglePlatform(platform.id)} className="accent-pink-500" />{platform.logoUrl ? <img src={platform.logoUrl} alt="" className="size-8 rounded-lg object-cover" /> : <span className="size-8 rounded-lg bg-gray-800" />}<span className="text-body3-sb text-gray-200">{platform.name}</span></label>{selected && <Input value={url} maxLength={1000} onChange={(e) => updatePlatformUrl(platform.id, e.target.value)} placeholder="https://..." className="mt-3 border-gray-700 bg-gray-800 text-gray-50" />}</div>; })}</div>}</section></>}
          {seasonEdit && <SeasonRelationsEditor casts={casts} setCasts={setCasts} updateCast={updateCast} catalog={catalog} platforms={platforms} selectedPlatforms={selectedPlatforms} togglePlatform={togglePlatform} updatePlatformUrl={updatePlatformUrl} loading={loadingOptions} />}
          <div className="sticky -bottom-8 z-10 flex gap-3 border-t border-gray-800 bg-gray-900/95 pt-5 pb-1"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="flex-1 border-gray-700 bg-transparent text-gray-300">취소</Button><Button onClick={() => void submit()} disabled={submitting || loadingOptions} className="flex-1 bg-pink-500 text-white hover:bg-pink-600">{submitting ? '저장 중...' : mode === 'create' && type === 'tvSeries' ? '시즌 등록' : mode === 'create' ? '등록' : '수정 내용 저장'}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
    <ConfirmDialog open={duplicateOpen} onOpenChange={setDuplicateOpen} title={mode === 'create' && type === 'sport' ? '중복 경기 확인' : '중복 콘텐츠 확인'} description={mode === 'create' && type === 'movie' ? '같은 제목과 개봉일의 영화가 이미 있습니다. 그래도 등록하시겠습니까?' : mode === 'create' && type === 'sport' ? '같은 제목, 홈팀, 원정팀, 경기 예정 일시의 스포츠 콘텐츠가 이미 있습니다. 그래도 등록하시겠습니까?' : mode === 'create' ? '중복될 수 있는 콘텐츠가 이미 있습니다. 그래도 등록하시겠습니까?' : seasonEdit ? '같은 이름의 TV 시리즈가 이미 있습니다. 그래도 수정하시겠습니까?' : '같은 제목과 개봉일의 영화가 이미 있습니다. 그래도 수정하시겠습니까?'} confirmText={mode === 'create' ? '그래도 등록' : '수정'} cancelText="취소" onConfirm={() => void submit(true)} />
    <ConfirmDialog
      open={Boolean(restoreCandidate)}
      onOpenChange={(next) => { if (!next && !restoring) setRestoreCandidate(null); }}
      title="삭제된 시즌을 복원할까요?"
      description={mode === 'create'
        ? `선택한 시리즈에 삭제된 시즌 ${restoreCandidate?.seasonNumber ?? ''}이(가) 있습니다. 새로 입력한 내용은 반영되지 않으며, 기존 시즌 정보를 그대로 복원합니다.`
        : `변경하려는 시즌 번호에 삭제된 시즌 ${restoreCandidate?.seasonNumber ?? ''}이(가) 있습니다. 현재 수정 내용은 저장되지 않으며, 삭제된 시즌 정보를 그대로 복원합니다.`}
      confirmText={restoring ? '복원 중...' : '삭제된 시즌 복원'}
      cancelText="계속 입력"
      onConfirm={() => void restoreDeletedSeason()}
    />
  </>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) { return <div className="flex flex-col gap-2"><Label className="text-body2-sb text-gray-300">{label} {required && <span className="text-pink-500">*</span>}</Label>{children}</div>; }
function ReadOnly({ value }: { value: string }) { return <div className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-body2-m text-gray-500">{value}</div>; }
function Empty({ value }: { value: string }) { return <p className="rounded-xl border border-dashed border-gray-800 p-4 text-center text-body3-m text-gray-500">{value}</p>; }
function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) { return <div className="mb-4 flex items-center justify-between"><h3 className="text-body1-sb text-gray-100">{title}</h3>{action && <button type="button" onClick={onAction} className="flex items-center gap-1 text-body3-sb text-pink-300"><Plus className="size-4" />{action}</button>}</div>; }

function GenreSelector({ genres, selectedIds, query, onQueryChange, onToggle, onClear, loading }: {
  genres: ContentGenre[]; selectedIds: string[]; query: string; onQueryChange: (value: string) => void;
  onToggle: (id: string) => void; onClear: () => void; loading: boolean;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredGenres = normalizedQuery ? genres.filter(({ name }) => name.toLocaleLowerCase().includes(normalizedQuery)) : genres;
  const selectedGenres = genres.filter(({ id }) => selectedIds.includes(id));

  return <Field label="장르" required>
    {loading ? <Empty value="목록을 불러오는 중입니다." /> : <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-950/45">
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-body3-sb text-gray-200">선택됨 <span className="text-pink-300">{selectedIds.length}개</span></p>
          {selectedIds.length > 0 && <button type="button" onClick={onClear} className="text-caption1-sb text-gray-400 hover:text-pink-300">전체 해제</button>}
        </div>
        {selectedGenres.length > 0 ? <div className="mt-3 flex flex-wrap gap-2" aria-label="선택한 장르">
          {selectedGenres.map((genre) => <button key={genre.id} type="button" onClick={() => onToggle(genre.id)} aria-label={`${genre.name} 장르 선택 해제`} className="flex items-center gap-1.5 rounded-full border border-pink-500/40 bg-pink-500/15 px-3 py-1.5 text-body3-m text-pink-200 hover:bg-pink-500/25">{genre.name}<X className="size-3.5" aria-hidden="true" /></button>)}
        </div> : <p className="mt-2 text-caption1-m text-gray-500">아래 목록에서 장르를 1개 이상 선택해주세요.</p>}
      </div>
      <div className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
          <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="장르 검색" aria-label="장르 검색" className="border-gray-700 bg-gray-900 pl-9 pr-9 text-gray-50" />
          {query && <button type="button" onClick={() => onQueryChange('')} aria-label="장르 검색어 지우기" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200"><X className="size-4" /></button>}
        </div>
        <div className="mt-3 flex items-center justify-between text-caption1-m text-gray-500"><span>{normalizedQuery ? `검색 결과 ${filteredGenres.length}개` : `전체 ${genres.length}개`}</span><span>최대 3개까지 선택</span></div>
        {filteredGenres.length > 0 ? <div className="mt-3 max-h-48 overflow-y-auto pr-1" role="group" aria-label="장르 선택 목록">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filteredGenres.map((genre) => { const selected = selectedIds.includes(genre.id); const disabled = !selected && selectedIds.length >= 3; return <button key={genre.id} type="button" aria-pressed={selected} disabled={disabled} onClick={() => onToggle(genre.id)} className={selected ? 'flex items-center justify-between rounded-xl border border-pink-500 bg-pink-500/15 px-3 py-2.5 text-left text-body3-sb text-pink-200' : disabled ? 'flex cursor-not-allowed items-center justify-between rounded-xl border border-gray-900 bg-gray-950 px-3 py-2.5 text-left text-body3-m text-gray-600' : 'flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 px-3 py-2.5 text-left text-body3-m text-gray-300 hover:border-gray-600 hover:bg-gray-800'}><span className="truncate">{genre.name}</span>{selected && <Check className="size-4 shrink-0" aria-hidden="true" />}</button>; })}
          </div>
        </div> : <p className="mt-3 rounded-xl border border-dashed border-gray-800 p-5 text-center text-body3-m text-gray-500">일치하는 장르가 없습니다.</p>}
      </div>
    </div>}
  </Field>;
}

function SeasonCreateBasics({ thumbnailPreview, changeThumbnail, title, setTitle, releaseDate, setReleaseDate, normalizeDateField, seasonNumber, setSeasonNumber, episodeCount, setEpisodeCount, heading }: {
  thumbnailPreview: string; changeThumbnail: (event: React.ChangeEvent<HTMLInputElement>) => void;
  title: string; setTitle: (value: string) => void; releaseDate: string; setReleaseDate: (value: string) => void;
  normalizeDateField: () => void; seasonNumber: string; setSeasonNumber: (value: string) => void;
  episodeCount: string; setEpisodeCount: (value: string) => void; heading: string;
}) {
  return <section className="rounded-2xl border border-gray-800 bg-gray-950/45 p-5">
    <h3 className="mb-5 text-body1-sb text-gray-100">{heading}</h3>
    <div className="grid gap-6 sm:grid-cols-[170px_minmax(0,1fr)]">
      <div><Label className="text-body2-sb text-gray-300">시즌 썸네일</Label><div className="mt-2 flex aspect-[2/3] items-center justify-center overflow-hidden rounded-2xl bg-gray-800">{thumbnailPreview ? <img src={thumbnailPreview} alt="시즌 썸네일 미리보기" className="h-full w-full object-cover" /> : <ImageOff className="size-8 text-gray-600" />}</div><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={changeThumbnail} className="mt-3 border-gray-700 bg-gray-800 text-gray-300" /><p className="mt-2 text-caption1-m text-gray-500">JPG, PNG, WebP · 최대 5MB · 선택 입력</p></div>
      <div className="flex flex-col gap-5"><Field label="시즌 제목" required><Input value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field><div className="grid grid-cols-2 gap-3"><Field label="시즌 번호" required><Input type="number" min={0} step={1} value={seasonNumber} onChange={(e) => setSeasonNumber(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="전체 회차 수"><Input type="number" min={0} step={1} value={episodeCount} onChange={(e) => setEpisodeCount(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field></div><Field label="방영일"><Input type="text" inputMode="numeric" value={releaseDate} maxLength={14} onChange={(e) => setReleaseDate(e.target.value)} onBlur={normalizeDateField} placeholder="YYYY-MM-DD" aria-describedby="create-season-air-date-help" className="border-gray-700 bg-gray-800 text-gray-50" /><p id="create-season-air-date-help" className="text-caption1-m text-gray-500">숫자만 또는 점·슬래시로 입력해도 YYYY-MM-DD로 변환됩니다.</p></Field></div>
    </div>
  </section>;
}

function SportCreateFields({ sportTypes, sportTypeId, setSportTypeId, scheduledAt, setScheduledAt, league, setLeague, season, setSeason, round, setRound, homeTeam, setHomeTeam, awayTeam, setAwayTeam, homeScore, setHomeScore, awayScore, setAwayScore, venue, setVenue, country, setCountry }: {
  sportTypes: ContentSportType[]; sportTypeId: string; setSportTypeId: (value: string) => void;
  scheduledAt: string; setScheduledAt: (value: string) => void; league: string; setLeague: (value: string) => void;
  season: string; setSeason: (value: string) => void; round: string; setRound: (value: string) => void;
  homeTeam: string; setHomeTeam: (value: string) => void; awayTeam: string; setAwayTeam: (value: string) => void;
  homeScore: string; setHomeScore: (value: string) => void; awayScore: string; setAwayScore: (value: string) => void;
  venue: string; setVenue: (value: string) => void; country: string; setCountry: (value: string) => void;
}) {
  return <>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="종목" required><Select value={sportTypeId} onValueChange={setSportTypeId}><SelectTrigger className="border-gray-700 bg-gray-800 text-gray-50"><SelectValue placeholder="종목 선택" /></SelectTrigger><SelectContent className="border-gray-600 bg-gray-800">{sportTypes.map((item) => <SelectItem key={item.id} value={item.id} className="text-gray-50 focus:bg-gray-700 focus:text-white">{getSportTypeLabel(item.code, item.name)}</SelectItem>)}</SelectContent></Select></Field><Field label="경기 예정 일시"><Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50 [color-scheme:dark]" /><p className="text-caption1-m text-gray-500">대한민국 시간 기준 · 날짜는 YYYY-MM-DD 형식으로 저장됩니다.</p></Field></div>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="홈팀" required><Input value={homeTeam} maxLength={255} onChange={(e) => setHomeTeam(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="원정팀" required><Input value={awayTeam} maxLength={255} onChange={(e) => setAwayTeam(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field></div>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="홈팀 점수"><Input type="number" min={0} step={1} value={homeScore} onChange={(e) => setHomeScore(e.target.value)} placeholder="미입력" className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="원정팀 점수"><Input type="number" min={0} step={1} value={awayScore} onChange={(e) => setAwayScore(e.target.value)} placeholder="미입력" className="border-gray-700 bg-gray-800 text-gray-50" /></Field></div>
    <div className="grid gap-5 sm:grid-cols-3"><Field label="리그"><Input value={league} maxLength={255} onChange={(e) => setLeague(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="시즌"><Input value={season} maxLength={100} onChange={(e) => setSeason(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="라운드"><Input value={round} maxLength={100} onChange={(e) => setRound(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field></div>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="경기장"><Input value={venue} maxLength={255} onChange={(e) => setVenue(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field><Field label="개최 국가"><Input value={country} maxLength={100} onChange={(e) => setCountry(e.target.value)} className="border-gray-700 bg-gray-800 text-gray-50" /></Field></div>
  </>;
}

function SeasonRelationsEditor({ casts, setCasts, updateCast, catalog, platforms, selectedPlatforms, togglePlatform, updatePlatformUrl, loading }: {
  casts: ContentCastCreateRequest[]; setCasts: React.Dispatch<React.SetStateAction<ContentCastCreateRequest[]>>;
  updateCast: (index: number, key: keyof ContentCastCreateRequest, value: string) => void;
  catalog: ContentPlatformCatalogItem[]; platforms: ContentPlatformCreateRequest[]; selectedPlatforms: Set<string>;
  togglePlatform: (id: string) => void; updatePlatformUrl: (id: string, url: string) => void; loading: boolean;
}) {
  return <><section className="border-t border-gray-800 pt-6"><SectionTitle title="출연진" action="출연진 추가" onAction={() => setCasts([...casts, emptyCast()])} />{casts.length === 0 && <Empty value="등록된 출연진이 없습니다." />}<div className="space-y-3">{casts.map((cast, index) => <div key={index} className="grid gap-2 rounded-2xl border border-gray-800 bg-gray-950/50 p-4 sm:grid-cols-[1fr_1fr_1.4fr_auto]"><Input value={cast.name} maxLength={100} onChange={(e) => updateCast(index, 'name', e.target.value)} placeholder="이름 *" className="border-gray-700 bg-gray-800 text-gray-50" /><Input value={cast.roleName || ''} maxLength={255} onChange={(e) => updateCast(index, 'roleName', e.target.value)} placeholder="배역" className="border-gray-700 bg-gray-800 text-gray-50" /><Input value={cast.profileImageUrl || ''} maxLength={500} onChange={(e) => updateCast(index, 'profileImageUrl', e.target.value)} placeholder="사진 URL" className="border-gray-700 bg-gray-800 text-gray-50" /><button type="button" onClick={() => setCasts(casts.filter((_, i) => i !== index))} aria-label="출연진 삭제" className="flex size-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-800 hover:text-pink-300"><Trash2 className="size-4" /></button></div>)}</div></section><section className="border-t border-gray-800 pt-6"><SectionTitle title="시청 가능한 플랫폼" /><p className="mb-4 text-caption1-m text-gray-500">플랫폼을 선택하고 시즌의 실제 제공 주소를 입력해주세요.</p>{loading ? <Empty value="플랫폼 목록을 불러오는 중입니다." /> : <div className="space-y-3">{catalog.map((platform) => { const selected = selectedPlatforms.has(platform.id); const url = platforms.find((item) => item.platformId === platform.id)?.url || ''; return <div key={platform.id} className="rounded-xl border border-gray-800 bg-gray-950/50 p-3"><label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={selected} onChange={() => togglePlatform(platform.id)} className="accent-pink-500" />{platform.logoUrl ? <img src={platform.logoUrl} alt="" className="size-8 rounded-lg object-cover" /> : <span className="size-8 rounded-lg bg-gray-800" />}<span className="text-body3-sb text-gray-200">{platform.name}</span></label>{selected && <Input value={url} maxLength={1000} onChange={(e) => updatePlatformUrl(platform.id, e.target.value)} placeholder="https://..." className="mt-3 border-gray-700 bg-gray-800 text-gray-50" />}</div>; })}</div>}</section></>;
}
