import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Garland, FallingPetals } from '@/components/Florals';
import { api, type InviteDetails, type PublicEvent } from '@/lib/api';
import { usePageTitle } from '@/hooks/use-page-title';
import {
  useLang,
  t,
  isRtl,
  setTextOverrides,
  resolveSections,
  type Lang,
  type InvitationConfig,
  type SectionId,
} from '@/lib/i18n';

const COUNTDOWN_TARGET = new Date('2026-07-25T16:00:00').getTime();

const MAPS_URL = 'https://maps.google.com/?q=Tal+Pine+Amman+Jordan';

// --- SVG COMPONENTS ---

/**
 * Realistic crimson wax seal: irregular poured-wax blob with drip bumps,
 * grainy body, a stamped circular depression, an engraved monogram and a
 * soft specular highlight. Light comes from the top-left.
 */
const WAX_BLOB =
  'M100,10 C121,8 141,14 156,27 C172,41 184,60 186,82 C188,101 183,122 170,139 C177,143 181,149 178,154 C175,159 167,158 162,153 C149,168 131,178 111,181 C90,184 68,179 51,167 C44,172 35,172 32,166 C29,161 33,154 39,152 C25,136 16,115 16,94 C16,72 26,50 43,35 C58,21 79,12 100,10 Z';

const WaxSealSVG = ({ idSuffix = '' }: { idSuffix?: string }) => (
  <svg viewBox="0 0 200 200" className="w-full h-full">
    <defs>
      <radialGradient id={`wax-body${idSuffix}`} cx="36%" cy="30%" r="78%">
        <stop offset="0%" stopColor="#D9848F" />
        <stop offset="38%" stopColor="#BC5F6F" />
        <stop offset="72%" stopColor="#9A3E51" />
        <stop offset="100%" stopColor="#71283A" />
      </radialGradient>
      <filter id={`wax-texture${idSuffix}`} x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="4" seed="7" result="noise" />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0.35  0 0 0 0 0.1  0 0 0 0 0.15  0 0 0 0.25 0"
          result="grain"
        />
        <feComposite operator="in" in="grain" in2="SourceGraphic" result="clippedGrain" />
        <feBlend mode="multiply" in="SourceGraphic" in2="clippedGrain" />
      </filter>
      <filter id={`wax-soft${idSuffix}`}>
        <feGaussianBlur stdDeviation="5" />
      </filter>
    </defs>

    {/* poured wax body */}
    <path d={WAX_BLOB} fill={`url(#wax-body${idSuffix})`} filter={`url(#wax-texture${idSuffix})`} />
    {/* melted rim shading */}
    <path d={WAX_BLOB} fill="none" stroke="#5E1F2F" strokeWidth="1.6" opacity="0.35" />
    {/* light catching the top of the rim */}
    <path
      d="M42,27 C60,13 82,8 100,9 C126,10 146,18 161,32"
      fill="none"
      stroke="#EBA5AB"
      strokeWidth="2.4"
      opacity="0.5"
      strokeLinecap="round"
    />

    {/* stamped circular depression */}
    <circle cx="100" cy="98" r="62" fill="#7C2C3F" opacity="0.55" filter={`url(#wax-soft${idSuffix})`} />
    <circle cx="100" cy="98" r="57" fill={`url(#wax-body${idSuffix})`} opacity="0.95" />
    <circle cx="100" cy="98" r="60" fill="none" stroke="#61202F" strokeWidth="2" opacity="0.5" />
    <circle cx="100" cy="98" r="55.5" fill="none" stroke="#E79AA3" strokeWidth="1" opacity="0.45" />

    {/* engraved monogram: light lower edge beneath a dark recessed glyph */}
    <text
      x="100.8" y="117.6"
      fontFamily="'Great Vibes', cursive" fontSize="54"
      fill="#F1B9BE" textAnchor="middle" opacity="0.4"
    >
      M&amp;R
    </text>
    <text
      x="100" y="116"
      fontFamily="'Great Vibes', cursive" fontSize="54"
      fill="#5E1F2F" textAnchor="middle" opacity="0.88"
    >
      M&amp;R
    </text>

    {/* soft specular highlight */}
    <ellipse
      cx="70" cy="50" rx="32" ry="16"
      fill="#FFE9E4" opacity="0.25"
      filter={`url(#wax-soft${idSuffix})`}
      transform="rotate(-18 70 50)"
    />
  </svg>
);

/** Gold star sparkles that fly outward — used when the wax seal cracks. */
const SEAL_SPARKLES = Array.from({ length: 14 }, (_, i) => ({
  angle: (i / 14) * Math.PI * 2 + 0.35,
  dist: 58 + (i % 3) * 26,
  size: i % 2 === 0 ? 9 : 6,
  delay: (i % 5) * 0.03,
}));

const SparkleStar = ({ size, color = '#F2BFC7' }: { size: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 10 10">
    <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={color} />
  </svg>
);

function SealSparkles() {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
      {SEAL_SPARKLES.map((s, i) => (
        <span
          key={i}
          className="absolute"
          style={
            {
              '--fly-x': `${Math.cos(s.angle) * s.dist}px`,
              '--fly-y': `${Math.sin(s.angle) * s.dist - 20}px`,
              animation: `sparkle-fly 0.95s cubic-bezier(0.2, 0.6, 0.4, 1) ${s.delay}s forwards`,
              opacity: 0,
            } as React.CSSProperties
          }
        >
          <SparkleStar size={s.size} color={i % 3 === 0 ? '#F6D4C9' : '#D48A96'} />
        </span>
      ))}
    </div>
  );
}

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
      'DTSTART;TZID=Asia/Amman:20260725T160000',
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
    '&dates=20260725T160000/20260725T230000' +
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
        className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#D48A96]/8 transition-colors text-[#45383C]/80 text-xs uppercase tracking-widest font-serif border-b border-[#D48A96]/20"
      >
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        {t(lang, 'googleCalendar')}
      </a>
      <button
        onClick={generateICS}
        className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#D48A96]/8 transition-colors text-[#45383C]/80 text-xs uppercase tracking-widest font-serif w-full text-left"
      >
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2v13m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
        </svg>
        {t(lang, 'downloadIcs')}
      </button>
    </motion.div>
  );
}

// --- MAIN COMPONENT ---

/** Small English/Arabic switch pinned to the corner of the page. */
function LangToggle({ lang }: { lang: Lang }) {
  const switchLang = () => {
    const params = new URLSearchParams(window.location.search);
    if (lang === 'ar') params.delete('lang');
    else params.set('lang', 'ar');
    const qs = params.toString();
    window.location.search = qs;
  };
  return (
    <button
      onClick={switchLang}
      className="fixed top-4 z-[60] px-3.5 py-1.5 bg-[#FDF9F8]/90 border border-[#D48A96]/45 text-[#8F4557] text-xs font-serif shadow-sm hover:bg-[#D48A96]/10 transition-colors backdrop-blur-sm"
      style={{ right: lang === 'ar' ? 'auto' : '1rem', left: lang === 'ar' ? '1rem' : 'auto' }}
      dir={lang === 'ar' ? 'ltr' : 'rtl'}
    >
      {lang === 'ar' ? 'English' : 'العربية'}
    </button>
  );
}

export default function WeddingInvitation() {
  const [isOpen, setIsOpen] = useState(false);
  const [cracking, setCracking] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const { toast } = useToast();
  const [, params] = useRoute('/i/:token');
  const token = params?.token ?? null;
  const [, navigate] = useLocation();
  const lang = useLang();
  const rtl = isRtl(lang);

  // Personalized invitation (when opened through /i/<token>)
  const inviteQuery = useQuery({
    queryKey: ['invite', token],
    queryFn: () => api.get<InviteDetails>(`/invite/${token}`),
    enabled: !!token,
    retry: false,
  });

  // Generic public event details (landing page without a token)
  const eventQuery = useQuery({
    queryKey: ['event'],
    queryFn: () => api.get<{ event: PublicEvent }>('/event'),
    enabled: !token,
    retry: false,
  });

  const event = inviteQuery.data?.event ?? eventQuery.data?.event ?? null;
  const invitation = inviteQuery.data?.invitation ?? null;

  // Couple-editable invitation configuration (admin panel → Invitation tab)
  const config = (event?.invitationConfig ?? null) as InvitationConfig | null;
  useMemo(() => setTextOverrides(config?.texts), [config]);
  const sections = useMemo(() => resolveSections(config), [config]);
  const backgrounds = config?.backgrounds ?? {};
  const centerBg =
    backgrounds.center === null
      ? null
      : backgrounds.center || `${import.meta.env.BASE_URL}floral-center.png`;
  const tablesEnabled = event?.tablesEnabled ?? false;

  usePageTitle(invitation ? `Invitation for ${invitation.guestName}` : undefined);

  // First name for the hand-addressed envelope front ("Ahmad Family" → "Ahmad").
  const firstName = invitation?.guestName.trim().split(/\s+/)[0] ?? null;

  // After the wedding, the invitation link becomes the memory archive (FR-033).
  useEffect(() => {
    if (event?.status === 'archived') navigate('/memories');
  }, [event?.status, navigate]);

  const handleOpen = () => {
    if (cracking || isOpen) return;
    setCracking(true);
    setTimeout(() => setIsOpen(true), 520);
    setTimeout(() => setShowContent(true), 520 + 1450);
  };

  if (token && inviteQuery.isError) {
    return (
      <div
        className="min-h-[100dvh] w-full bg-[#F3E4E2] flex items-center justify-center p-6 font-serif"
        dir={rtl ? 'rtl' : 'ltr'}
      >
        <LangToggle lang={lang} />
        <div className="max-w-md w-full bg-[#F9F3F3] border border-[#D48A96]/40 shadow-xl p-10 text-center relative">
          <div className="absolute inset-2 border-[0.5px] border-[#D48A96]/30 pointer-events-none" />
          <p className="font-script text-3xl sm:text-4xl text-[#D48A96] mb-4">
            {t(lang, 'invalidTitle')}
          </p>
          <p className="text-sm sm:text-base text-[#45383C]/75 leading-relaxed">
            {t(lang, 'invalidBody')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#F3E4E2] overflow-hidden relative selection:bg-[#D48A96]/30 font-serif">
      <LangToggle lang={lang} />
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20 mix-blend-multiply bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.06%22/%3E%3C/svg%3E')]" />

      <AnimatePresence>
        {!showContent && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-50 p-4 sm:p-8"
            exit={{ opacity: 0, transition: { duration: 1, delay: 0.5 } }}
          >
            <motion.div
              className="relative w-full max-w-lg aspect-[10/7] sm:aspect-[3/2] max-h-[80vh] bg-transparent mx-auto"
              style={{ perspective: 1200 }}
              animate={{ y: isOpen ? 0 : [0, -7, 0] }}
              transition={
                isOpen
                  ? { duration: 0.6, ease: 'easeOut' }
                  : { repeat: Infinity, duration: 4.5, ease: 'easeInOut' }
              }
            >
              {/* Soft ambient shadow — the envelope resting on the page */}
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-[78%] h-7 bg-[#45383C]/25 rounded-full blur-2xl" />

              {/* Invitation card tucked inside — rises out once the seal breaks */}
              <motion.div
                className="absolute inset-x-[8%] h-[78%] z-[5] bg-[#FDF9F8] shadow-lg rounded-[3px] border border-[#D48A96]/35 overflow-hidden"
                initial={{ top: '11%' }}
                animate={{ top: isOpen ? '-86%' : '11%' }}
                transition={{ duration: 1.15, delay: 0.4, ease: [0.65, 0, 0.35, 1] }}
              >
                <div className="absolute inset-2 border-[0.5px] border-[#D48A96]/40 pointer-events-none" />
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5" dir={rtl ? 'rtl' : 'ltr'}>
                  <p className="font-script text-3xl sm:text-4xl text-[#C4667A]">M &amp; R</p>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-[#8F4557]/60">
                    {t(lang, 'youAreInvited')}
                  </p>
                </div>
              </motion.div>

              {/* Envelope back with classic X folds */}
              <div
                className="absolute inset-0 z-10 shadow-2xl overflow-hidden rounded-[3px] cursor-pointer"
                style={{ background: 'linear-gradient(155deg, #FBF2EE 0%, #F5E4DD 48%, #EED6CC 100%)' }}
                onClick={handleOpen}
              >
                {/* Side folds */}
                <div
                  className="absolute inset-0 envelope-fold-left z-[12]"
                  style={{ background: 'linear-gradient(90deg, #F8ECE7 0%, #F0DCD4 100%)' }}
                />
                <div
                  className="absolute inset-0 envelope-fold-right z-[12]"
                  style={{ background: 'linear-gradient(270deg, #F8ECE7 0%, #F0DCD4 100%)' }}
                />

                {/* Bottom flap — the front pocket */}
                <div
                  className="absolute inset-0 envelope-fold-bottom z-[14]"
                  style={{ background: 'linear-gradient(0deg, #F1DCD3 0%, #F9EDE8 100%)', boxShadow: '0 -6px 16px rgba(70,45,50,0.05)' }}
                />

                {/* Fold seams */}
                <svg
                  className="absolute inset-0 z-[15] pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path d="M0 0 L50 50 L100 0 M0 100 L50 50 L100 100" fill="none" stroke="#C99AA0" strokeWidth="0.4" opacity="0.45" vectorEffect="non-scaling-stroke" />
                </svg>

                {/* Hand-addressed to the guest, written on the pocket */}
                <motion.div
                  className="absolute inset-x-0 bottom-[6%] z-[16] flex flex-col items-center pointer-events-none px-6"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: isOpen ? 0 : 1, y: 0 }}
                  transition={{ duration: 0.7, delay: isOpen ? 0 : 0.3 }}
                  dir={rtl ? 'rtl' : 'ltr'}
                >
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-[#8F4557]/65 mb-0.5">
                    {firstName ? t(lang, 'especiallyFor') : t(lang, 'withLoveTo')}
                  </p>
                  <p className="font-script text-2xl sm:text-3xl text-[#8F4557] leading-normal max-w-full truncate">
                    {firstName
                      ? t(lang, 'dearName', { name: firstName })
                      : t(lang, 'belovedGuests')}
                  </p>
                </motion.div>

                {/* Top flap — lifts open like a real envelope lid */}
                <motion.div
                  className="absolute inset-0 envelope-fold-top z-[18]"
                  style={{
                    background: 'linear-gradient(200deg, #F3E0D9 0%, #E9CDC3 100%)',
                    transformOrigin: 'top',
                    boxShadow: '0 3px 9px rgba(70,45,50,0.12)',
                    backfaceVisibility: 'hidden',
                  }}
                  initial={{ rotateX: 0 }}
                  animate={{ rotateX: isOpen ? 178 : 0 }}
                  transition={{ duration: 1.1, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                >
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <path d="M0 0 L50 50 L100 0" fill="none" stroke="#C99AA0" strokeWidth="0.4" opacity="0.5" vectorEffect="non-scaling-stroke" />
                  </svg>
                </motion.div>

                {/* Gentle paper sheen */}
                <div
                  className="absolute inset-0 z-[19] pointer-events-none"
                  style={{ background: 'linear-gradient(120deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 24%, rgba(255,255,255,0) 74%, rgba(70,45,50,0.05) 100%)' }}
                />
              </div>

              {/* Wax Seal — centered on the flap seam; cracks in two on open */}
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 sm:w-32 sm:h-32 z-40 flex items-center justify-center"
                animate={{ opacity: isOpen ? 0 : 1 }}
                transition={{ duration: 0.35, delay: isOpen ? 0.22 : 0 }}
                style={{
                  pointerEvents: isOpen ? 'none' : 'auto',
                  filter: 'drop-shadow(0 5px 7px rgba(70, 25, 38, 0.35)) drop-shadow(0 1px 2px rgba(70, 25, 38, 0.28))',
                }}
              >
                <motion.div
                  className="absolute inset-0 cursor-pointer rounded-full"
                  whileHover={!cracking ? { scale: 1.06 } : undefined}
                  animate={!cracking ? { scale: [1, 1.035, 1] } : { scale: 1 }}
                  transition={!cracking ? { repeat: Infinity, duration: 3.2, ease: 'easeInOut' } : { duration: 0.2 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpen();
                  }}
                >
                  {/* left half */}
                  <motion.div
                    className="absolute inset-0"
                    style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0% 100%)' }}
                    animate={
                      cracking
                        ? { x: -15, y: 9, rotate: -26, opacity: 0 }
                        : { x: 0, y: 0, rotate: 0, opacity: 1 }
                    }
                    transition={{ duration: 0.6, ease: [0.55, 0, 1, 0.4] }}
                  >
                    <WaxSealSVG idSuffix="a" />
                  </motion.div>
                  {/* right half */}
                  <motion.div
                    className="absolute inset-0"
                    style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }}
                    animate={
                      cracking
                        ? { x: 15, y: 9, rotate: 26, opacity: 0 }
                        : { x: 0, y: 0, rotate: 0, opacity: 1 }
                    }
                    transition={{ duration: 0.6, ease: [0.55, 0, 1, 0.4] }}
                  >
                    <WaxSealSVG idSuffix="b" />
                  </motion.div>
                </motion.div>

                {/* Gold dust flies as the seal breaks */}
                {cracking && <SealSparkles />}
              </motion.div>
            </motion.div>

            {!isOpen && (
              <motion.p
                className="absolute bottom-8 sm:bottom-12 text-[#45383C]/50 font-serif tracking-[0.35em] text-[10px] sm:text-xs uppercase"
                animate={{ opacity: cracking ? 0 : [0.35, 0.9, 0.35] }}
                transition={{ repeat: cracking ? 0 : Infinity, duration: 3 }}
                dir={rtl ? 'rtl' : 'ltr'}
              >
                {t(lang, 'breakSeal')}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showContent && (
          <motion.div
            className="w-full min-h-[100dvh] bg-[#F3E4E2] z-10 relative flex flex-col items-center pt-8 sm:pt-16 pb-16"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            <div
              className="w-full max-w-2xl lg:max-w-3xl mx-auto min-h-screen pb-0 flex flex-col items-center relative shadow-2xl bg-[#F9F3F3] shadow-black/40 border border-[#D48A96]/25 overflow-hidden"
            >

              {/* Watercolor garland draping from the top of the card */}
              <motion.div
                className="w-full pointer-events-none select-none"
                initial={{ opacity: 0, y: -18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.6, ease: 'easeOut' }}
              >
                <Garland className="w-full" />
              </motion.div>

              {/* Ambient falling petals drifting gently down the card */}
              <FallingPetals count={12} />

              {/* Content — type scale: display 5xl-7xl · heading 3xl-4xl ·
                  subheading xl-2xl · body sm-base · label [10px]-xs */}
              <div
                className="w-full flex-grow flex flex-col items-center justify-center relative z-20 space-y-8 sm:space-y-10 pb-10 sm:pb-14 px-8 sm:px-12 -mt-6 sm:-mt-10"
                dir={rtl ? 'rtl' : 'ltr'}
              >
                {/* Sections render in the order (and visibility) configured
                    from the admin panel's Invitation tab. */}
                {sections
                  .filter((s) => s.enabled)
                  .map((section) => {
                    switch (section.id) {
                      case 'header':
                        return (
                          <React.Fragment key="header">
                            <motion.div
                              className="flex items-center gap-3 sm:gap-4 text-center mt-8 sm:mt-0"
                              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
                            >
                              <span className="text-[#D48A96] text-sm">✦</span>
                              <p className="tracking-[0.22em] text-[10px] sm:text-xs uppercase text-[#45383C]/65 font-medium">
                                {t(lang, 'togetherWithFamilies')}
                              </p>
                              <span className="text-[#D48A96] text-sm">✦</span>
                            </motion.div>

                            <motion.div
                              className="text-center w-full my-2 sm:my-6"
                              initial={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(6px)' }}
                              whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                              viewport={{ once: true, amount: 0.4 }}
                              transition={{ duration: 1.15, ease: 'easeOut' }}
                            >
                              <h1
                                className={`font-script text-5xl sm:text-6xl md:text-7xl text-[#45383C] ${rtl ? 'leading-[1.4]' : 'leading-[1.1]'}`}
                                style={{ textShadow: '1px 2px 0px rgba(212,138,150,0.35)' }}
                              >
                                {t(lang, 'coupleGroom')}
                              </h1>
                              <div className="flex items-center justify-center gap-3 sm:gap-5 my-2 sm:my-4">
                                <div className="w-10 sm:w-20 h-[0.5px] bg-gradient-to-r from-transparent to-[#D48A96]" />
                                <span className="text-2xl sm:text-4xl text-[#D48A96] font-script drop-shadow-sm">
                                  {rtl ? 'و' : '&'}
                                </span>
                                <div className="w-10 sm:w-20 h-[0.5px] bg-gradient-to-l from-transparent to-[#D48A96]" />
                              </div>
                              <h1
                                className={`font-script text-5xl sm:text-6xl md:text-7xl text-[#45383C] ${rtl ? 'leading-[1.4]' : 'leading-[1.1]'}`}
                                style={{ textShadow: '1px 2px 0px rgba(212,138,150,0.35)' }}
                              >
                                {t(lang, 'coupleBride')}
                              </h1>
                            </motion.div>

                            <motion.div
                              className="text-center max-w-sm mx-auto"
                              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
                            >
                              <p className="text-sm sm:text-base text-[#45383C]/75 leading-relaxed italic font-serif px-4">
                                {t(lang, 'requestHonor').split('\n').map((line, i) => (
                                  <React.Fragment key={i}>
                                    {i > 0 && <br />}
                                    {line}
                                  </React.Fragment>
                                ))}
                              </p>
                              {/* The blessing appears in the other language — a bilingual grace note */}
                              <p
                                dir={rtl ? 'ltr' : 'rtl'}
                                lang={rtl ? 'en' : 'ar'}
                                className={`mt-4 text-sm sm:text-base text-[#B25A6C]/85 leading-loose px-4 ${rtl ? 'italic' : ''}`}
                              >
                                {t(rtl ? 'en' : 'ar', 'blessing')}
                              </p>
                            </motion.div>
                          </React.Fragment>
                        );

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
                              <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#D48A96] font-medium">
                                {t(lang, 'especiallyFor')}
                              </p>
                              <p className="font-script text-2xl sm:text-3xl text-[#45383C] leading-normal">
                                {invitation.guestName}
                              </p>
                              <p className="text-[10px] sm:text-xs text-[#45383C]/60 tracking-wide">
                                {t(lang, 'seatsReserved', {
                                  n: invitation.allowedCount,
                                  seats:
                                    invitation.allowedCount === 1
                                      ? t(lang, 'seatOne')
                                      : t(lang, 'seatMany'),
                                })}
                              </p>
                            </div>
                          </motion.div>
                        );

                      case 'date':
                        return (
                          <motion.div
                            key="date"
                            className="flex items-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-sm mx-auto"
                            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
                          >
                            <div className="h-[0.5px] flex-1 bg-gradient-to-r from-transparent via-[#D48A96]/60 to-[#D48A96]/60" />
                            <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#45383C]/65 font-serif whitespace-nowrap">
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
                                <p className="text-xl sm:text-2xl font-medium tracking-wider mb-1.5 text-[#45383C] font-serif">
                                  {t(lang, 'venueName')}
                                </p>
                                <div className="h-[0.5px] w-10 bg-[#D48A96] mx-auto mb-2.5" />
                                <p className="text-sm sm:text-base text-[#45383C]/75 italic tracking-wide">
                                  {t(lang, 'venueTime')}
                                </p>
                                <p className="text-[10px] sm:text-xs text-[#45383C]/55 mt-2.5 uppercase tracking-[0.22em]">
                                  {t(lang, 'formalAttire')}
                                </p>
                                <p className="text-[10px] sm:text-xs text-[#B25A6C]/75 mt-2 italic leading-relaxed max-w-[230px] mx-auto">
                                  {t(lang, 'noChildren')}
                                </p>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2 sm:gap-3 mt-4 w-full">
                              <a
                                href={MAPS_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 border border-[#D48A96]/70 bg-transparent hover:bg-[#D48A96]/8 transition-colors text-[#45383C]/75 text-[10px] sm:text-xs uppercase tracking-widest font-serif"
                              >
                                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                  <circle cx="12" cy="9" r="2.5" />
                                </svg>
                                {t(lang, 'getDirections')}
                              </a>

                              <div className="flex-1 relative">
                                <button
                                  onClick={() => setShowCalendar((v) => !v)}
                                  className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 border border-[#D48A96]/70 bg-transparent hover:bg-[#D48A96]/8 transition-colors text-[#45383C]/75 text-[10px] sm:text-xs uppercase tracking-widest font-serif"
                                >
                                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
                            </div>
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
                          <div key="rsvp" className="w-full">
                            <DividerSVG />
                            <RsvpSection token={token} invitation={invitation} lang={lang} />
                            {/* Table finder (FR-020): only when tables are enabled */}
                            {tablesEnabled && invitation?.tableName && (
                              <motion.div
                                className="w-full max-w-md mx-auto text-center px-4 relative z-20 mt-8"
                                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
                              >
                                <div className="inline-flex items-center gap-3 px-8 py-3.5 border-[0.5px] border-[#D48A96]/50 bg-[#FDF9F8] shadow-sm">
                                  <span className="text-[#D48A96] text-sm">✦</span>
                                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#45383C]/70">
                                    {t(lang, 'yourTable')}&nbsp;·&nbsp;
                                    <span className="text-[#45383C] font-semibold">{invitation.tableName}</span>
                                  </p>
                                  <span className="text-[#D48A96] text-sm">✦</span>
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
                  })}
              </div>

              {/* Watercolor garland mirrored along the bottom edge */}
              <motion.div
                className="w-full max-w-full mt-6 sm:mt-10 pointer-events-none select-none relative z-0"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
              >
                <Garland flip className="w-full" />
              </motion.div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RsvpSection({
  token,
  invitation,
  lang,
}: {
  token: string | null;
  invitation: InviteDetails['invitation'] | null;
  lang: Lang;
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
      <motion.h2
        className="font-script text-3xl sm:text-4xl text-[#45383C] mb-1 sm:mb-3"
        initial={{ opacity: 0, y: 20, filter: 'blur(5px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        {t(lang, 'rsvpTitle')}
      </motion.h2>

      {answered ? (
        <div className="space-y-4 relative">
          {celebrating && <CelebrationBurst />}
          <div className="px-8 py-6 border-[0.5px] border-[#D48A96]/50 bg-[#FDF9F8] shadow-sm relative">
            <div className="absolute inset-1 border-[0.5px] border-dashed border-[#D48A96]/25 pointer-events-none" />
            {invitation!.rsvpStatus === 'confirmed' ? (
              <>
                <p className="font-script text-2xl sm:text-3xl text-[#D48A96] mb-2">
                  {t(lang, 'joyfullyAccepted')}
                </p>
                <p className="text-sm sm:text-base text-[#45383C]/75 italic">
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
                <p className="font-script text-2xl sm:text-3xl text-[#45383C]/70 mb-2">
                  {t(lang, 'regretfullyDeclined')}
                </p>
                <p className="text-sm sm:text-base text-[#45383C]/75 italic">
                  {t(lang, 'dearlyMissed')}
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#B25A6C] underline underline-offset-4 hover:text-[#8F4557] transition-colors"
          >
            {t(lang, 'changeResponse')}
          </button>
        </div>
      ) : choosingCount && invitation ? (
        <div className="space-y-5">
          <p className="text-sm sm:text-base text-[#45383C]/75 italic font-serif">
            {t(lang, 'howMany')}
          </p>
          <div className="flex items-center justify-center gap-5">
            <button
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              className="w-11 h-11 border border-[#D48A96] text-[#B25A6C] text-xl hover:bg-[#D48A96]/10 transition-colors"
              aria-label="Fewer guests"
            >
              −
            </button>
            <span className="text-3xl sm:text-4xl font-serif text-[#45383C] w-14 tabular-nums">{count}</span>
            <button
              onClick={() => setCount((c) => Math.min(invitation.allowedCount, c + 1))}
              className="w-11 h-11 border border-[#D48A96] text-[#B25A6C] text-xl hover:bg-[#D48A96]/10 transition-colors"
              aria-label="More guests"
            >
              +
            </button>
          </div>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#45383C]/50">
            {t(lang, 'upToGuests', { n: invitation.allowedCount })}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              disabled={rsvpMutation.isPending}
              onClick={() => rsvpMutation.mutate({ status: 'confirmed', count })}
              className="group relative px-8 py-3.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-[10px] sm:text-xs font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
            >
              <div className="absolute inset-[3px] border-[0.5px] border-[#F9F3F3]/40 pointer-events-none" />
              {rsvpMutation.isPending ? t(lang, 'sending') : t(lang, 'confirmAttendance')}
            </button>
            <button
              onClick={() => setChoosingCount(false)}
              className="px-8 py-3.5 text-[#45383C]/60 border border-[#D48A96]/40 uppercase tracking-widest text-[10px] sm:text-xs hover:bg-[#D48A96]/5 transition-colors"
            >
              {t(lang, 'back')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm sm:text-base text-[#45383C]/75 italic mb-5 sm:mb-7 font-serif">
            {t(lang, 'willYouJoin')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-center w-full px-4">
            <button
              disabled={rsvpMutation.isPending}
              onClick={handleAccept}
              className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] rounded-none uppercase tracking-widest text-[10px] sm:text-xs font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl w-full sm:w-auto disabled:opacity-60"
            >
              <div className="absolute inset-[3px] border-[0.5px] border-[#F9F3F3]/40 pointer-events-none transition-transform group-hover:scale-[0.98]" />
              {t(lang, 'joyfullyAccepts')}
            </button>
            <button
              disabled={rsvpMutation.isPending}
              onClick={handleDecline}
              className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-transparent text-[#B25A6C] border border-[#D48A96] hover:bg-[#D48A96]/5 transition-all uppercase tracking-widest text-[10px] sm:text-xs font-semibold w-full sm:w-auto shadow-sm disabled:opacity-60"
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

const CLIQ_ALIAS = 'MAGHATHE7';

/** Nuqoot (نقوط) — the beloved wedding gift tradition, made effortless via CliQ. */
function NuqootSection({ lang }: { lang: Lang }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const rtl = isRtl(lang);

  const copyAlias = async () => {
    try {
      await navigator.clipboard.writeText(CLIQ_ALIAS);
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
      <h2 className="font-script text-3xl sm:text-4xl text-[#45383C] mb-2">
        {t(lang, 'nuqootTitle')}
      </h2>
      <p
        dir={rtl ? 'ltr' : 'rtl'}
        lang={rtl ? 'en' : 'ar'}
        className="text-sm sm:text-base text-[#D48A96] mb-4"
      >
        {t(lang, 'nuqootSub')}
      </p>
      <p className="text-sm sm:text-base text-[#45383C]/70 italic font-serif max-w-sm mx-auto leading-relaxed mb-6">
        {t(lang, 'nuqootBody')}
      </p>

      <div className="relative inline-flex flex-col items-center gap-3 px-8 sm:px-12 py-6 bg-[#FDF9F8] border-[0.5px] border-[#D48A96]/50 shadow-sm">
        <div className="absolute inset-1.5 border-[0.5px] border-dashed border-[#D48A96]/25 pointer-events-none" />
        <div className="flex items-center gap-2">
          {/* Simple bank-transfer glyph */}
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#B25A6C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10 L12 4 L21 10" />
            <path d="M5 10 v7 M9.5 10 v7 M14.5 10 v7 M19 10 v7" />
            <path d="M3 20 h18" />
          </svg>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#45383C]/60">
            {t(lang, 'cliqAlias')}
          </p>
        </div>
        <p className="text-xl sm:text-2xl tracking-[0.18em] text-[#45383C] font-medium tabular-nums" dir="ltr">
          {CLIQ_ALIAS}
        </p>
        <button
          onClick={copyAlias}
          className="group relative mt-1 px-7 py-2.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-[10px] sm:text-xs font-semibold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="absolute inset-[3px] border-[0.5px] border-[#F9F3F3]/40 pointer-events-none" />
          {copied ? t(lang, 'copied') : t(lang, 'copyAlias')}
        </button>
        <p className="text-[10px] sm:text-xs text-[#45383C]/50 tracking-wide">
          {t(lang, 'cliqNote')}
        </p>
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
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
        <div className="h-[0.5px] bg-gradient-to-r from-transparent via-[#D48A96]/50 to-transparent flex-1 max-w-[80px] sm:max-w-[110px]" />
        <p className="tracking-[0.22em] text-[10px] sm:text-xs uppercase text-[#D48A96] font-medium font-serif">
          {t(lang, 'countingDown')}
        </p>
        <div className="h-[0.5px] bg-gradient-to-r from-transparent via-[#D48A96]/50 to-transparent flex-1 max-w-[80px] sm:max-w-[110px]" />
      </div>

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
            <div className="w-14 h-16 sm:w-16 sm:h-20 md:w-20 md:h-24 flex items-center justify-center bg-[#F9F3F3] border-[0.5px] border-[#D48A96]/55 shadow-md relative overflow-hidden mb-2 sm:mb-3 group-hover:shadow-lg transition-shadow">
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
                    className="text-xl sm:text-2xl md:text-3xl text-[#45383C] font-medium font-serif block absolute tabular-nums"
                  >
                    {value.toString().padStart(2, '0')}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#45383C]/55 font-serif">{label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
