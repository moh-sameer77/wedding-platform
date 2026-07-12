import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import LoginGate from '@/components/LoginGate';
import { api, ApiError, type ResolveResult } from '@/lib/api';
import { usePageTitle } from '@/hooks/use-page-title';

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

function cameraSupportMessage(): string | null {
  if (!window.isSecureContext) {
    return 'Camera access requires HTTPS on mobile browsers. Open the scanner from the deployed HTTPS URL, not an IP/http link.';
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'This browser does not expose camera access. Use an updated Safari, Chrome, or Edge browser, or upload a QR image below.';
  }
  return null;
}

export default function ScannerPage() {
  usePageTitle('Entrance Scanner');
  return (
    <LoginGate
      roles={['guard', 'admin']}
      title="Entrance Scanner"
      subtitle="Guard or admin access · Mohammad & Renad Wedding"
    >
      {(user, logout) => <ScannerScreen userName={user.name} logout={logout} />}
    </LoginGate>
  );
}

function ScannerScreen({
  userName,
  logout,
}: {
  userName: string;
  logout: () => void;
}) {
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
      setError(err instanceof Error ? err.message : 'Could not resolve QR');
    } finally {
      resolvingRef.current = false;
    }
  }, []);

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
    const unsupported = cameraSupportMessage();
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
                  : 'Camera unavailable. Check browser permission, HTTPS, and whether another app is using the camera.';
            setCameraError(message);
            setCameraStatus('failed');
          }
        }
      }
    }
  }, [resolveToken, selectedCameraId, stopScanner]);

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
          ? `Could not read QR from image: ${err.message}`
          : 'Could not read QR from image.',
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
        `${res.guestName} — ${count} checked in${res.isOverride ? ' (OVERRIDE)' : ''}. Remaining: ${res.remaining}`,
      );
      setResult(null);
      setNeedsOverride(false);
      setExtraGuestNames([]);
      queryClient.invalidateQueries({ queryKey: ['recent-checkins'] });
    } catch (err) {
      if (err instanceof ApiError && err.body['requiresOverride']) {
        setNeedsOverride(true);
      } else {
        setError(err instanceof Error ? err.message : 'Check-in failed');
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
            <p className="text-2xl font-bold tracking-wide">INVALID QR</p>
            <p className="text-sm mt-1 opacity-90">
              This invitation does not exist, was cancelled, or is not for this
              event.
            </p>
          </div>
        );
      case 'cancelled':
        return (
          <div className="bg-red-700 text-white p-5 text-center">
            <p className="text-2xl font-bold tracking-wide">CANCELLED</p>
            <p className="text-sm mt-1 opacity-90">
              {result.guestName} — this invitation was cancelled.
            </p>
          </div>
        );
      case 'full':
        return (
          <div className="bg-amber-600 text-white p-5 text-center">
            <p className="text-2xl font-bold tracking-wide">ALREADY CHECKED IN</p>
            <p className="text-sm mt-1 opacity-90">
              {result.guestName} — Allowed: {result.allowedCount} · Checked in:{' '}
              {result.checkedIn} · No remaining guests.
            </p>
          </div>
        );
      default:
        return (
          <div className="bg-emerald-700 text-white p-5 text-center">
            <p className="text-2xl font-bold tracking-wide">VALID INVITATION</p>
            <p className="text-sm mt-1 opacity-90">
              Guest: {result.guestName}
              {result.tableName ? ` · Table: ${result.tableName}` : ''}
            </p>
          </div>
        );
    }
  };

  const extraCount =
    result?.status === 'valid' ? Math.max(0, count - (result.remaining ?? 0)) : 0;

  return (
    <div className="min-h-[100dvh] bg-[#2A1E23] text-[#F9F3F3] font-serif relative">
      {/* Faint monogram watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none">
        <p className="font-script text-[38vmin] text-[#D48A96]/[0.045] leading-none">M&amp;R</p>
      </div>
      <header className="relative flex items-center justify-between px-4 py-3 border-b border-[#D48A96]/30">
        <div>
          <p className="font-script text-2xl text-[#D48A96] leading-none">M &amp; R</p>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">
            Entrance Scanner
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-75">{userName}</p>
          <button
            onClick={logout}
            className="text-[10px] uppercase tracking-widest text-[#D48A96] underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="relative max-w-lg mx-auto p-4 space-y-4">
        {success && (
          <div className="bg-emerald-700 text-white p-5 text-center">
            <p className="text-xl font-bold">✓ CHECKED IN</p>
            <p className="text-sm mt-1">{success}</p>
            <button
              onClick={reset}
              className="mt-3 px-6 py-2 bg-white/15 border border-white/40 uppercase tracking-widest text-xs"
            >
              Scan next guest
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
                  Camera
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
                  ? 'Starting...'
                  : cameraStatus === 'scanning'
                    ? 'Restart camera'
                    : 'Start camera'}
              </button>
              <button
                type="button"
                onClick={stopScanner}
                className="px-4 py-3 border border-[#D48A96]/50 uppercase tracking-widest text-xs"
              >
                Stop
              </button>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 border border-[#D48A96]/50 uppercase tracking-widest text-xs"
            >
              Scan QR from image
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
              placeholder="Or paste/type invitation code…"
              className="flex-1 px-3 py-3 bg-white/10 border border-[#D48A96]/40 text-sm focus:outline-none focus:border-[#D48A96]"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-[#D48A96] text-[#2A1E23] uppercase tracking-widest text-xs font-bold"
            >
              Check
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
                    <p className="text-[10px] uppercase tracking-widest opacity-60">Allowed</p>
                  </div>
                  <div className="bg-white/5 p-3">
                    <p className="text-3xl font-bold">{result.checkedIn}</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-60">Checked in</p>
                  </div>
                  <div className="bg-white/5 p-3">
                    <p className="text-3xl font-bold text-[#D48A96]">{result.remaining}</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-60">Remaining</p>
                  </div>
                </div>
                {result.rsvpStatus !== 'pending' && (
                  <p className="text-center text-xs opacity-70">
                    RSVP: {result.rsvpStatus}
                    {result.rsvpCount ? ` (${result.rsvpCount} expected)` : ''}
                  </p>
                )}

                <div>
                  <p className="text-center text-[10px] uppercase tracking-[0.2em] opacity-60 mb-2">
                    Guests arriving now
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
                      ⚠ Exceeds remaining count — override required
                    </p>
                  )}
                </div>

                {extraCount > 0 && (
                  <div className="space-y-2 border border-amber-500/40 bg-amber-500/5 p-4">
                    <p className="text-center text-amber-400 text-xs uppercase tracking-wide font-bold">
                      Name{extraCount > 1 ? 's' : ''} of the {extraCount} extra guest{extraCount > 1 ? 's' : ''}
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
                        placeholder={`Extra guest ${i + 1} name`}
                        className="w-full px-3 py-3 bg-white/10 border border-amber-500/40 text-sm focus:outline-none"
                      />
                    ))}
                  </div>
                )}

                {needsOverride ? (
                  <div className="space-y-3 border border-amber-500/60 bg-amber-500/10 p-4">
                    <p className="text-amber-400 font-bold text-center text-sm uppercase tracking-wide">
                      Extra guest detected — approval required
                    </p>
                    <input
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Reason for escalation (optional)"
                      className="w-full px-3 py-3 bg-white/10 border border-amber-500/50 text-sm focus:outline-none"
                    />
                    <input
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                      placeholder="Guard note: who approved this? (required)"
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
                        Override &amp; check in
                      </button>
                      <button
                        onClick={() => setNeedsOverride(false)}
                        className="px-5 py-3.5 border border-white/30 uppercase tracking-widest text-xs"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() => checkIn(false)}
                    className="w-full py-4 bg-[#D48A96] text-[#2A1E23] uppercase tracking-widest text-sm font-bold disabled:opacity-50"
                  >
                    {busy ? 'Checking in…' : `Check in ${count} ${count === 1 ? 'guest' : 'guests'}`}
                  </button>
                )}
              </div>
            )}

            <div className="p-4 pt-0">
              <button
                onClick={reset}
                className="w-full py-3 border border-white/25 uppercase tracking-widest text-xs opacity-80"
              >
                Cancel / scan another
              </button>
            </div>
          </div>
        )}

        <section>
          <p className="text-[10px] uppercase tracking-[0.25em] opacity-50 mb-2">
            Recent check-ins
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
                      override
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
              <p className="text-xs opacity-40">No check-ins yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
