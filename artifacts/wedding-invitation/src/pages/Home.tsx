import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { FallingPetals } from '@/components/Florals';
import InvitationCard, { SparkleStar } from '@/components/InvitationCard';
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
} from '@/lib/i18n';

type GuestScreen = 'invite' | 'pass' | 'memories' | 'guestbook';

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
      className="fixed top-4 z-[60] px-3.5 py-1.5 bg-[#FDF9F8]/90 border border-[#D48A96]/45 text-[#8F4557] text-sm font-serif shadow-sm hover:bg-[#D48A96]/10 transition-colors backdrop-blur-sm"
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
  const [guestScreen, setGuestScreen] = useState<GuestScreen>('invite');
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
      : backgrounds.center || `${import.meta.env.BASE_URL}faded-transparent-floral-background.png`;
  const topBg = backgrounds.top;
  const bottomBg = backgrounds.bottom;
  const tablesEnabled = event?.tablesEnabled ?? false;
  const enableEnglish = event?.enableEnglish ?? true;
  const enableArabic = event?.enableArabic ?? true;
  const bothLangsEnabled = enableEnglish && enableArabic;

  // If the couple disabled the language currently selected (e.g. via a stale
  // ?lang=ar link), fall back to whichever language is still enabled.
  useEffect(() => {
    if (!event) return;
    if (lang === 'ar' && !enableArabic) {
      const params = new URLSearchParams(window.location.search);
      params.delete('lang');
      window.location.search = params.toString();
    } else if (lang === 'en' && !enableEnglish && enableArabic) {
      const params = new URLSearchParams(window.location.search);
      params.set('lang', 'ar');
      window.location.search = params.toString();
    }
  }, [event, lang, enableEnglish, enableArabic]);

  // Warm the browser's image cache for the card's garland art the moment we
  // know its URL, instead of only fetching it once the card mounts — the
  // guest can open the envelope in well under a second.
  useEffect(() => {
    const garlandDefault = `${import.meta.env.BASE_URL}garland.svg`;
    const urls = [topBg || garlandDefault, bottomBg || garlandDefault, centerBg].filter(
      (url): url is string => Boolean(url),
    );
    for (const url of urls) {
      const img = new Image();
      img.src = url;
    }
  }, [topBg, bottomBg, centerBg]);
  const isConfirmed = invitation?.rsvpStatus === 'confirmed';

  usePageTitle(invitation ? `Invitation for ${invitation.guestName}` : undefined);

  // First name for the hand-addressed envelope front ("Ahmad Family" → "Ahmad").
  const firstName = invitation?.guestName.trim().split(/\s+/)[0] ?? null;

  // After the wedding, the invitation link becomes the memory archive (FR-033).
  useEffect(() => {
    if (event?.status === 'archived') navigate('/memories');
  }, [event?.status, navigate]);

  useEffect(() => {
    if (isConfirmed) {
      setShowContent(true);
      setGuestScreen((current) => (current === 'invite' ? 'pass' : current));
    } else {
      setGuestScreen('invite');
    }
  }, [isConfirmed]);

  const handleOpen = () => {
    if (cracking || isOpen) return;
    setCracking(true);
    setTimeout(() => setIsOpen(true), 520);
    setTimeout(() => setShowContent(true), 520 + 1450);
  };

  // The admin CMS is the source of truth for every word on the envelope and
  // card — wait for the event config before painting anything, so the guest
  // never sees the built-in fallback copy flash before the saved wording.
  if (token ? inviteQuery.isPending : eventQuery.isPending) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#F3E4E2] flex items-center justify-center font-serif">
        <motion.p
          className="font-script text-4xl text-[#8F4557]/70"
          animate={{ opacity: [0.3, 0.85, 0.3] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        >
          M &amp; R
        </motion.p>
      </div>
    );
  }

  if (token && inviteQuery.isError) {
    return (
      <div
        className="min-h-[100dvh] w-full bg-[#F3E4E2] flex items-center justify-center p-6 font-serif"
        dir={rtl ? 'rtl' : 'ltr'}
      >
        <LangToggle lang={lang} />
        <div className="max-w-md w-full bg-[#F9F3F3] border border-[#D48A96]/40 shadow-xl p-10 text-center relative">
          <div className="absolute inset-2 border-[0.5px] border-[#D48A96]/30 pointer-events-none" />
          <p className="font-script text-3xl sm:text-4xl text-[#8F4557] mb-4">
            {t(lang, 'invalidTitle')}
          </p>
          <p className="text-base sm:text-lg text-[#45383C]/75 leading-relaxed">
            {t(lang, 'invalidBody')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#F3E4E2] overflow-hidden relative selection:bg-[#D48A96]/30 font-serif">
      {bothLangsEnabled && <LangToggle lang={lang} />}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20 mix-blend-multiply bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.06%22/%3E%3C/svg%3E')]" />
      {showContent && centerBg && (
        <motion.img
          src={centerBg}
          alt=""
          aria-hidden="true"
          className="fixed left-1/2 top-1/2 z-[11] w-[min(84vw,620px)] max-h-[78vh] -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none select-none"
          style={{ opacity: 0.75 }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 0.75, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      )}

      <AnimatePresence>
        {!showContent && !isConfirmed && (
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
                  <p className="font-script text-3xl sm:text-4xl text-[#8F4557]">M &amp; R</p>
                  <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-[#8F4557]/60">
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
                  <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-[#8F4557]/65 mb-0.5">
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
                className="absolute bottom-8 sm:bottom-12 text-[#45383C]/50 font-serif tracking-[0.35em] text-xs sm:text-sm uppercase"
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
            className="w-full min-h-[100dvh] z-10 relative flex flex-col items-center pt-8 sm:pt-16 pb-24"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            {guestScreen === 'invite' && (
              <InvitationCard
                lang={lang}
                sections={sections}
                invitation={invitation}
                token={token}
                tablesEnabled={tablesEnabled}
                topBg={topBg}
                bottomBg={bottomBg}
                onConfirmed={() => setGuestScreen('pass')}
              />
            )}
            {guestScreen !== 'invite' && token && invitation && (
              <GuestScreenShell
                token={token}
                invitation={invitation}
                lang={lang}
                screen={guestScreen}
                uploadsEnabled={event?.uploadsEnabled ?? true}
                maxUploadsPerGuest={event?.maxUploadsPerGuest ?? 5}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {showContent && token && invitation && isConfirmed && (
        <GuestBottomNav
          active={guestScreen}
          onSelect={setGuestScreen}
          lang={lang}
        />
      )}
    </div>
  );
}

function GuestBottomNav({
  active,
  onSelect,
  lang,
}: {
  active: GuestScreen;
  onSelect: (screen: GuestScreen) => void;
  lang: Lang;
}) {
  const items: { id: GuestScreen; label: string; icon: string }[] = [
    { id: 'invite', label: lang === 'ar' ? 'الدعوة' : 'Invite', icon: 'M' },
    { id: 'pass', label: lang === 'ar' ? 'الدخول' : 'Pass', icon: 'P' },
    { id: 'memories', label: lang === 'ar' ? 'الذكريات' : 'Memories', icon: '✥' },
    { id: 'guestbook', label: lang === 'ar' ? 'التهاني' : 'Guestbook', icon: 'G' },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none"
      dir={isRtl(lang) ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto flex max-w-md items-center justify-around rounded-[2rem] border border-white/55 bg-[#FDF9F8]/58 px-2 py-2 shadow-[0_18px_50px_rgba(69,56,60,0.22)] backdrop-blur-2xl pointer-events-auto ring-1 ring-[#D48A96]/20">
        {items.map((item) => {
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`group relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.5rem] px-2 py-2 transition-all ${
                selected ? 'text-[#8F4557]' : 'text-[#8F7A67]/75 hover:text-[#8F4557]'
              }`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-all ${
                selected
                  ? 'border-white/70 bg-white/70 text-[#8F4557] shadow-[0_8px_24px_rgba(178,90,108,0.22)] scale-105'
                  : 'border-white/45 bg-white/35 group-hover:bg-white/55'
              }`}>
                {item.icon}
              </span>
              <span className="truncate text-[10px] uppercase tracking-[0.12em]">
                {item.label}
              </span>
              {selected && (
                <motion.span
                  layoutId="guest-nav-active"
                  className="absolute inset-0 -z-10 rounded-[1.5rem] bg-[#D48A96]/12"
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function GuestScreenShell({
  token,
  invitation,
  lang,
  screen,
  uploadsEnabled,
  maxUploadsPerGuest,
}: {
  token: string;
  invitation: InviteDetails['invitation'];
  lang: Lang;
  screen: GuestScreen;
  uploadsEnabled: boolean;
  maxUploadsPerGuest: number;
}) {
  const renderScreen = () => {
    switch (screen) {
      case 'pass':
        return <GuestPassSection token={token} invitation={invitation} lang={lang} />;
      case 'memories':
        return (
          <GuestMemorySection
            token={token}
            invitation={invitation}
            lang={lang}
            uploadsEnabled={uploadsEnabled}
            maxUploadsPerGuest={maxUploadsPerGuest}
          />
        );
      case 'guestbook':
        return <GuestbookSection token={token} invitation={invitation} lang={lang} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="w-full max-w-2xl lg:max-w-3xl mx-auto min-h-[calc(100dvh-8rem)] flex flex-col items-center relative shadow-2xl bg-[#F9F3F3] shadow-black/40 border border-[#D48A96]/25 overflow-hidden px-8 sm:px-12 py-10 sm:py-14"
      dir={isRtl(lang) ? 'rtl' : 'ltr'}
    >
      <div className="absolute inset-3 border-[0.5px] border-[#D48A96]/25 pointer-events-none" />
      <FallingPetals count={8} />
      <div className="relative z-20 w-full flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            className="w-full"
            initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function GuestPassSection({
  token,
  invitation,
  lang,
}: {
  token: string;
  invitation: InviteDetails['invitation'];
  lang: Lang;
}) {
  const checkedInCount = invitation.checkedIn ?? 0;
  return (
    <section className="mx-auto max-w-md text-center">
      <p className="text-xs uppercase tracking-[0.28em] text-[#D48A96]">
        {lang === 'ar' ? 'بطاقة الدخول' : 'Entrance pass'}
      </p>
      <h2 className="font-script text-4xl text-[#45383C] mt-2">
        {invitation.guestName}
      </h2>
      <div className="relative mx-auto mt-6 inline-block bg-[#FDF9F8] p-4 border border-[#D48A96]/45 shadow-lg">
        <div className="absolute inset-1 border border-dashed border-[#D48A96]/20 pointer-events-none" />
        <img
          src={`/api/qr/invite/${token}`}
          alt={lang === 'ar' ? 'رمز الدخول' : 'Entrance QR code'}
          className="relative h-48 w-48"
        />
      </div>
      <p className="mx-auto mt-4 max-w-sm text-base text-[#45383C]/70 italic">
        {lang === 'ar'
          ? 'اعرضوا هذا الرمز عند المدخل لتسجيل حضوركم.'
          : 'Show this QR at the entrance so the guard can check you in.'}
      </p>
      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[#45383C]/50">
        {lang === 'ar' ? `عدد الحضور المؤكد: ${invitation.rsvpCount ?? invitation.allowedCount}` : `${invitation.rsvpCount ?? invitation.allowedCount} confirmed guest(s)`}
      </p>
      {checkedInCount > 0 && (
        <div className="mt-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 px-5 py-4 text-emerald-900 shadow-sm text-center">
          <p className="text-xs uppercase tracking-[0.22em] font-semibold">
            {lang === 'ar' ? 'أهلاً وسهلاً' : 'Welcome'}
          </p>
          <p className="mt-2 text-base leading-relaxed">
            {lang === 'ar'
              ? 'تم تسجيل حضوركم بنجاح. نتمنى لكم أمسية جميلة وممتعة معنا.'
              : 'Your check-in is complete. We are glad to welcome you to the celebration.'}
          </p>
          <p className="mt-2 text-sm opacity-80">
            {lang === 'ar'
              ? `عدد المسجلين حتى الآن: ${checkedInCount}`
              : `Checked in count: ${checkedInCount}`}
          </p>
        </div>
      )}
    </section>
  );
}

function GuestMemorySection({
  token,
  invitation,
  lang,
  uploadsEnabled,
  maxUploadsPerGuest,
}: {
  token: string;
  invitation: InviteDetails['invitation'];
  lang: Lang;
  uploadsEnabled: boolean;
  maxUploadsPerGuest: number;
}) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(invitation.guestName);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('inviteToken', token);
      if (name.trim()) fd.append('uploadedByName', name.trim());
      if (caption.trim()) fd.append('caption', caption.trim());
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setSent(true);
      setFile(null);
      setCaption('');
      toast({ title: lang === 'ar' ? 'تم إرسال الذكرى' : 'Memory sent', duration: 3000 });
    } catch (e) {
      toast({ title: lang === 'ar' ? 'تعذر الإرسال' : 'Upload failed', description: e instanceof Error ? e.message : '' });
    } finally {
      setBusy(false);
    }
  };

  if (!uploadsEnabled) {
    return (
      <section className="mx-auto max-w-md">
        <div className="text-center mb-5">
          <p className="text-xs uppercase tracking-[0.28em] text-[#D48A96]">
            {lang === 'ar' ? 'شاركوا اللحظة' : 'Share the moment'}
          </p>
          <h2 className="font-script text-4xl text-[#45383C] mt-2">
            {lang === 'ar' ? 'الذكريات' : 'Memories'}
          </h2>
        </div>
        <div className="rounded-[1.5rem] border border-[#D48A96]/25 bg-[#FDF9F8]/90 px-5 py-8 text-center shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-[#B25A6C]">
            {lang === 'ar' ? 'الرفع متوقف حالياً' : 'Uploads are locked'}
          </p>
          <p className="mt-3 text-base text-[#45383C]/75 leading-relaxed">
            {lang === 'ar'
              ? 'هذا القسم متوقف مؤقتاً من لوحة الإدارة. ما زال بإمكانكم إرسال التهاني من سجل التهاني.'
              : 'This section is temporarily locked from the admin panel. You can still send wishes through the guestbook.'}
          </p>
          <p className="mt-3 text-sm uppercase tracking-[0.18em] text-[#45383C]/45">
            {lang === 'ar'
              ? `الحد الحالي لكل ضيف: ${maxUploadsPerGuest}`
              : `Current limit per guest: ${maxUploadsPerGuest}`}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md">
      <div className="text-center mb-5">
        <p className="text-xs uppercase tracking-[0.28em] text-[#D48A96]">
          {lang === 'ar' ? 'شاركوا اللحظة' : 'Share the moment'}
        </p>
        <h2 className="font-script text-4xl text-[#45383C] mt-2">
          {lang === 'ar' ? 'الذكريات' : 'Memories'}
        </h2>
        <p className="mt-3 text-base text-[#45383C]/70 italic">
          {lang === 'ar'
            ? 'ارفعوا صورة أو فيديو قصير من هنا ليظهر مباشرة في شاشة الذكريات الحية.'
            : 'Upload a photo or short video here to show it on the live wall.'}
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#45383C]/45">
          {lang === 'ar'
            ? `يمكن لكل ضيف إرسال حتى ${maxUploadsPerGuest} عناصر`
            : `Each guest can send up to ${maxUploadsPerGuest} items`}
        </p>
      </div>
      <div className="border border-[#D48A96]/35 bg-[#FDF9F8]/85 p-5 shadow-sm space-y-3">
        {sent && (
          <p className="text-base text-emerald-700 text-center">
            {lang === 'ar' ? 'شكراً لكم، تمت مشاركة الذكرى مع شاشة الذكريات الحية.' : 'Thank you. Your memory was shared to the live wall.'}
          </p>
        )}
        <label className="block cursor-pointer rounded-sm border-2 border-dashed border-[#D48A96]/45 bg-white/70 px-4 py-5 text-center hover:bg-[#D48A96]/5 transition-colors">
          <span className="block text-xs uppercase tracking-[0.22em] text-[#B25A6C]">
            {lang === 'ar' ? 'رفع للعرض على الشاشة' : 'Upload for live wall'}
          </span>
          <span className="mt-2 block text-base text-[#45383C]">
            {file
              ? file.name
              : lang === 'ar'
                ? 'اختاروا صورة أو فيديو قصير'
                : 'Choose a photo or short video'}
          </span>
          <span className="mt-1 block text-sm text-[#45383C]/55">
            {lang === 'ar'
              ? 'الملفات المدعومة: صور أو فيديو قصير'
              : 'Supported: images or short video clips'}
          </span>
          <input
            type="file"
            accept="image/*,video/mp4,video/quicktime,video/webm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={lang === 'ar' ? 'الاسم' : 'Name'}
          className="w-full px-3 py-2.5 border border-[#D48A96]/30 bg-white/80 text-base focus:outline-none focus:border-[#B25A6C]"
        />
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={lang === 'ar' ? 'تعليق قصير اختياري' : 'Optional short caption'}
          className="w-full px-3 py-2.5 border border-[#D48A96]/30 bg-white/80 text-base focus:outline-none focus:border-[#B25A6C]"
        />
        <button
          disabled={!file || busy}
          onClick={submit}
          className="w-full py-3.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-sm font-semibold disabled:opacity-50"
        >
          {busy ? (lang === 'ar' ? 'جارٍ الإرسال...' : 'Sending...') : (lang === 'ar' ? 'إرسال ذكرى' : 'Send memory')}
        </button>
      </div>
    </section>
  );
}

function GuestbookSection({
  token,
  invitation,
  lang,
}: {
  token: string;
  invitation: InviteDetails['invitation'];
  lang: Lang;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(invitation.guestName);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.post('/guestbook', {
        guestName: name.trim() || undefined,
        text: text.trim(),
        inviteToken: token,
      });
      setText('');
      toast({ title: lang === 'ar' ? 'تم حفظ التهنئة' : 'Wish saved', duration: 3000 });
    } catch (e) {
      toast({ title: lang === 'ar' ? 'تعذر الإرسال' : 'Could not send', description: e instanceof Error ? e.message : '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-md">
      <div className="text-center mb-5">
        <p className="text-xs uppercase tracking-[0.28em] text-[#D48A96]">
          {lang === 'ar' ? 'كلمة للعروسين' : 'A wish for the couple'}
        </p>
        <h2 className="font-script text-4xl text-[#45383C] mt-2">
          {lang === 'ar' ? 'سجل التهاني' : 'Guestbook'}
        </h2>
        <p className="mt-3 text-base text-[#45383C]/70 italic">
          {lang === 'ar'
            ? 'اكتبوا تهنئتكم هنا لتظهر ضمن شاشة الذكريات الحية.'
            : 'Write your wish here to have it shown on the live wall.'}
        </p>
      </div>
      <div className="border border-[#D48A96]/35 bg-[#FDF9F8]/85 p-5 shadow-sm space-y-3">
        <textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={lang === 'ar' ? 'اكتبوا تهنئتكم هنا...' : 'Write your wish here...'}
          className="w-full px-3 py-2.5 border border-[#D48A96]/30 bg-white/80 text-base focus:outline-none focus:border-[#B25A6C]"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={lang === 'ar' ? 'الاسم' : 'Name'}
          className="w-full px-3 py-2.5 border border-[#D48A96]/30 bg-white/80 text-base focus:outline-none focus:border-[#B25A6C]"
        />
        <button
          disabled={!text.trim() || busy}
          onClick={submit}
          className="w-full py-3.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-sm font-semibold disabled:opacity-50"
        >
          {busy ? (lang === 'ar' ? 'جارٍ الإرسال...' : 'Sending...') : (lang === 'ar' ? 'إرسال التهنئة' : 'Send wish')}
        </button>
      </div>
    </section>
  );
}

