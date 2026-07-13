import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import LoginGate from '@/components/LoginGate';
import { api, ApiError, type ResolveResult } from '@/lib/api';
import { usePageTitle } from '@/hooks/use-page-title';
import { useLang, t, isRtl, type Lang } from '@/lib/i18n';

interface RecentCheckin {
  id: number;
  count: number;
  isOverride: boolean;
  notes: string | null;
  createdAt: string;
  guestName: string;
  scannedBy: string | null;
}

const QR_READER_ID = 'qr-reader';

type CameraStatus = 'idle' | 'starting' | 'scanning' | 'failed';

interface CameraOption {
  id: string;
  label: string;
}

function cameraSupportMessage(lang: Lang): string | null {
  if (!window.isSecureContext) {
    return t(lang, 'scannerHttpsRequired');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return t(lang, 'scannerNoCameraApi');
  }
  return null;
}

export default function ScannerPage() {
  usePageTitle('Entrance Scanner');
  const lang = useLang();
  return (
    <LoginGate
      roles={['guard', 'admin']}
      title={t(lang, 'scannerTitle')}
      subtitle={t(lang, 'scannerSubtitle')}
      lang={lang}
    >
      {(user, logout) => <ScannerScreen userName={user.name} logout={logout} lang={lang} />}
    </LoginGate>
  );
}

function ScannerScreen({
  userName,
  logout,
  lang,
}: {
  userName: string;
  logout: () => void;
  lang: Lang;
}) {
  const rtl = isRtl(lang);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [count, setCount] = useState(1);
  const [extraGuestNames, setExtraGuestNames] = useState<string[]>([]);
  const [needsOverride, setNeedsOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolvingRef = useRef(false);
  // Mirrors "a result or success banner is on screen" so QR frames the
  // (hidden, still-running) camera keeps decoding don't silently resolve
  // again underneath the guard and reset the count/override state.
  const showingOutcomeRef = useRef(false);
  const queryClient = useQueryClient();

  const switchLang = () => {
    const params = new URLSearchParams(window.location.search);
    if (lang === 'ar') params.delete('lang');
    else params.set('lang', 'ar');
    const qs = params.toString();
    window.location.search = qs;
  };

  const recentQuery = useQuery({
    queryKey: ['recent-checkins'],
    queryFn: () => api.get<{ checkins: RecentCheckin[] }>('/checkin/recent'),
    refetchInterval: 15000,
  });

  const resolveToken = useCallback(async (raw: string) => {
    if (resolvingRef.current || showingOutcomeRef.current) return;
    resolvingRef.current = true;
    setError(null);
    setSuccess(null);
    setNeedsOverride(false);
    setOverrideNote('');
    setExtraGuestNames([]);
    try {
      const res = await api.get<ResolveResult>(
        `/checkin/resolve/${encodeURIComponent(raw)}`,
      );
      setResult(res);
      showingOutcomeRef.current = true;
      try {
        scannerRef.current?.pause(true);
      } catch {
        // Not scanning (e.g. resolved via manual entry or image upload) — fine to ignore.
      }
      if (res.status === 'valid') {
        setCount(Math.min(res.rsvpCount || res.remaining || 1, res.remaining || 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, 'scannerCouldNotResolve'));
    } finally {
      resolvingRef.current = false;
    }
  }, [lang]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if ((scanner as { isScanning?: boolean }).isScanning) {
        await scanner.stop();
      }
    } catch {
      // Mobile browsers can throw if permission was revoked or the stream ended.
    }
    try {
      await scanner.clear();
    } catch {
      // A failed start can leave nothing to clear.
    }
    scannerRef.current = null;
    setCameraStatus('idle');
  }, []);

  const startScanner = useCallback(async () => {
    const unsupported = cameraSupportMessage(lang);
    if (unsupported) {
      setCameraError(unsupported);
      setCameraStatus('failed');
      return;
    }

    setCameraError(null);
    setCameraStatus('starting');
    await stopScanner();

    const scanner = new Html5Qrcode(QR_READER_ID, { verbose: false });
    scannerRef.current = scanner;
    const onDecoded = (decoded: string) => resolveToken(decoded);
    const config = {
      fps: 10,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
        const size = Math.max(220, Math.min(edge, 320));
        return { width: size, height: size };
      },
      aspectRatio: 1,
      rememberLastUsedCamera: true,
      disableFlip: false,
    };

    try {
      const available = await Html5Qrcode.getCameras();
      const options = available.map((camera) => ({
        id: camera.id,
        label: camera.label || `Camera ${camera.id.slice(0, 6)}`,
      }));
      setCameras(options);
      const rear =
        selectedCameraId ||
        options.find((camera) => /back|rear|environment/i.test(camera.label))?.id ||
        options[0]?.id ||
        '';
      if (rear && !selectedCameraId) setSelectedCameraId(rear);

      if (rear) {
        await scanner.start(rear, config, onDecoded, () => undefined);
      } else {
        await scanner.start({ facingMode: { ideal: 'environment' } }, config, onDecoded, () => undefined);
      }
      setCameraStatus('scanning');
      return;
    } catch (primaryError) {
      try {
        await scanner.start({ facingMode: 'environment' }, config, onDecoded, () => undefined);
        setCameraStatus('scanning');
        return;
      } catch {
        try {
          await scanner.start({ facingMode: 'user' }, config, onDecoded, () => undefined);
          setCameraStatus('scanning');
          return;
        } catch {
          try {
            await scanner.start({}, config, onDecoded, () => undefined);
            setCameraStatus('scanning');
            return;
          } catch (fallbackError) {
            const message =
              fallbackError instanceof Error
                ? fallbackError.message
                : primaryError instanceof Error
                  ? primaryError.message
                  : t(lang, 'scannerCameraUnavailable');
            setCameraError(message);
            setCameraStatus('failed');
          }
        }
      }
    }
  }, [resolveToken, selectedCameraId, stopScanner, lang]);

  const scanQrImage = async (file: File | undefined) => {
    if (!file) return;
    setCameraError(null);
    try {
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(QR_READER_ID, { verbose: false });
        scannerRef.current = scanner;
      }
      const decoded = await scanner.scanFile(file, false);
      resolveToken(decoded);
    } catch (err) {
      setCameraError(
        err instanceof Error
          ? `${t(lang, 'scannerQrImageError')} (${err.message})`
          : t(lang, 'scannerQrImageError'),
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  const reset = () => {
    setResult(null);
    setSuccess(null);
    setError(null);
    setNeedsOverride(false);
    setOverrideReason('');
    setOverrideNote('');
    setExtraGuestNames([]);
    setManualToken('');
    showingOutcomeRef.current = false;
    if (cameraStatus === 'scanning') {
      try {
        scannerRef.current?.resume();
      } catch {
        // If the paused stream died in the background, the guard can hit
        // "Start camera" — the manual/image-upload paths still work either way.
      }
    }
  };

  const checkIn = async (override = false) => {
    if (!result?.token) return;
    setBusy(true);
    setError(null);
    try {
      const relevantNames = extraGuestNames.slice(0, extraCount).filter((n) => n.trim());
      const namesNote = relevantNames.length
        ? `Extra guest name(s): ${relevantNames.join(', ')}`
        : '';
      const combinedNote = [namesNote, overrideNote.trim()].filter(Boolean).join(' | ');
      const res = await api.post<ResolveResult & { isOverride: boolean }>(
        '/checkin',
        {
          token: result.token,
          count,
          override,
          overrideReason: override ? overrideReason : undefined,
          overrideNote: override ? combinedNote : undefined,
        },
      );
      setSuccess(
        t(lang, 'scannerCheckedInSuccess', {
          name: res.guestName ?? '',
          n: count,
          override: res.isOverride ? t(lang, 'scannerOverrideSuffix') : '',
          remaining: res.remaining ?? 0,
        }),
      );
      setResult(null);
      setNeedsOverride(false);
      setExtraGuestNames([]);
      queryClient.invalidateQueries({ queryKey: ['recent-checkins'] });
    } catch (err) {
      if (err instanceof ApiError && err.body['requiresOverride']) {
        setNeedsOverride(true);
      } else {
        setError(err instanceof Error ? err.message : t(lang, 'scannerCheckInFailed'));
      }
    } finally {
      setBusy(false);
    }
  };

  const statusBanner = () => {
    if (!result) return null;
    switch (result.status) {
      case 'invalid':
        return (
          <div className="bg-red-700 text-white p-5 text-center">
            <p className="text-2xl font-bold tracking-wide">{t(lang, 'scannerInvalidQrTitle')}</p>
            <p className="text-sm mt-1 opacity-90">{t(lang, 'scannerInvalidQrBody')}</p>
          </div>
        );
      case 'cancelled':
        return (
          <div className="bg-red-700 text-white p-5 text-center">
            <p className="text-2xl font-bold tracking-wide">{t(lang, 'scannerCancelledTitle')}</p>
            <p className="text-sm mt-1 opacity-90">
              {t(lang, 'scannerCancelledBody', { name: result.guestName ?? '' })}
            </p>
          </div>
        );
      case 'full':
        return (
          <div className="bg-amber-600 text-white p-5 text-center">
            <p className="text-2xl font-bold tracking-wide">{t(lang, 'scannerFullTitle')}</p>
            <p className="text-sm mt-1 opacity-90">
              {t(lang, 'scannerFullBody', {
                name: result.guestName ?? '',
                allowed: result.allowedCount ?? 0,
                checkedIn: result.checkedIn ?? 0,
              })}
            </p>
          </div>
        );
      default:
        return (
          <div className="bg-emerald-700 text-white p-5 text-center">
            <p className="text-2xl font-bold tracking-wide">{t(lang, 'scannerValidTitle')}</p>
            <p className="text-sm mt-1 opacity-90">
              {result.tableName
                ? t(lang, 'scannerValidBodyWithTable', {
                    name: result.guestName ?? '',
                    table: result.tableName,
                  })
                : t(lang, 'scannerValidBody', { name: result.guestName ?? '' })}
            </p>
          </div>
        );
    }
  };

  const extraCount =
    result?.status === 'valid' ? Math.max(0, count - (result.remaining ?? 0)) : 0;

  return (
    <div
      className="min-h-[100dvh] bg-[#2A1E23] text-[#F9F3F3] font-serif relative"
      dir={rtl ? 'rtl' : 'ltr'}
    >
      {/* Faint monogram watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none">
        <p className="font-script text-[38vmin] text-[#D48A96]/[0.045] leading-none">M&amp;R</p>
      </div>
      <header className="relative flex items-center justify-between px-4 py-3 border-b border-[#D48A96]/30">
        <div>
          <p className="font-script text-2xl text-[#D48A96] leading-none">M &amp; R</p>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">
            {t(lang, 'scannerTitle')}
          </p>
        </div>
        <div className="text-right flex items-center gap-3">
          <button
            onClick={switchLang}
            className="text-[10px] uppercase tracking-widest text-[#D48A96] underline underline-offset-2"
            dir={lang === 'ar' ? 'ltr' : 'rtl'}
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
          <div>
            <p className="text-xs opacity-75">{userName}</p>
            <button
              onClick={logout}
              className="text-[10px] uppercase tracking-widest text-[#D48A96] underline underline-offset-2"
            >
              {t(lang, 'scannerSignOut')}
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-lg mx-auto p-4 space-y-4">
        {success && (
          <div className="bg-emerald-700 text-white p-5 text-center">
            <p className="text-xl font-bold">{t(lang, 'scannerCheckedInBanner')}</p>
            <p className="text-sm mt-1">{success}</p>
            <button
              onClick={reset}
              className="mt-3 px-6 py-2 bg-white/15 border border-white/40 uppercase tracking-widest text-xs"
            >
              {t(lang, 'scannerScanNext')}
            </button>
          </div>
        )}
        {error && (
          <div className="bg-red-700/90 text-white px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}

        {/* Camera viewport stays mounted; results overlay below it */}
        <div className={result || success ? 'hidden' : ''}>
          <div
            id={QR_READER_ID}
            className="overflow-hidden border border-[#D48A96]/40 bg-black min-h-[260px]"
          />
          <div className="mt-3 space-y-3">
            {cameras.length > 1 && (
              <label className="block text-xs">
                <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">
                  {t(lang, 'scannerCameraLabel')}
                </span>
                <select
                  value={selectedCameraId}
                  onChange={async (e) => {
                    setSelectedCameraId(e.target.value);
                    if (cameraStatus === 'scanning') {
                      await stopScanner();
                    }
                  }}
                  className="w-full px-3 py-3 bg-white/10 border border-[#D48A96]/40 text-sm focus:outline-none focus:border-[#D48A96]"
                >
                  {cameras.map((camera) => (
                    <option key={camera.id} value={camera.id} className="text-black">
                      {camera.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={cameraStatus === 'starting'}
                onClick={startScanner}
                className="px-4 py-3 bg-[#D48A96] text-[#2A1E23] uppercase tracking-widest text-xs font-bold disabled:opacity-50"
              >
                {cameraStatus === 'starting'
                  ? t(lang, 'scannerStarting')
                  : cameraStatus === 'scanning'
                    ? t(lang, 'scannerRestartCamera')
                    : t(lang, 'scannerStartCamera')}
              </button>
              <button
                type="button"
                onClick={stopScanner}
                className="px-4 py-3 border border-[#D48A96]/50 uppercase tracking-widest text-xs"
              >
                {t(lang, 'scannerStop')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 border border-[#D48A96]/50 uppercase tracking-widest text-xs"
            >
              {t(lang, 'scannerScanFromImage')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                void scanQrImage(e.target.files?.[0]);
              }}
            />
          </div>
          {cameraError && (
            <p className="text-xs text-amber-400 mt-2 text-center">
              {cameraError}
            </p>
          )}
          <form
            className="flex gap-2 mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (manualToken.trim()) resolveToken(manualToken.trim());
            }}
          >
            <input
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder={t(lang, 'scannerManualPlaceholder')}
              className="flex-1 px-3 py-3 bg-white/10 border border-[#D48A96]/40 text-sm focus:outline-none"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-[#D48A96] text-[#2A1E23] uppercase tracking-widest text-xs font-bold"
            >
              {t(lang, 'scannerCheck')}
            </button>
          </form>
        </div>

        {result && (
          <div className="border border-[#D48A96]/40 bg-[#372930]">
            {statusBanner()}

            {result.status === 'valid' && (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/5 p-3">
                    <p className="text-3xl font-bold">{result.allowedCount}</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-60">
                      {t(lang, 'scannerAllowed')}
                    </p>
                  </div>
                  <div className="bg-white/5 p-3">
                    <p className="text-3xl font-bold">{result.checkedIn}</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-60">
                      {t(lang, 'scannerCheckedIn')}
                    </p>
                  </div>
                  <div className="bg-white/5 p-3">
                    <p className="text-3xl font-bold text-[#D48A96]">{result.remaining}</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-60">
                      {t(lang, 'scannerRemaining')}
                    </p>
                  </div>
                </div>
                {result.rsvpStatus !== 'pending' && (
                  <p className="text-center text-xs opacity-70">
                    {result.rsvpCount
                      ? t(lang, 'scannerRsvpExpected', {
                          status: result.rsvpStatus ?? '',
                          n: result.rsvpCount,
                        })
                      : t(lang, 'scannerRsvpNoExpected', { status: result.rsvpStatus ?? '' })}
                  </p>
                )}

                <div>
                  <p className="text-center text-[10px] uppercase tracking-[0.2em] opacity-60 mb-2">
                    {t(lang, 'scannerGuestsArriving')}
                  </p>
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={() => setCount((c) => Math.max(1, c - 1))}
                      className="w-14 h-14 text-3xl border border-[#D48A96]/60 active:bg-[#D48A96]/20"
                      aria-label="Fewer guests"
                    >
                      −
                    </button>
                    <span className="text-5xl font-bold w-16 text-center">{count}</span>
                    <button
                      onClick={() => setCount((c) => c + 1)}
                      className="w-14 h-14 text-3xl border border-[#D48A96]/60 active:bg-[#D48A96]/20"
                      aria-label="More guests"
                    >
                      +
                    </button>
                  </div>
                  {extraCount > 0 && (
                    <p className="text-center text-amber-400 text-xs mt-2 font-bold uppercase tracking-wide">
                      {t(lang, 'scannerExceeds')}
                    </p>
                  )}
                </div>

                {extraCount > 0 && (
                  <div className="space-y-2 border border-amber-500/40 bg-amber-500/5 p-4">
                    <p className="text-center text-amber-400 text-xs uppercase tracking-wide font-bold">
                      {t(lang, 'scannerExtraNamesTitle', { n: extraCount })}
                    </p>
                    {Array.from({ length: extraCount }).map((_, i) => (
                      <input
                        key={i}
                        value={extraGuestNames[i] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setExtraGuestNames((prev) => {
                            const next = [...prev];
                            while (next.length < extraCount) next.push('');
                            next[i] = value;
                            return next;
                          });
                        }}
                        placeholder={t(lang, 'scannerExtraNamePlaceholder', { n: i + 1 })}
                        className="w-full px-3 py-3 bg-white/10 border border-amber-500/40 text-sm focus:outline-none"
                      />
                    ))}
                  </div>
                )}

                {needsOverride ? (
                  <div className="space-y-3 border border-amber-500/60 bg-amber-500/10 p-4">
                    <p className="text-amber-400 font-bold text-center text-sm uppercase tracking-wide">
                      {t(lang, 'scannerOverrideNeeded')}
                    </p>
                    <input
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder={t(lang, 'scannerOverrideReasonPlaceholder')}
                      className="w-full px-3 py-3 bg-white/10 border border-amber-500/50 text-sm focus:outline-none"
                    />
                    <input
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                      placeholder={t(lang, 'scannerOverrideNotePlaceholder')}
                      className="w-full px-3 py-3 bg-white/10 border border-amber-500/50 text-sm focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={
                          busy ||
                          !overrideNote.trim() ||
                          extraGuestNames.slice(0, extraCount).some((n) => !n.trim())
                        }
                        onClick={() => checkIn(true)}
                        className="flex-1 py-3.5 bg-amber-600 text-white uppercase tracking-widest text-xs font-bold disabled:opacity-50"
                      >
                        {t(lang, 'scannerOverrideCheckIn')}
                      </button>
                      <button
                        onClick={() => setNeedsOverride(false)}
                        className="px-5 py-3.5 border border-white/30 uppercase tracking-widest text-xs"
                      >
                        {t(lang, 'scannerBack')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() => checkIn(false)}
                    className="w-full py-4 bg-[#D48A96] text-[#2A1E23] uppercase tracking-widest text-sm font-bold disabled:opacity-50"
                  >
                    {busy
                      ? t(lang, 'scannerCheckingIn')
                      : t(lang, count === 1 ? 'scannerCheckInOne' : 'scannerCheckInMany', { n: count })}
                  </button>
                )}
              </div>
            )}

            <div className="p-4 pt-0">
              <button
                onClick={reset}
                className="w-full py-3 border border-white/25 uppercase tracking-widest text-xs opacity-80"
              >
                {t(lang, 'scannerCancelScanAnother')}
              </button>
            </div>
          </div>
        )}

        <section>
          <p className="text-[10px] uppercase tracking-[0.25em] opacity-50 mb-2">
            {t(lang, 'scannerRecentCheckins')}
          </p>
          <div className="space-y-1.5">
            {(recentQuery.data?.checkins ?? []).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between bg-white/5 px-3 py-2 text-sm"
              >
                <span>
                  {c.guestName}
                  {c.isOverride && (
                    <span className="ml-2 text-amber-400 text-[10px] uppercase font-bold">
                      {t(lang, 'scannerOverrideBadge')}
                    </span>
                  )}
                </span>
                <span className="opacity-60 text-xs">
                  +{c.count} ·{' '}
                  {new Date(c.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
            {recentQuery.data?.checkins.length === 0 && (
              <p className="text-xs opacity-40">{t(lang, 'scannerNoCheckinsYet')}</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
