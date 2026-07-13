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
  // 'إلى' has no gender agreement, unlike 'عزيزنا' (masc.) — works for any guest name.
  dearName: { en: 'Dear {name}', ar: 'إلى {name}' },
  youAreInvited: { en: 'You are invited', ar: 'أنتم مدعوون' },

  // Header
  coupleGroom: { en: 'Mohammad', ar: 'محمد' },
  coupleBride: { en: 'Renad', ar: 'رناد' },
  togetherWithFamilies: {
    en: 'On an evening crowned with joy and delight',
    ar: 'في ليلة يتكللها الفرح والسرور',
  },
  honorEyebrow: { en: 'have the honor of inviting you', ar: 'يتشرف' },
  groomFatherTitle: { en: 'Mr.', ar: 'السيد' },
  groomFatherName: { en: 'Sameer Maghathe', ar: 'سمير المغثة' },
  brideFatherTitle: { en: 'Mr.', ar: 'السيد' },
  brideFatherName: { en: 'Emad Abulhaija', ar: 'عماد فخري أبو الهيجاء' },
  requestHonor: {
    en: 'to the wedding celebration of their children',
    ar: 'بدعوتكم لحضور حفل زفاف ولديهما',
  },
  blessing: {
    en: 'With love and joy, we invite you to celebrate our wedding day with us, God willing.',
    ar: 'بكل حب وسعادة، نتشرف بدعوتكم لمشاركتنا فرحتنا في يوم زفافنا، وذلك بمشيئة الله',
  },

  // Personalized greeting
  seatsReserved: {
    en: '{n} {seats} reserved in your honor',
    ar: 'حجزنا لكم {n} {seats} على شرفكم',
  },
  seatOne: { en: 'seat', ar: 'مقعداً' },
  seatMany: { en: 'seats', ar: 'مقاعد' },

  // Date & venue
  dateLine: { en: 'Saturday · 25/07/2026', ar: 'السبت · 25/07/2026' },
  venueName: { en: 'Tal Pine', ar: 'تل الصنوبر' },
  venueTime: { en: 'At 7:00 in the evening', ar: 'في تمام الساعة السابعة مساءً' },
  noChildren: {
    en: "With love for your little ones, and in line with the venue's policy, this evening will be an adults-only celebration.",
    ar: 'مع محبتنا الكبيرة لصغاركم، ووفقاً لسياسة المكان، ستكون هذه الأمسية للكبار فقط.',
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

  // Scanner (guard)
  scannerTitle: { en: 'Entrance Scanner', ar: 'ماسح الدخول' },
  scannerSubtitle: {
    en: 'Guard or admin access · Mohammad & Renad Wedding',
    ar: 'دخول الحراس أو الإدارة · حفل زفاف محمد ورناد',
  },
  scannerSignOut: { en: 'Sign out', ar: 'تسجيل الخروج' },
  scannerCameraLabel: { en: 'Camera', ar: 'الكاميرا' },
  scannerStarting: { en: 'Starting...', ar: 'جارٍ التشغيل...' },
  scannerRestartCamera: { en: 'Restart camera', ar: 'إعادة تشغيل الكاميرا' },
  scannerStartCamera: { en: 'Start camera', ar: 'تشغيل الكاميرا' },
  scannerStop: { en: 'Stop', ar: 'إيقاف' },
  scannerScanFromImage: { en: 'Scan QR from image', ar: 'مسح الرمز من صورة' },
  scannerManualPlaceholder: {
    en: 'Or paste/type invitation code…',
    ar: 'أو الصقوا/اكتبوا رمز الدعوة…',
  },
  scannerCheck: { en: 'Check', ar: 'تحقق' },
  scannerHttpsRequired: {
    en: 'Camera access requires HTTPS on mobile browsers. Open the scanner from the deployed HTTPS URL, not an IP/http link.',
    ar: 'يتطلب الوصول إلى الكاميرا اتصال HTTPS على متصفحات الجوال. افتحوا الماسح من رابط HTTPS الفعلي، وليس عنوان IP أو http.',
  },
  scannerNoCameraApi: {
    en: 'This browser does not expose camera access. Use an updated Safari, Chrome, or Edge browser, or upload a QR image below.',
    ar: 'هذا المتصفح لا يتيح الوصول إلى الكاميرا. استخدموا متصفح Safari أو Chrome أو Edge محدثاً، أو ارفعوا صورة الرمز أدناه.',
  },
  scannerCameraUnavailable: {
    en: 'Camera unavailable. Check browser permission, HTTPS, and whether another app is using the camera.',
    ar: 'الكاميرا غير متاحة. تحققوا من إذن المتصفح، واتصال HTTPS، وما إذا كان تطبيق آخر يستخدم الكاميرا.',
  },
  scannerQrImageError: { en: 'Could not read QR from image.', ar: 'تعذّرت قراءة الرمز من الصورة.' },
  scannerInvalidQrTitle: { en: 'INVALID QR', ar: 'رمز غير صالح' },
  scannerInvalidQrBody: {
    en: 'This invitation does not exist, was cancelled, or is not for this event.',
    ar: 'هذه الدعوة غير موجودة، أو تم إلغاؤها، أو ليست لهذه المناسبة.',
  },
  scannerCancelledTitle: { en: 'CANCELLED', ar: 'ملغاة' },
  scannerCancelledBody: { en: '{name} — this invitation was cancelled.', ar: '{name} — تم إلغاء هذه الدعوة.' },
  scannerFullTitle: { en: 'ALREADY CHECKED IN', ar: 'تم تسجيل الحضور مسبقاً' },
  scannerFullBody: {
    en: '{name} — Allowed: {allowed} · Checked in: {checkedIn} · No remaining guests.',
    ar: '{name} — المسموح به: {allowed} · تم تسجيله: {checkedIn} · لا يوجد ضيوف متبقون.',
  },
  scannerValidTitle: { en: 'VALID INVITATION', ar: 'دعوة صالحة' },
  scannerValidBody: { en: 'Guest: {name}', ar: 'الضيف: {name}' },
  scannerValidBodyWithTable: { en: 'Guest: {name} · Table: {table}', ar: 'الضيف: {name} · الطاولة: {table}' },
  scannerAllowed: { en: 'Allowed', ar: 'المسموح به' },
  scannerCheckedIn: { en: 'Checked in', ar: 'تم تسجيله' },
  scannerRemaining: { en: 'Remaining', ar: 'المتبقي' },
  scannerRsvpExpected: { en: 'RSVP: {status} ({n} expected)', ar: 'تأكيد الحضور: {status} (المتوقع {n})' },
  scannerRsvpNoExpected: { en: 'RSVP: {status}', ar: 'تأكيد الحضور: {status}' },
  scannerGuestsArriving: { en: 'Guests arriving now', ar: 'الضيوف الواصلون الآن' },
  scannerExceeds: {
    en: '⚠ Exceeds remaining count — override required',
    ar: '⚠ يتجاوز العدد المتبقي — يلزم تجاوز خاص',
  },
  scannerExtraNamesTitle: {
    en: 'Name(s) of the {n} extra guest(s)',
    ar: 'اسم/أسماء الضيوف الإضافيين ({n})',
  },
  scannerExtraNamePlaceholder: { en: 'Extra guest {n} name', ar: 'اسم الضيف الإضافي {n}' },
  scannerOverrideNeeded: {
    en: 'Extra guest detected — approval required',
    ar: 'تم رصد ضيف إضافي — يلزم الموافقة',
  },
  scannerOverrideReasonPlaceholder: {
    en: 'Reason for escalation (optional)',
    ar: 'سبب التصعيد (اختياري)',
  },
  scannerOverrideNotePlaceholder: {
    en: 'Guard note: who approved this? (required)',
    ar: 'ملاحظة الحارس: من وافق على ذلك؟ (مطلوب)',
  },
  scannerOverrideCheckIn: { en: 'Override & check in', ar: 'تجاوز وتسجيل الحضور' },
  scannerBack: { en: 'Back', ar: 'رجوع' },
  scannerCheckingIn: { en: 'Checking in…', ar: 'جارٍ تسجيل الحضور…' },
  scannerCheckInOne: { en: 'Check in {n} guest', ar: 'تسجيل حضور {n} ضيف' },
  scannerCheckInMany: { en: 'Check in {n} guests', ar: 'تسجيل حضور {n} ضيوف' },
  scannerCancelScanAnother: { en: 'Cancel / scan another', ar: 'إلغاء / مسح ضيف آخر' },
  scannerCheckedInBanner: { en: '✓ CHECKED IN', ar: '✓ تم تسجيل الحضور' },
  scannerScanNext: { en: 'Scan next guest', ar: 'مسح الضيف التالي' },
  scannerRecentCheckins: { en: 'Recent check-ins', ar: 'آخر عمليات تسجيل الحضور' },
  scannerNoCheckinsYet: { en: 'No check-ins yet.', ar: 'لا يوجد تسجيل حضور بعد.' },
  scannerOverrideBadge: { en: 'override', ar: 'تجاوز' },
  scannerCouldNotResolve: { en: 'Could not resolve QR', ar: 'تعذّر التعرف على الرمز' },
  scannerCheckInFailed: { en: 'Check-in failed', ar: 'فشل تسجيل الحضور' },
  scannerCheckedInSuccess: {
    en: '{name} — {n} checked in{override}. Remaining: {remaining}',
    ar: '{name} — تم تسجيل {n}{override}. المتبقي: {remaining}',
  },
  scannerOverrideSuffix: { en: ' (OVERRIDE)', ar: ' (تجاوز)' },
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

/** The built-in default copy, ignoring any admin override — used by the
 * admin editor to seed its fields with real text instead of a blank box. */
export function defaultText(lang: Lang, key: StringKey): string {
  return STRINGS[key][lang];
}

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
  // WhatsApp invite message the admin panel sends per guest; {seats} and
  // {link} are substituted with that guest's seat count and personal URL.
  whatsappMessage?: { en?: string; ar?: string };
}

export const DEFAULT_WHATSAPP_MESSAGE: { en: string; ar: string } = {
  en:
    'With love and joy, we invite you to celebrate our wedding day with us. 💍\n' +
    'Mohammad & Renad — Saturday, 25/07/2026 · 7:00 PM · Tal Pine, Amman\n' +
    'Your personal invitation ({seats}):\n{link}',
  ar:
    'بكل حب وسعادة، نتشرف بدعوتكم لمشاركتنا فرحتنا في يوم زفافنا 💍\n' +
    'محمد ورناد — السبت 25/07/2026 · ٧:٠٠ مساءً · تل الصنوبر، عمّان\n' +
    'دعوتكم الشخصية ({seats}):\n{link}',
};

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
  { key: 'honorEyebrow', label: '"Have the honor" line' },
  { key: 'groomFatherTitle', label: "Groom's father — title" },
  { key: 'groomFatherName', label: "Groom's father — name" },
  { key: 'brideFatherTitle', label: "Bride's father — title" },
  { key: 'brideFatherName', label: "Bride's father — name" },
  { key: 'coupleGroom', label: 'Groom name' },
  { key: 'coupleBride', label: 'Bride name' },
  { key: 'requestHonor', label: 'Invitation line' },
  { key: 'blessing', label: 'Blessing line' },
  { key: 'especiallyFor', label: '"Especially for" label' },
  { key: 'seatsReserved', label: 'Seats reserved line' },
  { key: 'dateLine', label: 'Date line' },
  { key: 'venueName', label: 'Venue name' },
  { key: 'venueTime', label: 'Time line' },
  { key: 'noChildren', label: 'Adults-only note' },
  { key: 'getDirections', label: 'Directions button' },
  { key: 'addToCalendar', label: 'Calendar button' },
  { key: 'countingDown', label: 'Countdown caption' },
  { key: 'rsvpTitle', label: 'RSVP title' },
  { key: 'willYouJoin', label: 'RSVP question' },
  { key: 'joyfullyAccepts', label: 'Accept button' },
  { key: 'regretfullyDeclines', label: 'Decline button' },
  { key: 'nuqootTitle', label: 'Nuqoot title' },
  { key: 'nuqootBody', label: 'Nuqoot message' },
  { key: 'cliqNote', label: 'CliQ note' },
  { key: 'breakSeal', label: 'Envelope hint' },
  { key: 'youAreInvited', label: '"You are invited" (card in envelope)' },
  { key: 'dearName', label: 'Envelope — guest name line' },
  { key: 'withLoveTo', label: 'Envelope label (no guest name)' },
  { key: 'belovedGuests', label: 'Envelope fallback name' },
];

/** Groups the editable text keys under the card section they appear in, so
 * the admin editor can lay them out in the same order the guest sees them.
 * 'envelope' isn't a real section (it's not toggleable) but groups the
 * texts shown before the card opens. */
export const TEXT_GROUPS: { id: SectionId | 'envelope'; keys: StringKey[] }[] = [
  {
    id: 'envelope',
    keys: ['breakSeal', 'especiallyFor', 'dearName', 'withLoveTo', 'belovedGuests', 'youAreInvited'],
  },
  {
    id: 'header',
    keys: [
      'togetherWithFamilies',
      'honorEyebrow',
      'groomFatherTitle',
      'groomFatherName',
      'brideFatherTitle',
      'brideFatherName',
      'coupleGroom',
      'coupleBride',
      'requestHonor',
      'blessing',
    ],
  },
  { id: 'greeting', keys: ['especiallyFor', 'seatsReserved'] },
  { id: 'date', keys: ['dateLine'] },
  { id: 'venue', keys: ['venueName', 'venueTime', 'noChildren', 'getDirections', 'addToCalendar'] },
  { id: 'countdown', keys: ['countingDown'] },
  { id: 'rsvp', keys: ['rsvpTitle', 'willYouJoin', 'joyfullyAccepts', 'regretfullyDeclines'] },
  { id: 'nuqoot', keys: ['nuqootTitle', 'nuqootBody', 'cliqNote'] },
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
