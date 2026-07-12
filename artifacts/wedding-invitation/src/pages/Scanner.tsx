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

export default function ScannerPage() {
  usePageTitle('Entrance Scanner');
  return (
    <LoginGate
      roles={['guard']}
      title="Entrance Scanner"
      subtitle="Guard access · Mohammad & Renad Wedding"
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
  const [needsOverride, setNeedsOverride] = useState(false);
  const [overrideNote, setOverrideNote] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const resolvingRef = useRef(false);
  const queryClient = useQueryClient();

  const recentQuery = useQuery({
    queryKey: ['recent-checkins'],
    queryFn: () => api.get<{ checkins: RecentCheckin[] }>('/checkin/recent'),
    refetchInterval: 15000,
  });

  const resolveToken = useCallback(async (raw: string) => {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    setError(null);
    setSuccess(null);
    setNeedsOverride(false);
    setOverrideNote('');
    try {
      const res = await api.get<ResolveResult>(
        `/checkin/resolve/${encodeURIComponent(raw)}`,
      );
      setResult(res);
      if (res.status === 'valid') {
        setCount(Math.min(res.rsvpCount || res.remaining || 1, res.remaining || 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resolve QR');
    } finally {
      resolvingRef.current = false;
    }
  }, []);

  // Camera QR scanning; guards can always fall back to manual entry.
  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          resolveToken(decoded);
        },
        () => undefined,
      )
      .catch((err: unknown) => {
        setCameraError(
          err instanceof Error
            ? err.message
            : 'Camera unavailable — use manual entry below.',
        );
      });
    return () => {
      scanner.stop().catch(() => undefined);
    };
  }, [resolveToken]);

  const reset = () => {
    setResult(null);
    setSuccess(null);
    setError(null);
    setNeedsOverride(false);
    setOverrideNote('');
    setManualToken('');
  };

  const checkIn = async (override = false) => {
    if (!result?.token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<ResolveResult & { isOverride: boolean }>(
        '/checkin',
        {
          token: result.token,
          count,
          override,
          notes: override ? overrideNote : undefined,
        },
      );
      setSuccess(
        `${res.guestName} — ${count} checked in${res.isOverride ? ' (OVERRIDE)' : ''}. Remaining: ${res.remaining}`,
      );
      setResult(null);
      setNeedsOverride(false);
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
            id="qr-reader"
            className="overflow-hidden border border-[#D48A96]/40 bg-black min-h-[260px]"
          />
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
                  {count > (result.remaining ?? 0) && (
                    <p className="text-center text-amber-400 text-xs mt-2 font-bold uppercase tracking-wide">
                      ⚠ Exceeds remaining count — override required
                    </p>
                  )}
                </div>

                {needsOverride ? (
                  <div className="space-y-3 border border-amber-500/60 bg-amber-500/10 p-4">
                    <p className="text-amber-400 font-bold text-center text-sm uppercase tracking-wide">
                      Extra guest detected — approval required
                    </p>
                    <input
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                      placeholder="Note: who approved this? (required)"
                      className="w-full px-3 py-3 bg-white/10 border border-amber-500/50 text-sm focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={busy || !overrideNote.trim()}
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
