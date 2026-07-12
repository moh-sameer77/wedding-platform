import { useMemo } from 'react';
import { useSearch } from 'wouter';

export type Lang = 'en' | 'ar';

/**
 * Invitation copy in both languages. The admin chooses which link to send
 * (`/i/<token>` or `/i/<token>?lang=ar`); guests can also switch in place.
 */
const STRINGS = {
  // Envelope
  breakSeal: { en: 'Break the seal to open', ar: 'اكسروا الختم لفتح الدعوة' },
  especiallyFor: { en: 'Especially for', ar: 'دعوة خاصة إلى' },
  withLoveTo: { en: 'With love, to', ar: 'بكل الحب، إلى' },
  belovedGuests: { en: 'Our Beloved Guests', ar: 'ضيوفنا الأعزاء' },
  dearName: { en: 'Dear {name}', ar: 'عزيزنا {name}' },
  youAreInvited: { en: 'You are invited', ar: 'أنتم مدعوون' },

  // Header
  coupleGroom: { en: 'Mohammad', ar: 'محمد' },
  coupleBride: { en: 'Renad', ar: 'رناد' },
  togetherWithFamilies: {
    en: 'Together with their families',
    ar: 'بمشاركة عائلتيهما الكريمتين',
  },
  requestHonor: {
    en: 'joyfully request the honor of your presence\nat their wedding celebration',
    ar: 'يتشرفان بدعوتكم لمشاركتهما\nفرحة حفل زفافهما',
  },
  blessing: {
    en: 'With love and joy, we invite you to celebrate our wedding day with us.',
    ar: 'بكل حب وسعادة، نتشرف بدعوتكم لمشاركتنا فرحتنا في يوم زفافنا',
  },

  // Personalized greeting
  seatsReserved: {
    en: '{n} {seats} reserved in your honor',
    ar: 'حجزنا لكم {n} {seats} على شرفكم',
  },
  seatOne: { en: 'seat', ar: 'مقعداً' },
  seatMany: { en: 'seats', ar: 'مقاعد' },

  // Date & venue
  dateLine: { en: 'Saturday · July 25 · 2026', ar: 'السبت · ٢٥ تموز · ٢٠٢٦' },
  venueName: { en: 'Tal Pine', ar: 'تل الصنوبر' },
  venueTime: { en: 'At 7:00 in the evening', ar: 'في تمام الساعة السابعة مساءً' },
  formalAttire: { en: 'Formal attire requested', ar: 'يرجى الالتزام باللباس الرسمي' },
  noChildren: {
    en: 'With love for your little ones, and in line with the restaurant policy, this evening will be an adults-only celebration.',
    ar: 'مع محبتنا الكبيرة لصغاركم، ووفقاً لسياسة المطعم، ستكون هذه الأمسية للكبار فقط.',
  },
  getDirections: { en: 'Get directions', ar: 'الموقع على الخريطة' },
  addToCalendar: { en: 'Add to calendar', ar: 'أضيفوا الموعد للتقويم' },
  googleCalendar: { en: 'Google Calendar', ar: 'تقويم جوجل' },
  downloadIcs: { en: 'Download .ics', ar: 'تحميل ملف التقويم' },

  // Countdown
  countingDown: { en: 'Counting down to forever', ar: 'العد التنازلي ليوم العمر' },
  days: { en: 'Days', ar: 'أيام' },
  hours: { en: 'Hours', ar: 'ساعات' },
  mins: { en: 'Mins', ar: 'دقائق' },
  secs: { en: 'Secs', ar: 'ثوانٍ' },

  // RSVP
  rsvpTitle: { en: 'RSVP', ar: 'تأكيد الحضور' },
  willYouJoin: { en: 'Will you be joining us?', ar: 'هل ستشاركوننا فرحتنا؟' },
  joyfullyAccepts: { en: 'Joyfully accepts', ar: 'نلبّي الدعوة بكل سرور' },
  regretfullyDeclines: { en: 'Regretfully declines', ar: 'نعتذر عن الحضور' },
  howMany: { en: 'How many of you will be joining us?', ar: 'كم عدد الحضور منكم؟' },
  upToGuests: { en: 'Up to {n} guests', ar: 'بحد أقصى {n} ضيوف' },
  confirmAttendance: { en: 'Confirm attendance', ar: 'تأكيد الحضور' },
  back: { en: 'Back', ar: 'رجوع' },
  sending: { en: 'Sending…', ar: 'جارٍ الإرسال…' },
  joyfullyAccepted: { en: 'Joyfully Accepted', ar: 'تم تأكيد حضوركم' },
  guestsConfirmed: {
    en: "{n} {guests} confirmed — we can't wait to celebrate with you.",
    ar: 'تم تأكيد حضور {n} — بانتظار لقائكم بفارغ الصبر',
  },
  guestOne: { en: 'guest', ar: 'ضيف' },
  guestMany: { en: 'guests', ar: 'ضيوف' },
  regretfullyDeclined: { en: 'Regretfully Declined', ar: 'نعتذر عن الحضور' },
  dearlyMissed: { en: 'You will be dearly missed.', ar: 'سنفتقد حضوركم كثيراً' },
  changeResponse: { en: 'Change response', ar: 'تغيير الرد' },
  acceptedToast: { en: 'Joyfully Accepted!', ar: 'تم تأكيد الحضور!' },
  acceptedToastBody: {
    en: "We can't wait to celebrate with you.",
    ar: 'بانتظار لقائكم بفارغ الصبر',
  },
  declinedToast: { en: 'Regretfully Declined', ar: 'تم تسجيل اعتذاركم' },
  declinedToastBody: { en: 'You will be dearly missed.', ar: 'سنفتقد حضوركم كثيراً' },
  personalLinkTitle: { en: 'Personal link required', ar: 'الرابط الشخصي مطلوب' },
  personalLinkBody: {
    en: 'Please open the personal invitation link you received on WhatsApp to respond.',
    ar: 'يرجى فتح رابط الدعوة الشخصي الذي وصلكم عبر واتساب للرد على الدعوة',
  },
  errorTitle: { en: 'Something went wrong', ar: 'حدث خطأ ما' },

  // Table finder
  yourTable: { en: 'Your table', ar: 'طاولتكم' },

  // Nuqoot
  nuqootTitle: { en: 'Nuqoot', ar: 'النقوط' },
  nuqootSub: { en: 'نقوط', ar: 'Nuqoot' },
  nuqootBody: {
    en: 'Your presence is our greatest gift. For loved ones who wish to honor the tradition, you can send your nuqoot through CliQ:',
    ar: 'حضوركم أغلى هدية، ولمن أحب مشاركتنا النقوط، يمكن الإرسال عبر خدمة كليك:',
  },
  cliqAlias: { en: 'CliQ Alias', ar: 'عنوان كليك (CliQ)' },
  copyAlias: { en: 'Copy alias', ar: 'نسخ العنوان' },
  copied: { en: '✓ Copied', ar: '✓ تم النسخ' },
  cliqNote: {
    en: 'via any Jordanian banking app that supports CliQ',
    ar: 'عبر أي تطبيق بنكي أردني يدعم خدمة كليك',
  },
  aliasCopiedToast: { en: 'CliQ alias copied', ar: 'تم نسخ عنوان كليك' },
  aliasCopiedBody: {
    en: '{alias} — thank you for your love and generosity.',
    ar: '{alias} — شكراً لمحبتكم وكرمكم',
  },

  // Invalid invitation
  invalidTitle: { en: 'Oh no…', ar: 'عذراً…' },
  invalidBody: {
    en: "This invitation link is not valid or has been cancelled. Please check the link you received, or contact the couple's family.",
    ar: 'رابط الدعوة غير صالح أو تم إلغاؤه. يرجى التأكد من الرابط الذي وصلكم أو التواصل مع أهل العروسين',
  },
} as const;

export type StringKey = keyof typeof STRINGS;

/**
 * Admin text overrides (from the event's invitationConfig). Set once when the
 * event loads; `t()` prefers an override over the built-in dictionary.
 */
let textOverrides: Partial<Record<string, { en?: string; ar?: string }>> = {};

export function setTextOverrides(
  overrides: Partial<Record<string, { en?: string; ar?: string }>> | null | undefined,
): void {
  textOverrides = overrides ?? {};
}

export function useLang(): Lang {
  const search = useSearch();
  return useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get('lang') === 'ar' ? 'ar' : 'en';
  }, [search]);
}

/** Translate a key, substituting `{placeholders}` from vars. */
export function t(
  lang: Lang,
  key: StringKey,
  vars?: Record<string, string | number>,
): string {
  const override = textOverrides[key]?.[lang];
  let s: string = override?.trim() ? override : STRINGS[key][lang];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

export const isRtl = (lang: Lang) => lang === 'ar';

/* ------------------------------------------------------------------ */
/* Invitation configuration (editable from the admin panel)            */
/* ------------------------------------------------------------------ */

export type SectionId =
  | 'header'
  | 'greeting'
  | 'date'
  | 'venue'
  | 'countdown'
  | 'rsvp'
  | 'nuqoot';

export interface InvitationConfig {
  sections?: { id: SectionId; enabled: boolean }[];
  texts?: Partial<Record<string, { en?: string; ar?: string }>>;
  backgrounds?: {
    top?: string | null; // garland at the top of the card
    bottom?: string | null; // mirrored garland at the bottom
    center?: string | null; // fixed watercolor behind the content
  };
}

export const DEFAULT_SECTIONS: { id: SectionId; enabled: boolean }[] = [
  { id: 'header', enabled: true },
  { id: 'greeting', enabled: true },
  { id: 'date', enabled: true },
  { id: 'venue', enabled: true },
  { id: 'countdown', enabled: true },
  { id: 'rsvp', enabled: true },
  { id: 'nuqoot', enabled: true },
];

export const SECTION_LABELS: Record<SectionId, string> = {
  header: 'Names & blessing',
  greeting: 'Personal greeting (Especially for…)',
  date: 'Date line',
  venue: 'Venue & directions',
  countdown: 'Countdown',
  rsvp: 'RSVP',
  nuqoot: 'Nuqoot (CliQ)',
};

/** Keys the couple can edit from the admin panel, with friendly labels. */
export const EDITABLE_TEXTS: { key: StringKey; label: string }[] = [
  { key: 'togetherWithFamilies', label: 'Header eyebrow' },
  { key: 'coupleGroom', label: 'Groom name' },
  { key: 'coupleBride', label: 'Bride name' },
  { key: 'requestHonor', label: 'Invitation line' },
  { key: 'blessing', label: 'Blessing line' },
  { key: 'dateLine', label: 'Date line' },
  { key: 'venueName', label: 'Venue name' },
  { key: 'venueTime', label: 'Time line' },
  { key: 'formalAttire', label: 'Attire note' },
  { key: 'noChildren', label: 'Adults-only note' },
  { key: 'countingDown', label: 'Countdown caption' },
  { key: 'willYouJoin', label: 'RSVP question' },
  { key: 'nuqootBody', label: 'Nuqoot message' },
  { key: 'breakSeal', label: 'Envelope hint' },
];

/** Merge stored config with defaults (unknown/missing sections appended). */
export function resolveSections(
  config: InvitationConfig | null | undefined,
): { id: SectionId; enabled: boolean }[] {
  const stored = config?.sections ?? [];
  const known = new Set(DEFAULT_SECTIONS.map((s) => s.id));
  const result = stored.filter((s) => known.has(s.id));
  for (const def of DEFAULT_SECTIONS) {
    if (!result.some((s) => s.id === def.id)) result.push({ ...def });
  }
  return result;
}
