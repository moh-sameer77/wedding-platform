import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Garland, FallingPetals } from '@/components/Florals';
import { api, type InviteDetails } from '@/lib/api';
import { t, isRtl, type Lang, type SectionId, type StringKey } from '@/lib/i18n';

/**
 * The invitation card itself — the single source of truth for how the card
 * looks. The guest page (Home) renders it live; the admin CMS renders the
 * exact same component wrapped with editing chrome via `renderSection`.
 */

const COUNTDOWN_TARGET = new Date('2026-07-25T19:00:00').getTime();

const MAPS_URL = 'https://maps.google.com/?q=Tal+Pine+Amman+Jordan';

const CLIQ_ALIAS = 'MAGHATHE7';

async function copyTextToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall through to the DOM fallback for mobile browsers.
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!copied) throw new Error('Clipboard copy failed');
}

export const SparkleStar = ({ size, color = '#F2BFC7' }: { size: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 10 10">
    <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={color} />
  </svg>
);

/** Celebration burst of gold sparkles + blush petals for a confirmed RSVP. */
const BURST = Array.from({ length: 18 }, (_, i) => ({
  angle: (i / 18) * Math.PI * 2 + 0.2,
  dist: 70 + (i % 4) * 30,
  size: 6 + (i % 3) * 4,
  delay: (i % 6) * 0.04,
  kind: i % 3, // 0 star gold, 1 star pale, 2 petal blush
}));

function CelebrationBurst() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible">
      {BURST.map((s, i) => (
        <span
          key={i}
          className="absolute"
          style={
            {
              '--fly-x': `${Math.cos(s.angle) * s.dist}px`,
              '--fly-y': `${Math.sin(s.angle) * s.dist - 30}px`,
              animation: `sparkle-fly 1.25s cubic-bezier(0.2, 0.6, 0.4, 1) ${s.delay}s forwards`,
              opacity: 0,
            } as React.CSSProperties
          }
        >
          {s.kind === 2 ? (
            <svg width={s.size + 3} height={s.size + 3} viewBox="0 0 10 10">
              <ellipse cx="5" cy="5" rx="4.5" ry="2.6" fill="#E8B4B8" transform={`rotate(${(i * 47) % 180} 5 5)`} />
            </svg>
          ) : (
            <SparkleStar size={s.size} color={s.kind === 0 ? '#D48A96' : '#F6D4C9'} />
          )}
        </span>
      ))}
    </div>
  );
}

const DividerSVG = () => (
  <motion.div
    className="w-full max-w-md mx-auto my-10 sm:my-14 flex justify-center"
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 0.75, y: 0 }}
    viewport={{ once: true, amount: 0.4 }}
    transition={{ duration: 0.9, ease: 'easeOut' }}
  >
    <svg viewBox="0 0 320 24" className="w-full h-5 sm:h-7">
      <path d="M 0 12 L 118 12" stroke="#D48A96" strokeWidth="0.6" />
      <path d="M 202 12 L 320 12" stroke="#D48A96" strokeWidth="0.6" />
      <path d="M 118 12 C 128 12, 133 4, 143 12 C 153 20, 158 12, 178 12" fill="none" stroke="#D48A96" strokeWidth="1.2" />
      <path d="M 118 12 C 128 12, 133 20, 143 12 C 153 4, 158 12, 178 12" fill="none" stroke="#D48A96" strokeWidth="1.2" />
      <circle cx="143" cy="12" r="3.5" fill="#D48A96" opacity="0.9" />
      <circle cx="143" cy="12" r="1.5" fill="#F9F3F3" />
      <circle cx="116" cy="12" r="1.5" fill="#D48A96" opacity="0.5" />
      <circle cx="204" cy="12" r="1.5" fill="#D48A96" opacity="0.5" />
    </svg>
  </motion.div>
);

const PineTreeSVG = () => (
  <svg viewBox="0 0 50 65" className="w-10 h-12 sm:w-12 sm:h-14 mb-1">
    <path d="M 25 58 L 25 65" stroke="#8F4557" strokeWidth="3" strokeLinecap="round" />
    <path d="M 25 38 L 44 58 L 6 58 Z" fill="#4A7A4A" stroke="#3A6A3A" strokeWidth="0.5" />
    <path d="M 25 20 L 40 40 L 10 40 Z" fill="#5A8A5A" stroke="#4A7A4A" strokeWidth="0.5" />
    <path d="M 25 5 L 37 26 L 13 26 Z" fill="#6B9B6B" stroke="#5A8A5A" strokeWidth="0.5" />
  </svg>
);

/** Calendar popover */
function CalendarMenu({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const generateICS = () => {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const uid = `${Date.now()}@mohammad-renad-wedding`;
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mohammad & Renad Wedding//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE',
      'TZID:Asia/Amman',
      'BEGIN:STANDARD',
      'DTSTART:19701025T030000',
      'TZOFFSETFROM:+0300',
      'TZOFFSETTO:+0200',
      'TZNAME:EET',
      'END:STANDARD',
      'BEGIN:DAYLIGHT',
      'DTSTART:19700328T010000',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0300',
      'TZNAME:EEST',
      'END:DAYLIGHT',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      'DTSTART;TZID=Asia/Amman:20260725T190000',
      'DTEND;TZID=Asia/Amman:20260725T230000',
      'SUMMARY:Mohammad & Renad Wedding',
      'DESCRIPTION:Wedding Celebration — Joyfully request your presence',
      'LOCATION:Tal Pine\\, Amman\\, Jordan',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Mohammad-Renad-Wedding.ics';
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const googleUrl =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=Mohammad+%26+Renad+Wedding' +
    '&dates=20260725T190000/20260725T230000' +
    '&details=Wedding+Celebration+%E2%80%94+Joyfully+request+your+presence' +
    '&location=Tal+Pine,+Amman,+Jordan';

  return (
    <motion.div
      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#F9F3F3] border border-[#D48A96]/50 shadow-xl z-50 min-w-[200px]"
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-[2px] border-[0.5px] border-[#D48A96]/30 pointer-events-none" />
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClose}
        className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#D48A96]/8 transition-colors text-[#45383C]/80 text-sm uppercase tracking-widest font-serif border-b border-[#D48A96]/20"
      >
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        {t(lang, 'googleCalendar')}
      </a>
      <button
        onClick={generateICS}
        className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#D48A96]/8 transition-colors text-[#45383C]/80 text-sm uppercase tracking-widest font-serif w-full text-left"
      >
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2v13m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
        </svg>
        {t(lang, 'downloadIcs')}
      </button>
    </motion.div>
  );
}

export function RsvpSection({
  token,
  invitation,
  lang,
  onConfirmed,
}: {
  token: string | null;
  invitation: InviteDetails['invitation'] | null;
  lang: Lang;
  onConfirmed?: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [choosingCount, setChoosingCount] = useState(false);
  const [count, setCount] = useState(1);
  const [editing, setEditing] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const rtl = isRtl(lang);

  const rsvpMutation = useMutation({
    mutationFn: (payload: { status: 'confirmed' | 'declined'; count?: number }) =>
      api.post(`/invite/${token}/rsvp`, payload),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ['invite', token] });
      setChoosingCount(false);
      setEditing(false);
      if (payload.status === 'confirmed') {
        setCelebrating(true);
        setTimeout(() => setCelebrating(false), 2200);
        onConfirmed?.();
      }
      toast({
        title:
          payload.status === 'confirmed'
            ? t(lang, 'acceptedToast')
            : t(lang, 'declinedToast'),
        description:
          payload.status === 'confirmed'
            ? t(lang, 'acceptedToastBody')
            : t(lang, 'declinedToastBody'),
        duration: 5000,
      });
    },
    onError: (err: Error) => {
      toast({ title: t(lang, 'errorTitle'), description: err.message, duration: 5000 });
    },
  });

  const answered =
    invitation && invitation.rsvpStatus !== 'pending' && !editing;

  const requirePersonalLink = () => {
    toast({
      title: t(lang, 'personalLinkTitle'),
      description: t(lang, 'personalLinkBody'),
      duration: 6000,
    });
  };

  const handleAccept = () => {
    if (!token || !invitation) {
      requirePersonalLink();
      return;
    }
    if (invitation.allowedCount > 1) {
      setCount(invitation.rsvpCount || invitation.allowedCount);
      setChoosingCount(true);
    } else {
      rsvpMutation.mutate({ status: 'confirmed', count: 1 });
    }
  };

  const handleDecline = () => {
    if (!token || !invitation) {
      requirePersonalLink();
      return;
    }
    rsvpMutation.mutate({ status: 'declined' });
  };

  return (
    <motion.div
      className="w-full max-w-md mx-auto text-center space-y-5 sm:space-y-7 px-4 relative z-20"
      initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 1, ease: 'easeOut' }}
      dir={rtl ? 'rtl' : 'ltr'}
    >
      {t(lang, 'rsvpTitle').trim() && (
        <motion.h2
          className="font-script text-4xl sm:text-5xl text-[#1A1516] mb-1 sm:mb-3"
          initial={{ opacity: 0, y: 20, filter: 'blur(5px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          {t(lang, 'rsvpTitle')}
        </motion.h2>
      )}

      {answered ? (
        <div className="space-y-4 relative">
          {celebrating && <CelebrationBurst />}
          <div className="px-8 py-6 border-[0.5px] border-[#D48A96]/50 bg-[#FDF9F8] shadow-sm relative">
            <div className="absolute inset-1 border-[0.5px] border-dashed border-[#D48A96]/25 pointer-events-none" />
            {invitation!.rsvpStatus === 'confirmed' ? (
              <>
                <p className="font-script text-3xl sm:text-4xl text-[#1A1516] mb-2">
                  {t(lang, 'joyfullyAccepted')}
                </p>
                <p className="text-lg sm:text-xl font-bold text-[#1A1516]">
                  {t(lang, 'guestsConfirmed', {
                    n: invitation!.rsvpCount ?? 0,
                    guests:
                      invitation!.rsvpCount === 1
                        ? t(lang, 'guestOne')
                        : t(lang, 'guestMany'),
                  })}
                </p>
              </>
            ) : (
              <>
                <p className="font-script text-3xl sm:text-4xl text-[#1A1516] mb-2">
                  {t(lang, 'regretfullyDeclined')}
                </p>
                <p className="text-lg sm:text-xl text-[#1A1516]">
                  {t(lang, 'dearlyMissed')}
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-sm sm:text-base uppercase tracking-[0.22em] text-[#1A1516] underline underline-offset-4 hover:text-[#8F4557] transition-colors"
          >
            {t(lang, 'changeResponse')}
          </button>
        </div>
      ) : choosingCount && invitation ? (
        <div className="space-y-5">
          <p className="text-lg sm:text-xl text-[#1A1516] font-serif">
            {t(lang, 'howMany')}
          </p>
          <div className="flex items-center justify-center gap-5">
            <button
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              className="w-12 h-12 border border-[#D48A96] text-[#1A1516] text-2xl hover:bg-[#D48A96]/10 transition-colors"
              aria-label="Fewer guests"
            >
              −
            </button>
            <span className="text-4xl sm:text-5xl font-bold font-serif text-[#1A1516] w-16 text-center tabular-nums">{count}</span>
            <button
              onClick={() => setCount((c) => Math.min(invitation.allowedCount, c + 1))}
              className="w-12 h-12 border border-[#D48A96] text-[#1A1516] text-2xl hover:bg-[#D48A96]/10 transition-colors"
              aria-label="More guests"
            >
              +
            </button>
          </div>
          <p className="text-sm sm:text-base uppercase tracking-[0.22em] font-bold text-[#1A1516]">
            {(() => {
              const [before, after] = t(lang, 'upToGuests', {}).split('{n}');
              return (
                <>
                  {before}
                  <span className="text-lg sm:text-xl text-[#8F4557]">
                    {invitation.allowedCount}
                  </span>
                  {after}
                </>
              );
            })()}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              disabled={rsvpMutation.isPending}
              onClick={() => rsvpMutation.mutate({ status: 'confirmed', count })}
              className="group relative px-8 py-3.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-sm sm:text-base font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
            >
              <div className="absolute inset-[3px] border-[0.5px] border-[#F9F3F3]/40 pointer-events-none" />
              {rsvpMutation.isPending ? t(lang, 'sending') : t(lang, 'confirmAttendance')}
            </button>
            <button
              onClick={() => setChoosingCount(false)}
              className="px-8 py-3.5 text-[#1A1516] border border-[#D48A96]/40 uppercase tracking-widest text-sm sm:text-base hover:bg-[#D48A96]/5 transition-colors"
            >
              {t(lang, 'back')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {t(lang, 'willYouJoin').trim() && (
            <p className="text-lg sm:text-xl text-[#1A1516] mb-5 sm:mb-7 font-serif">
              {t(lang, 'willYouJoin')}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-center w-full px-4">
            <button
              disabled={rsvpMutation.isPending}
              onClick={handleAccept}
              className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] rounded-none uppercase tracking-widest text-sm sm:text-base font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl w-full sm:w-auto disabled:opacity-60"
            >
              <div className="absolute inset-[3px] border-[0.5px] border-[#F9F3F3]/40 pointer-events-none transition-transform group-hover:scale-[0.98]" />
              {t(lang, 'joyfullyAccepts')}
            </button>
            <button
              disabled={rsvpMutation.isPending}
              onClick={handleDecline}
              className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-transparent text-[#1A1516] border border-[#D48A96] hover:bg-[#D48A96]/5 transition-all uppercase tracking-widest text-sm sm:text-base font-semibold w-full sm:w-auto shadow-sm disabled:opacity-60"
            >
              <div className="absolute inset-[3px] border-[0.5px] border-[#D48A96]/30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              {t(lang, 'regretfullyDeclines')}
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

/** Nuqoot (نقوط) — the beloved wedding gift tradition, made effortless via CliQ. */
function NuqootSection({ lang }: { lang: Lang }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const rtl = isRtl(lang);

  const copyAlias = async () => {
    try {
      await copyTextToClipboard(CLIQ_ALIAS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast({
        title: t(lang, 'aliasCopiedToast'),
        description: t(lang, 'aliasCopiedBody', { alias: CLIQ_ALIAS }),
        duration: 4000,
      });
    } catch {
      toast({ title: `CliQ: ${CLIQ_ALIAS}`, duration: 5000 });
    }
  };

  return (
    <motion.div
      className="w-full max-w-md mx-auto text-center px-4 relative z-20"
      initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 1, ease: 'easeOut' }}
      dir={rtl ? 'rtl' : 'ltr'}
    >
      {t(lang, 'nuqootTitle').trim() && (
        <>
          <h2 className="font-script text-4xl sm:text-5xl text-[#1A1516] mb-2">
            {t(lang, 'nuqootTitle')}
          </h2>
          <p
            dir={rtl ? 'ltr' : 'rtl'}
            lang={rtl ? 'en' : 'ar'}
            className="text-lg sm:text-xl text-[#1A1516] mb-4"
          >
            {t(lang, 'nuqootSub')}
          </p>
        </>
      )}
      {t(lang, 'nuqootBody').trim() && (
        <p className="text-lg sm:text-xl text-[#1A1516] font-serif max-w-sm mx-auto leading-relaxed mb-6">
          {t(lang, 'nuqootBody')}
        </p>
      )}

      <div className="relative inline-flex flex-col items-center gap-3 px-8 sm:px-12 py-6 bg-[#FDF9F8] border-[0.5px] border-[#D48A96]/50 shadow-sm">
        <div className="absolute inset-1.5 border-[0.5px] border-dashed border-[#D48A96]/25 pointer-events-none" />
        <div className="flex items-center gap-2">
          {/* Simple bank-transfer glyph */}
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#B25A6C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10 L12 4 L21 10" />
            <path d="M5 10 v7 M9.5 10 v7 M14.5 10 v7 M19 10 v7" />
            <path d="M3 20 h18" />
          </svg>
          <p className="text-sm sm:text-base uppercase tracking-[0.22em] text-[#1A1516]">
            {t(lang, 'cliqAlias')}
          </p>
        </div>
        <p className="text-2xl sm:text-3xl tracking-[0.18em] text-[#1A1516] font-bold tabular-nums" dir="ltr">
          {CLIQ_ALIAS}
        </p>
        <button
          onClick={copyAlias}
          className="group relative mt-1 px-7 py-2.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-sm sm:text-base font-semibold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="absolute inset-[3px] border-[0.5px] border-[#F9F3F3]/40 pointer-events-none" />
          {copied ? t(lang, 'copied') : t(lang, 'copyAlias')}
        </button>
        {t(lang, 'cliqNote').trim() && (
          <p className="text-sm sm:text-base text-[#1A1516] tracking-wide">
            {t(lang, 'cliqNote')}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function CountdownTimer({ lang }: { lang: Lang }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const rtl = isRtl(lang);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const distance = COUNTDOWN_TARGET - now;
      if (distance < 0) { clearInterval(timer); return; }
      setTimeLeft({
        days: Math.floor(distance / 86400000),
        hours: Math.floor((distance % 86400000) / 3600000),
        minutes: Math.floor((distance % 3600000) / 60000),
        seconds: Math.floor((distance % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      className="w-full max-w-xl mx-auto text-center px-2 sm:px-4 relative z-20"
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
      dir={rtl ? 'rtl' : 'ltr'}
    >
      {t(lang, 'countingDown').trim() && (
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
          <div className="h-[0.5px] bg-gradient-to-r from-transparent via-[#D48A96]/50 to-transparent flex-1 max-w-[80px] sm:max-w-[110px]" />
          <p className="tracking-[0.22em] text-sm sm:text-base uppercase text-[#1A1516] font-medium font-serif">
            {t(lang, 'countingDown')}
          </p>
          <div className="h-[0.5px] bg-gradient-to-r from-transparent via-[#D48A96]/50 to-transparent flex-1 max-w-[80px] sm:max-w-[110px]" />
        </div>
      )}

      <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6">
        {[
          { label: t(lang, 'days'), value: timeLeft.days },
          { label: t(lang, 'hours'), value: timeLeft.hours },
          { label: t(lang, 'mins'), value: timeLeft.minutes },
          { label: t(lang, 'secs'), value: timeLeft.seconds },
        ].map(({ label, value }, i) => (
          <motion.div
            key={label}
            className="flex flex-col items-center group"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.7, delay: i * 0.09, ease: 'easeOut' }}
          >
            <div className="w-16 h-20 sm:w-20 sm:h-24 md:w-24 md:h-28 flex items-center justify-center bg-[#F9F3F3] border-[0.5px] border-[#D48A96]/55 shadow-md relative overflow-hidden mb-2 sm:mb-3 group-hover:shadow-lg transition-shadow">
              <div className="absolute inset-1 border-[0.5px] border-dashed border-[#D48A96]/25 pointer-events-none" />
              <div className="absolute top-1 left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 border-t border-l border-[#D48A96]" />
              <div className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 border-t border-r border-[#D48A96]" />
              <div className="absolute bottom-1 left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 border-b border-l border-[#D48A96]" />
              <div className="absolute bottom-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 border-b border-r border-[#D48A96]" />
              <div className="relative w-full h-full flex items-center justify-center">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={value}
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -15, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-2xl sm:text-3xl md:text-4xl text-[#1A1516] font-bold font-serif block absolute tabular-nums"
                  >
                    {value.toString().padStart(2, '0')}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
            <span className="text-sm sm:text-base uppercase tracking-[0.22em] text-[#1A1516] font-serif">{label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export interface InvitationCardProps {
  lang: Lang;
  /** Sections in display order; disabled sections are skipped unless
   * `includeHidden` is set (the admin CMS shows them dimmed). */
  sections: { id: SectionId; enabled: boolean }[];
  invitation: InviteDetails['invitation'] | null;
  token: string | null;
  tablesEnabled: boolean;
  /** null hides the garland entirely; ''/undefined uses the default art. */
  topBg?: string | null;
  bottomBg?: string | null;
  onConfirmed?: () => void;
  includeHidden?: boolean;
  /** Admin CMS hook: wrap each section with editing chrome. */
  renderSection?: (
    section: { id: SectionId; enabled: boolean },
    node: React.ReactNode,
    index: number,
  ) => React.ReactNode;
}

export default function InvitationCard({
  lang,
  sections,
  invitation,
  token,
  tablesEnabled,
  topBg,
  bottomBg,
  onConfirmed,
  includeHidden = false,
  renderSection,
}: InvitationCardProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const rtl = isRtl(lang);

  // Every text line is its own item: a line the couple cleared in the CMS
  // simply doesn't render, without touching the rest of its section.
  const has = (key: StringKey) => t(lang, key).trim().length > 0;

  const sectionNode = (section: { id: SectionId; enabled: boolean }): React.ReactNode => {
    switch (section.id) {
      case 'header': {
        const hasFathers = has('groomFatherName') || has('brideFatherName');
        const hasHonorBlock =
          has('honorEyebrow') || hasFathers || has('requestHonor') || has('blessing');
        return (
          <React.Fragment key="header">
            {has('togetherWithFamilies') && (
              <motion.div
                className="flex items-center gap-3 sm:gap-4 text-center mt-8 sm:mt-0"
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
              >
                <span className="text-[#8F4557] text-lg">✦</span>
                <p className="tracking-[0.22em] text-sm sm:text-base uppercase text-[#1A1516] font-medium">
                  {t(lang, 'togetherWithFamilies')}
                </p>
                <span className="text-[#8F4557] text-lg">✦</span>
              </motion.div>
            )}

            {/* The invitation reads in the traditional order: the fathers
                extend the invitation → to their children's wedding → the
                couple's names → the blessing. */}
            {hasHonorBlock && (
              <motion.div
                className="text-center max-w-sm mx-auto"
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
              >
                {has('honorEyebrow') && (
                  <p className="text-sm sm:text-base uppercase tracking-[0.2em] text-[#8F4557] font-semibold mb-4">
                    {t(lang, 'honorEyebrow')}
                  </p>
                )}

                {/* Fathers' names — highlighted, standing apart from the body copy */}
                {hasFathers && (
                  <div className="flex items-center justify-center gap-4 sm:gap-6 mb-4">
                    {has('groomFatherName') && (
                      <div className="flex-1">
                        {has('groomFatherTitle') && (
                          <p className="text-xs sm:text-sm uppercase tracking-widest text-[#1A1516]/55 mb-1">
                            {t(lang, 'groomFatherTitle')}
                          </p>
                        )}
                        <p className="text-lg sm:text-xl font-bold text-[#8F4557] font-serif leading-snug">
                          {t(lang, 'groomFatherName')}
                        </p>
                      </div>
                    )}
                    {has('groomFatherName') && has('brideFatherName') && (
                      <span className="text-2xl sm:text-3xl text-[#8F4557] font-script drop-shadow-sm shrink-0">
                        {rtl ? 'و' : '&'}
                      </span>
                    )}
                    {has('brideFatherName') && (
                      <div className="flex-1">
                        {has('brideFatherTitle') && (
                          <p className="text-xs sm:text-sm uppercase tracking-widest text-[#1A1516]/55 mb-1">
                            {t(lang, 'brideFatherTitle')}
                          </p>
                        )}
                        <p className="text-lg sm:text-xl font-bold text-[#8F4557] font-serif leading-snug">
                          {t(lang, 'brideFatherName')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {has('requestHonor') && (
                  <p className="text-lg sm:text-xl text-[#1A1516] leading-relaxed font-serif px-4">
                    {t(lang, 'requestHonor').split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <br />}
                        {line}
                      </React.Fragment>
                    ))}
                  </p>
                )}
              </motion.div>
            )}

            {(has('coupleGroom') || has('coupleBride')) && (
              <motion.div
                className="text-center w-full my-2 sm:my-6"
                initial={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(6px)' }}
                whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 1.15, ease: 'easeOut' }}
              >
                {has('coupleGroom') && (
                  <h1
                    className={`font-script text-6xl sm:text-7xl md:text-8xl text-[#1A1516] ${rtl ? 'leading-[1.4]' : 'leading-[1.1]'}`}
                    style={{ textShadow: '1px 2px 0px rgba(212,138,150,0.35)' }}
                  >
                    {t(lang, 'coupleGroom')}
                  </h1>
                )}
                {has('coupleGroom') && has('coupleBride') && (
                  <div className="flex items-center justify-center gap-3 sm:gap-5 my-2 sm:my-4">
                    <div className="w-10 sm:w-20 h-[0.5px] bg-gradient-to-r from-transparent to-[#D48A96]" />
                    <span className="text-3xl sm:text-5xl text-[#8F4557] font-script drop-shadow-sm">
                      {rtl ? 'و' : '&'}
                    </span>
                    <div className="w-10 sm:w-20 h-[0.5px] bg-gradient-to-l from-transparent to-[#D48A96]" />
                  </div>
                )}
                {has('coupleBride') && (
                  <h1
                    className={`font-script text-6xl sm:text-7xl md:text-8xl text-[#1A1516] ${rtl ? 'leading-[1.4]' : 'leading-[1.1]'}`}
                    style={{ textShadow: '1px 2px 0px rgba(212,138,150,0.35)' }}
                  >
                    {t(lang, 'coupleBride')}
                  </h1>
                )}
              </motion.div>
            )}

            {has('blessing') && (
              <motion.div
                className="text-center max-w-sm mx-auto"
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
              >
                <p className="text-lg sm:text-xl text-[#1A1516] leading-loose px-4">
                  {t(lang, 'blessing')}
                </p>
              </motion.div>
            )}
          </React.Fragment>
        );
      }

      case 'greeting':
        if (!invitation) return null;
        return (
          <motion.div
            key="greeting"
            className="text-center max-w-sm mx-auto"
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            <div className="inline-flex flex-col items-center gap-1.5 px-8 py-4 border-[0.5px] border-[#D48A96]/50 bg-[#FDF9F8] shadow-sm relative">
              <div className="absolute inset-1 border-[0.5px] border-dashed border-[#D48A96]/25 pointer-events-none" />
              {has('especiallyFor') && (
                <p className="text-sm sm:text-base uppercase tracking-[0.22em] text-[#1A1516] font-medium">
                  {t(lang, 'especiallyFor')}
                </p>
              )}
              <p className="font-script text-3xl sm:text-4xl text-[#1A1516] leading-normal">
                {invitation.guestName}
              </p>
              {has('seatsReserved') && (
                <p className="text-base sm:text-lg font-bold text-[#1A1516] tracking-wide">
                  {(() => {
                    const seatsWord =
                      invitation.allowedCount === 1
                        ? t(lang, 'seatOne')
                        : t(lang, 'seatMany');
                    const [before, after] = t(lang, 'seatsReserved', {
                      seats: seatsWord,
                    }).split('{n}');
                    return (
                      <>
                        {before}
                        <span className="text-2xl sm:text-3xl text-[#8F4557]">
                          {invitation.allowedCount}
                        </span>
                        {after}
                      </>
                    );
                  })()}
                </p>
              )}
            </div>
          </motion.div>
        );

      case 'date':
        if (!has('dateLine')) return null;
        return (
          <motion.div
            key="date"
            className="flex items-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-sm mx-auto"
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            <div className="h-[0.5px] flex-1 bg-gradient-to-r from-transparent via-[#D48A96]/60 to-[#D48A96]/60" />
            <p className="text-base sm:text-lg uppercase tracking-[0.22em] font-bold text-[#1A1516] font-serif whitespace-nowrap">
              {t(lang, 'dateLine')}
            </p>
            <div className="h-[0.5px] flex-1 bg-gradient-to-l from-transparent via-[#D48A96]/60 to-[#D48A96]/60" />
          </motion.div>
        );

      case 'venue':
        return (
          <motion.div
            key="venue"
            className="flex flex-col items-center w-full max-w-[300px] sm:max-w-sm mx-auto mt-2 sm:mt-4"
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 1, ease: 'easeOut' }}
          >
            <div className="p-6 sm:p-10 bg-[#FDF9F8] border-[0.5px] border-[#D48A96]/50 rounded-t-full w-full flex flex-col items-center gap-2 sm:gap-3 shadow-sm relative overflow-hidden">
              <PineTreeSVG />
              <div className="text-center z-10 mt-1">
                {has('venueName') && (
                  <>
                    <p className="text-2xl sm:text-3xl font-bold tracking-wider mb-1.5 text-[#1A1516] font-serif">
                      {t(lang, 'venueName')}
                    </p>
                    <div className="h-[0.5px] w-10 bg-[#D48A96] mx-auto mb-2.5" />
                  </>
                )}
                {has('venueTime') && (
                  <p className="text-lg sm:text-xl font-bold text-[#1A1516] tracking-wide">
                    {t(lang, 'venueTime')}
                  </p>
                )}
                {has('noChildren') && (
                  <p className="text-sm sm:text-base text-[#1A1516] mt-2 leading-relaxed max-w-[230px] mx-auto">
                    {t(lang, 'noChildren')}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {(has('getDirections') || has('addToCalendar')) && (
              <div className="flex gap-2 sm:gap-3 mt-4 w-full">
                {has('getDirections') && (
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 border border-[#D48A96]/70 bg-transparent hover:bg-[#D48A96]/8 transition-colors text-[#1A1516] text-sm sm:text-base uppercase tracking-widest font-serif text-center leading-tight"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                    {t(lang, 'getDirections')}
                  </a>
                )}

                {has('addToCalendar') && (
                  <div className="flex-1 relative">
                    <button
                      onClick={() => setShowCalendar((v) => !v)}
                      className="w-full flex flex-col items-center justify-center gap-1.5 py-3 border border-[#D48A96]/70 bg-transparent hover:bg-[#D48A96]/8 transition-colors text-[#1A1516] text-sm sm:text-base uppercase tracking-widest font-serif text-center leading-tight"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      {t(lang, 'addToCalendar')}
                    </button>
                    <AnimatePresence>
                      {showCalendar && (
                        <CalendarMenu lang={lang} onClose={() => setShowCalendar(false)} />
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        );

      case 'countdown':
        return (
          <div key="countdown" className="w-full">
            <DividerSVG />
            <CountdownTimer lang={lang} />
          </div>
        );

      case 'rsvp':
        return (
          <div key="rsvp" id="rsvp-section" className="w-full">
            <DividerSVG />
            <RsvpSection
              token={token}
              invitation={invitation}
              lang={lang}
              onConfirmed={onConfirmed}
            />
            {/* Table finder (FR-020): only when tables are enabled */}
            {tablesEnabled && invitation?.tableName && (
              <motion.div
                className="w-full max-w-md mx-auto text-center px-4 relative z-20 mt-8"
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
              >
                <div className="inline-flex items-center gap-3 px-8 py-3.5 border-[0.5px] border-[#D48A96]/50 bg-[#FDF9F8] shadow-sm">
                  <span className="text-[#8F4557] text-lg">✦</span>
                  <p className="text-sm sm:text-base uppercase tracking-[0.22em] text-[#1A1516]">
                    {t(lang, 'yourTable')}&nbsp;·&nbsp;
                    <span className="text-[#1A1516] font-semibold">{invitation.tableName}</span>
                  </p>
                  <span className="text-[#8F4557] text-lg">✦</span>
                </div>
              </motion.div>
            )}
          </div>
        );

      case 'nuqoot':
        return (
          <div key="nuqoot" className="w-full">
            <DividerSVG />
            <NuqootSection lang={lang} />
          </div>
        );

      default:
        return null;
    }
  };

  const visibleSections = includeHidden ? sections : sections.filter((s) => s.enabled);

  return (
    <div
      id="invite-card"
      className="w-full max-w-2xl lg:max-w-3xl mx-auto min-h-screen pb-0 flex flex-col items-center relative shadow-2xl bg-[#F9F3F3] shadow-black/40 border border-[#D48A96]/25 overflow-hidden"
    >
      {/* Watercolor garland draping from the top of the card */}
      {topBg !== null && (
        <motion.div
          className="w-full pointer-events-none select-none relative z-20"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        >
          {topBg ? (
            <img src={topBg} alt="" className="w-full block" />
          ) : (
            <Garland className="w-full" />
          )}
        </motion.div>
      )}

      {/* Ambient falling petals drifting gently down the card */}
      <FallingPetals count={12} />

      {/* Content — type scale: display 5xl-7xl · heading 3xl-4xl ·
          subheading xl-2xl · body sm-base · label [10px]-xs */}
      <div
        className="w-full flex-grow flex flex-col items-center justify-center relative z-20 space-y-8 sm:space-y-10 pb-6 sm:pb-8 px-8 sm:px-12 -mt-6 sm:-mt-10"
        dir={rtl ? 'rtl' : 'ltr'}
      >
        {/* Sections render in the order (and visibility) configured
            from the admin panel's Invitation tab. */}
        {visibleSections.map((section, index) => {
          const node = sectionNode(section);
          // In the CMS, a section whose every line was cleared still needs
          // its editing chrome — show a slim placeholder instead of nothing.
          if (node === null && !renderSection) return null;
          const rendered =
            node ?? (
              <div className="w-full max-w-md mx-auto border border-dashed border-[#D48A96]/50 bg-white/50 px-4 py-3 text-center text-xs uppercase tracking-[0.18em] text-[#45383C]/45">
                Empty — edit this section to add text
              </div>
            );
          return (
            <React.Fragment key={section.id}>
              {renderSection ? renderSection(section, rendered, index) : node}
            </React.Fragment>
          );
        })}
      </div>

      {/* Watercolor garland mirrored along the bottom edge */}
      {bottomBg !== null && (
        <motion.div
          className="w-full max-w-full -mt-1 sm:-mt-2 pointer-events-none select-none relative z-20"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        >
          {bottomBg ? (
            <img src={bottomBg} alt="" className="w-full block" />
          ) : (
            <Garland flip className="w-full" />
          )}
        </motion.div>
      )}
    </div>
  );
}
