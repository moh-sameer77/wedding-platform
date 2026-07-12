import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import LoginGate from '@/components/LoginGate';
import { useToast } from '@/hooks/use-toast';
import { api, getSessionToken, getSessionUser, publicUrl } from '@/lib/api';
import { usePageTitle } from '@/hooks/use-page-title';
import {
  DEFAULT_SECTIONS,
  DEFAULT_WHATSAPP_MESSAGE,
  EDITABLE_TEXTS,
  SECTION_LABELS,
  TEXT_GROUPS,
  defaultText,
  resolveSections,
  type InvitationConfig,
  type SectionId,
} from '@/lib/i18n';

// ---------- types ----------

interface Metrics {
  totalInvitations: number;
  confirmed: number;
  declined: number;
  pending: number;
  expectedGuests: number;
  invitedGuests: number;
  checkedIn: number;
  overrideGuests: number;
  pendingModeration: number;
  totalUploads: number;
  totalMessages: number;
}

interface EventSettings {
  id: number;
  name: string;
  coupleNames: string;
  status: 'draft' | 'live' | 'archived';
  autoApprove: boolean;
  guestbookPublic: boolean;
  uploadsEnabled: boolean;
  maxUploadsPerGuest: number;
  tablesEnabled: boolean;
  welcomeMessage: string | null;
  thankYouMessage: string | null;
  invitationConfig: unknown;
}

interface AdminInvitation {
  id: number;
  guestName: string;
  phone: string | null;
  allowedCount: number;
  rsvpStatus: string;
  rsvpCount: number | null;
  rsvpNote: string | null;
  tableId: number | null;
  tableName: string | null;
  token: string;
  status: string;
  checkedIn: number;
  createdByUserId: number | null;
  createdByName: string | null;
}

interface AdminUser {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'guard' | 'moderator';
  active: boolean;
  createdAt: string;
}

interface AdminTable {
  id: number;
  name: string;
  capacity: number;
  token: string;
  assigned: number;
}

interface ModerationUpload {
  id: number;
  fileUrl: string;
  fileType: string;
  uploadedByName: string | null;
  caption: string | null;
  status: string;
  createdAt: string;
}

interface ModerationMessage {
  id: number;
  messageType: string;
  text: string | null;
  fileUrl: string | null;
  guestName: string | null;
  status: string;
  createdAt: string;
}

interface AuditCheckin {
  id: number;
  count: number;
  isOverride: boolean;
  notes: string | null;
  createdAt: string;
  guestName: string;
  scannedBy: string | null;
}

type Tab = 'overview' | 'guests' | 'tables' | 'moderation' | 'team' | 'settings';

// ---------- page ----------

export default function AdminPage() {
  usePageTitle('Admin Dashboard');
  return (
    <LoginGate
      roles={['admin']}
      title="Admin Dashboard"
      subtitle="Mohammad & Renad Wedding"
    >
      {(user, logout) => <AdminScreen userName={user.name} logout={logout} />}
    </LoginGate>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'guests', label: 'Guests & RSVP' },
  { id: 'tables', label: 'Tables' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'team', label: 'Team' },
  { id: 'settings', label: 'Settings' },
];

function AdminScreen({
  userName,
  logout,
}: {
  userName: string;
  logout: () => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');

  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () =>
      api.get<{ event: EventSettings; metrics: Metrics }>('/admin/dashboard'),
    refetchInterval: tab === 'overview' ? 10000 : false,
  });
  const pendingCount = dashboardQuery.data?.metrics.pendingModeration ?? 0;
  const tablesEnabled = dashboardQuery.data?.event.tablesEnabled ?? false;
  const visibleTabs = TABS.filter((t) => t.id !== 'tables' || tablesEnabled);

  useEffect(() => {
    if (!tablesEnabled && tab === 'tables') setTab('settings');
  }, [tablesEnabled, tab]);

  return (
    <div className="min-h-[100dvh] bg-[#F6ECEA] font-serif text-[#45383C]">
      <header className="bg-[#45383C] text-[#F9F3F3] px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <p className="font-script text-3xl text-[#D48A96] leading-none">M &amp; R</p>
          <div>
            <p className="text-sm tracking-wide">Wedding Admin</p>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">
              {dashboardQuery.data?.event.name ?? '…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/wall"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#D48A96] underline underline-offset-4"
          >
            Live wall ↗
          </a>
          <a
            href="/scanner"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#D48A96] underline underline-offset-4"
          >
            Scanner ↗
          </a>
          <div className="text-right">
            <p className="text-xs opacity-80">{userName}</p>
            <button
              onClick={logout}
              className="text-[10px] uppercase tracking-widest text-[#D48A96] underline underline-offset-2"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-[#F9F3F3] border-b border-[#D48A96]/30 px-2 sm:px-6 flex gap-1 overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs uppercase tracking-[0.15em] whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? 'border-[#B25A6C] text-[#B25A6C] font-semibold'
                : 'border-transparent text-[#45383C]/60 hover:text-[#45383C]'
            }`}
          >
            {t.label}
            {t.id === 'moderation' && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-[#B25A6C] text-[#F9F3F3] rounded-full text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        {tab === 'overview' && <OverviewTab data={dashboardQuery.data} />}
        {tab === 'guests' && <GuestsTab event={dashboardQuery.data?.event ?? null} />}
        {tab === 'tables' && tablesEnabled && <TablesTab />}
        {tab === 'moderation' && <ModerationTab />}
        {tab === 'team' && <TeamTab />}
        {tab === 'settings' && (
          <SettingsTab event={dashboardQuery.data?.event ?? null} />
        )}
      </main>
    </div>
  );
}

// ---------- overview ----------

function MetricCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div
      className={`bg-[#F9F3F3] border border-[#D48A96]/30 p-4 text-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${
        accent ? 'border-t-2 border-t-[#B25A6C]' : ''
      }`}
    >
      {accent && (
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#D48A96]/12 to-transparent pointer-events-none" />
      )}
      <p className={`text-3xl font-semibold tabular-nums ${accent ? 'text-[#B25A6C]' : ''}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-[0.15em] text-[#45383C]/55 mt-1">{label}</p>
    </div>
  );
}

function OverviewTab({
  data,
}: {
  data: { event: EventSettings; metrics: Metrics } | undefined;
}) {
  const auditQuery = useQuery({
    queryKey: ['admin-checkins'],
    queryFn: () => api.get<{ checkins: AuditCheckin[] }>('/admin/checkins'),
    refetchInterval: 10000,
  });

  if (!data) return <p className="text-sm opacity-60">Loading…</p>;
  const m = data.metrics;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50 mb-3">RSVP</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <MetricCard label="Invitations" value={m.totalInvitations} />
          <MetricCard label="Confirmed" value={m.confirmed} accent />
          <MetricCard label="Declined" value={m.declined} />
          <MetricCard label="Pending" value={m.pending} />
          <MetricCard label="Expected guests" value={m.expectedGuests} accent />
        </div>
      </section>
      <section>
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50 mb-3">Wedding day</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <MetricCard label="Invited seats" value={m.invitedGuests} />
          <MetricCard label="Checked in" value={m.checkedIn} accent />
          <MetricCard label="Extra guests" value={m.overrideGuests} />
          <MetricCard label="Uploads" value={m.totalUploads} />
          <MetricCard label="Pending approval" value={m.pendingModeration} accent />
        </div>
      </section>
      <section>
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50 mb-3">
          Check-in audit log
        </h2>
        <div className="bg-[#F9F3F3] border border-[#D48A96]/30 divide-y divide-[#D48A96]/15">
          {(auditQuery.data?.checkins ?? []).slice(0, 25).map((c) => (
            <div key={c.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{c.guestName}</span>
                <span className="opacity-60"> · +{c.count}</span>
                {c.isOverride && (
                  <span className="ml-2 text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5">
                    override
                  </span>
                )}
                {c.notes && <span className="block text-xs opacity-60 italic">“{c.notes}”</span>}
              </div>
              <div className="text-right text-xs opacity-60">
                <p>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <p>{c.scannedBy ?? ''}</p>
              </div>
            </div>
          ))}
          {auditQuery.data?.checkins.length === 0 && (
            <p className="px-4 py-6 text-sm opacity-50 text-center">No check-ins yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

// ---------- guests ----------

function GuestsTab({ event }: { event: EventSettings | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const me = getSessionUser();
  const [form, setForm] = useState({ guestName: '', phone: '', allowedCount: 2, tableId: '' });
  const [createdByFilter, setCreatedByFilter] = useState('all');
  const savedWhatsapp = normalizeInvitationConfig(event?.invitationConfig).whatsappMessage;
  const [whatsappDraft, setWhatsappDraft] = useState({
    en: savedWhatsapp?.en ?? DEFAULT_WHATSAPP_MESSAGE.en,
    ar: savedWhatsapp?.ar ?? DEFAULT_WHATSAPP_MESSAGE.ar,
  });
  useEffect(() => {
    const saved = normalizeInvitationConfig(event?.invitationConfig).whatsappMessage;
    setWhatsappDraft({
      en: saved?.en ?? DEFAULT_WHATSAPP_MESSAGE.en,
      ar: saved?.ar ?? DEFAULT_WHATSAPP_MESSAGE.ar,
    });
  }, [event?.id, event?.invitationConfig]);

  const saveWhatsappTemplate = async () => {
    try {
      const normalized = normalizeInvitationConfig(event?.invitationConfig);
      await api.patch('/admin/event', {
        invitationConfig: { ...normalized, whatsappMessage: whatsappDraft },
      });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast({ title: 'WhatsApp message saved', duration: 2500 });
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : '' });
    }
  };

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<{ users: AdminUser[] }>('/admin/users'),
  });

  const invitationsQuery = useQuery({
    queryKey: ['admin-invitations', createdByFilter],
    queryFn: () =>
      api.get<{ invitations: AdminInvitation[] }>(
        `/admin/invitations${createdByFilter !== 'all' ? `?createdBy=${createdByFilter}` : ''}`,
      ),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  };

  const pickContact = async () => {
    const nav = navigator as Navigator & {
      contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>> };
    };
    if (!nav.contacts) {
      toast({
        title: 'Not supported on this browser/device',
        description: 'Contact picking needs Chrome on Android. Type the name and number instead.',
      });
      return;
    }
    try {
      const [contact] = await nav.contacts.select(['name', 'tel'], { multiple: false });
      if (!contact) return;
      setForm((f) => ({
        ...f,
        guestName: contact.name?.[0] || f.guestName,
        phone: contact.tel?.[0] || f.phone,
      }));
    } catch {
      // User cancelled the picker or denied permission — nothing to do.
    }
  };

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/admin/invitations', {
        guestName: form.guestName.trim(),
        phone: form.phone.trim() || null,
        allowedCount: form.allowedCount,
      }),
    onSuccess: () => {
      setForm({ guestName: '', phone: '', allowedCount: 2, tableId: '' });
      refresh();
      toast({ title: 'Guest added', duration: 3000 });
    },
    onError: (e: Error) => toast({ title: 'Failed to add guest', description: e.message }),
  });

  const patchInvitation = async (id: number, patch: Record<string, unknown>) => {
    try {
      await api.patch(`/admin/invitations/${id}`, patch);
      refresh();
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : '' });
    }
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(',').map((c) => c.trim().replace(/^"|"$/g, '')))
      .filter((cols) => cols[0] && !/^(guest\s*)?name$/i.test(cols[0]))
      .map((cols) => ({
        guestName: cols[0]!,
        phone: cols[1] || undefined,
        allowedCount: Number(cols[2]) > 0 ? Number(cols[2]) : 1,
      }));
    if (rows.length === 0) {
      toast({ title: 'No rows found', description: 'Expected columns: name, phone, allowed count' });
      return;
    }
    try {
      const res = await api.post<{ imported: number }>('/admin/invitations/import', { rows });
      toast({ title: `Imported ${res.imported} guests`, duration: 4000 });
      refresh();
    } catch (e) {
      toast({ title: 'Import failed', description: e instanceof Error ? e.message : '' });
    }
  };

  // The admin chooses the language of the link they send (FR: Arabic or
  // English invitation). The ?lang=ar link opens the fully Arabic invitation.
  const inviteUrl = (inv: AdminInvitation, lang: 'en' | 'ar') =>
    publicUrl(`/i/${inv.token}${lang === 'ar' ? '?lang=ar' : ''}`);

  const inviteText = (inv: AdminInvitation, lang: 'en' | 'ar') => {
    const seats =
      lang === 'ar'
        ? `${inv.allowedCount} ${inv.allowedCount === 1 ? 'مقعد' : 'مقاعد'}`
        : `${inv.allowedCount} ${inv.allowedCount === 1 ? 'seat' : 'seats'}`;
    const template =
      (lang === 'ar' ? whatsappDraft.ar : whatsappDraft.en) || DEFAULT_WHATSAPP_MESSAGE[lang];
    return template
      .replaceAll('{seats}', seats)
      .replaceAll('{link}', inviteUrl(inv, lang));
  };

  const shareWhatsApp = (inv: AdminInvitation, lang: 'en' | 'ar') => {
    const phone = inv.phone?.replace(/[^\d]/g, '');
    const text = encodeURIComponent(inviteText(inv, lang));
    const url = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const copyLink = async (inv: AdminInvitation, lang: 'en' | 'ar') => {
    await navigator.clipboard.writeText(inviteUrl(inv, lang));
    toast({
      title: `Invitation link copied (${lang === 'ar' ? 'Arabic' : 'English'})`,
      duration: 2500,
    });
  };

  const invitations = invitationsQuery.data?.invitations ?? [];
  const tables: AdminTable[] = [];

  return (
    <div className="space-y-6">
      <section className="bg-[#F9F3F3] border border-[#D48A96]/30 p-4">
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50 mb-3">Add guest / family</h2>
        <form
          className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_auto_auto] gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.guestName.trim()) createMutation.mutate();
          }}
        >
          <label className="text-xs">
            <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Guest / family name</span>
            <input
              value={form.guestName}
              onChange={(e) => setForm({ ...form, guestName: e.target.value })}
              className="w-full px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 focus:outline-none focus:border-[#B25A6C]"
              placeholder="Ahmad Family"
            />
          </label>
          <label className="text-xs">
            <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Phone (WhatsApp)</span>
            <div className="flex gap-1.5">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 focus:outline-none focus:border-[#B25A6C]"
                placeholder="+9627…"
              />
              <button
                type="button"
                onClick={pickContact}
                title="Pick from contacts"
                className="px-3 border border-[#D48A96]/40 text-[#B25A6C] hover:bg-[#D48A96]/10 shrink-0"
              >
                📇
              </button>
            </div>
          </label>
          <label className="text-xs">
            <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Seats</span>
            <input
              type="number"
              min={1}
              max={50}
              value={form.allowedCount}
              onChange={(e) => setForm({ ...form, allowedCount: Number(e.target.value) || 1 })}
              className="w-20 px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 focus:outline-none focus:border-[#B25A6C]"
            />
          </label>
          <label className="hidden">
            <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Table</span>
            <select
              value={form.tableId}
              onChange={(e) => setForm({ ...form, tableId: e.target.value })}
              className="w-full px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 focus:outline-none"
            >
              <option value="">— none —</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={createMutation.isPending || !form.guestName.trim()}
            className="px-6 py-2.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-xs font-semibold disabled:opacity-50"
          >
            Add
          </button>
        </form>
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 border border-[#D48A96]/60 text-xs uppercase tracking-widest hover:bg-[#D48A96]/10"
          >
            Import CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importCsv(f);
              e.target.value = '';
            }}
          />
          <a
            href={`/api/admin/export/attendance?session=${getSessionToken()}`}
            className="px-4 py-2 border border-[#D48A96]/60 text-xs uppercase tracking-widest hover:bg-[#D48A96]/10"
          >
            Export attendance CSV
          </a>
          <p className="text-[10px] opacity-50 self-center">
            CSV columns: name, phone, seats. Table assignment is currently disabled.
          </p>
        </div>
      </section>

      <section className="bg-[#F9F3F3] border border-[#D48A96]/30 p-4">
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50 mb-1">
          WhatsApp message
        </h2>
        <p className="text-[11px] opacity-55 mb-3">
          This is what the WhatsApp EN/عربي buttons send below. Use <code>{'{link}'}</code> for the
          guest's personal invitation link and <code>{'{seats}'}</code> for their seat count.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <label className="text-xs">
            <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">English</span>
            <textarea
              rows={4}
              value={whatsappDraft.en}
              onChange={(e) => setWhatsappDraft({ ...whatsappDraft, en: e.target.value })}
              className="w-full px-3 py-2 border border-[#D48A96]/30 bg-white/80 text-sm focus:outline-none focus:border-[#B25A6C]"
            />
          </label>
          <label className="text-xs">
            <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">العربية</span>
            <textarea
              rows={4}
              dir="rtl"
              value={whatsappDraft.ar}
              onChange={(e) => setWhatsappDraft({ ...whatsappDraft, ar: e.target.value })}
              className="w-full px-3 py-2 border border-[#D48A96]/30 bg-white/80 text-sm focus:outline-none focus:border-[#B25A6C]"
            />
          </label>
        </div>
        <div className="flex gap-3 mt-3">
          <button
            onClick={saveWhatsappTemplate}
            className="px-6 py-2.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-xs font-semibold"
          >
            Save WhatsApp message
          </button>
          <button
            onClick={() => setWhatsappDraft(DEFAULT_WHATSAPP_MESSAGE)}
            className="px-6 py-2.5 border border-[#D48A96]/50 text-[#B25A6C] uppercase tracking-widest text-xs"
          >
            Reset to default
          </button>
        </div>
      </section>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-[10px] uppercase tracking-widest opacity-60">Added by</span>
        <select
          value={createdByFilter}
          onChange={(e) => setCreatedByFilter(e.target.value)}
          className="px-2 py-1.5 border border-[#D48A96]/40 bg-white/70 text-xs focus:outline-none"
        >
          <option value="all">Everyone</option>
          {me && <option value="me">Me ({me.name})</option>}
          {(usersQuery.data?.users ?? [])
            .filter((u) => u.id !== me?.id)
            .map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
        </select>
      </div>

      <section className="bg-[#F9F3F3] border border-[#D48A96]/30 overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-[#45383C]/50 border-b border-[#D48A96]/25">
              <th className="px-4 py-3">Guest</th>
              <th className="px-2 py-3">Seats</th>
              <th className="px-2 py-3">RSVP</th>
              <th className="hidden">Table</th>
              <th className="px-2 py-3">Checked in</th>
              <th className="px-2 py-3">Added by</th>
              <th className="px-2 py-3">Share</th>
              <th className="px-2 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D48A96]/15">
            {invitations.map((inv) => (
              <tr key={inv.id} className={inv.status === 'cancelled' ? 'opacity-45' : ''}>
                <td className="px-4 py-2.5">
                  <p className="font-medium">{inv.guestName}</p>
                  <p className="text-xs opacity-55">{inv.phone ?? '—'}</p>
                </td>
                <td className="px-2 py-2.5">
                  <input
                    type="number"
                    min={1}
                    defaultValue={inv.allowedCount}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0 && v !== inv.allowedCount)
                        patchInvitation(inv.id, { allowedCount: v });
                    }}
                    className="w-16 px-2 py-1.5 border border-[#D48A96]/30 bg-white/60"
                  />
                </td>
                <td className="px-2 py-2.5">
                  <span
                    className={`px-2 py-1 text-[10px] uppercase tracking-wide font-semibold ${
                      inv.rsvpStatus === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inv.rsvpStatus === 'declined'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {inv.rsvpStatus}
                    {inv.rsvpStatus === 'confirmed' && inv.rsvpCount ? ` · ${inv.rsvpCount}` : ''}
                  </span>
                </td>
                <td className="hidden">
                  <select
                    value={inv.tableId ?? ''}
                    onChange={(e) =>
                      patchInvitation(inv.id, {
                        tableId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="px-2 py-1.5 border border-[#D48A96]/30 bg-white/60 text-xs"
                  >
                    <option value="">—</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2.5 text-center">
                  <span className={inv.checkedIn > 0 ? 'font-semibold text-[#B25A6C]' : 'opacity-40'}>
                    {inv.checkedIn}/{inv.allowedCount}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-xs opacity-70">
                  {inv.createdByName ?? '—'}
                </td>
                <td className="px-2 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-emerald-700 font-medium">WhatsApp</span>
                    <button onClick={() => shareWhatsApp(inv, 'en')} className="px-1.5 py-0.5 border border-emerald-700/40 text-emerald-700 hover:bg-emerald-700/10" title="Send English invitation">
                      EN
                    </button>
                    <button onClick={() => shareWhatsApp(inv, 'ar')} className="px-1.5 py-0.5 border border-emerald-700/40 text-emerald-700 hover:bg-emerald-700/10" title="إرسال الدعوة بالعربية">
                      عربي
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs mt-1">
                    <span className="text-[#B25A6C] font-medium">Copy link</span>
                    <button onClick={() => copyLink(inv, 'en')} className="px-1.5 py-0.5 border border-[#D48A96]/50 text-[#B25A6C] hover:bg-[#D48A96]/10" title="Copy English link">
                      EN
                    </button>
                    <button onClick={() => copyLink(inv, 'ar')} className="px-1.5 py-0.5 border border-[#D48A96]/50 text-[#B25A6C] hover:bg-[#D48A96]/10" title="نسخ الرابط بالعربية">
                      عربي
                    </button>
                    <a
                      href={`/api/qr/invite/${inv.token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2 text-[#45383C]/70 ml-1"
                    >
                      QR
                    </a>
                  </div>
                </td>
                <td className="px-2 py-2.5 whitespace-nowrap text-right pr-4">
                  {inv.status === 'active' ? (
                    <button
                      onClick={() => patchInvitation(inv.id, { status: 'cancelled' })}
                      className="text-xs text-red-700 underline underline-offset-2 mr-2"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => patchInvitation(inv.id, { status: 'active' })}
                      className="text-xs text-emerald-700 underline underline-offset-2 mr-2"
                    >
                      Reactivate
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (window.confirm(`Delete invitation for ${inv.guestName}? This also removes its check-ins.`)) {
                        await api.delete(`/admin/invitations/${inv.id}`);
                        refresh();
                      }
                    }}
                    className="text-xs text-red-900/60 underline underline-offset-2"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {invitations.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center opacity-50">
                  No guests yet — add your first invitation above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// ---------- tables ----------

function TablesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', capacity: 10 });

  const tablesQuery = useQuery({
    queryKey: ['admin-tables'],
    queryFn: () => api.get<{ tables: AdminTable[] }>('/admin/tables'),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-tables'] });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await api.post('/admin/tables', { name: form.name.trim(), capacity: form.capacity });
      setForm({ name: '', capacity: 10 });
      refresh();
    } catch (err) {
      toast({ title: 'Failed to add table', description: err instanceof Error ? err.message : '' });
    }
  };

  const copyLink = async (t: AdminTable) => {
    await navigator.clipboard.writeText(publicUrl(`/t/${t.token}`));
    toast({ title: 'Table link copied', duration: 2500 });
  };

  return (
    <div className="space-y-6">
      <section className="bg-[#F9F3F3] border border-[#D48A96]/30 p-4">
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50 mb-3">Add table</h2>
        <form onSubmit={create} className="flex flex-wrap gap-2 items-end">
          <label className="text-xs">
            <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Name / number</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Table 6"
              className="px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 focus:outline-none focus:border-[#B25A6C]"
            />
          </label>
          <label className="text-xs">
            <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Capacity</span>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) || 10 })}
              className="w-24 px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-xs font-semibold"
          >
            Add table
          </button>
        </form>
        <p className="text-[10px] opacity-50 mt-3">
          Print each table's QR card so guests can upload memories and leave wishes from their seat.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(tablesQuery.data?.tables ?? []).map((t) => (
          <div key={t.id} className="bg-[#F9F3F3] border border-[#D48A96]/30 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-medium">{t.name}</p>
                <p className="text-xs opacity-55">
                  {t.assigned} of {t.capacity} seats assigned
                </p>
              </div>
              <img
                src={`/api/qr/table/${t.token}`}
                alt={`${t.name} QR`}
                className="w-16 h-16 border border-[#D48A96]/30"
              />
            </div>
            <div className="flex gap-3 mt-3 flex-wrap">
              <a
                href={`/t/${t.token}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs underline underline-offset-2 text-[#B25A6C]"
              >
                Open page
              </a>
              <button onClick={() => copyLink(t)} className="text-xs underline underline-offset-2 text-[#B25A6C]">
                Copy link
              </button>
              <a
                href={`/api/qr/table/${t.token}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs underline underline-offset-2 text-[#45383C]/70"
              >
                QR card
              </a>
              <button
                onClick={async () => {
                  if (window.confirm(`Delete ${t.name}? Guests assigned to it will be unassigned.`)) {
                    await api.delete(`/admin/tables/${t.id}`);
                    tablesQuery.refetch();
                  }
                }}
                className="text-xs underline underline-offset-2 text-red-800/70 ml-auto"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

// ---------- team ----------

const ROLE_LABELS: Record<AdminUser['role'], string> = {
  admin: 'Admin — full access',
  guard: 'Guard — entrance scanner only',
  moderator: 'Moderator — photo/message moderation only',
};

function TeamTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const me = getSessionUser();
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'admin' as AdminUser['role'] });

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<{ users: AdminUser[] }>('/admin/users'),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const createMutation = useMutation({
    mutationFn: () => api.post('/admin/users', form),
    onSuccess: () => {
      setForm({ username: '', name: '', password: '', role: 'admin' });
      refresh();
      toast({ title: 'Team member added', duration: 3000 });
    },
    onError: (e: Error) => toast({ title: 'Could not add team member', description: e.message }),
  });

  const patchUser = async (id: number, patch: Record<string, unknown>) => {
    try {
      await api.patch(`/admin/users/${id}`, patch);
      refresh();
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : '' });
    }
  };

  const removeUser = async (u: AdminUser) => {
    if (!window.confirm(`Remove ${u.name} (${u.username})? They will immediately lose access.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      refresh();
    } catch (e) {
      toast({ title: 'Could not remove team member', description: e instanceof Error ? e.message : '' });
    }
  };

  const users = usersQuery.data?.users ?? [];

  return (
    <div className="space-y-6">
      <section className="bg-[#F9F3F3] border border-[#D48A96]/30 p-4">
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50 mb-3">Add team member</h2>
        <form
          className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.2fr_1.2fr_1.4fr_auto] gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.username.trim() && form.name.trim() && form.password.length >= 6) {
              createMutation.mutate();
            }
          }}
        >
          <label className="text-xs">
            <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 focus:outline-none focus:border-[#B25A6C]"
              placeholder="Renad"
            />
          </label>
          <label className="text-xs">
            <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Username</span>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoCapitalize="none"
              className="w-full px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 focus:outline-none focus:border-[#B25A6C]"
              placeholder="renad"
            />
          </label>
          <label className="text-xs">
            <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 focus:outline-none focus:border-[#B25A6C]"
              placeholder="At least 6 characters"
            />
          </label>
          <label className="text-xs">
            <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Role</span>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as AdminUser['role'] })}
              className="w-full px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 focus:outline-none"
            >
              <option value="admin">Admin</option>
              <option value="guard">Guard</option>
              <option value="moderator">Moderator</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={
              createMutation.isPending ||
              !form.username.trim() ||
              !form.name.trim() ||
              form.password.length < 6
            }
            className="px-6 py-2.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-xs font-semibold disabled:opacity-50"
          >
            Add
          </button>
        </form>
        <p className="text-[10px] opacity-50 mt-3">
          Admins can add guests, filter their own guest list, and manage everything here. Guards can only sign
          into the entrance scanner. Moderators can only approve/reject photos and messages.
        </p>
      </section>

      <section className="bg-[#F9F3F3] border border-[#D48A96]/30 overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-[#45383C]/50 border-b border-[#D48A96]/25">
              <th className="px-4 py-3">Name</th>
              <th className="px-2 py-3">Role</th>
              <th className="px-2 py-3">Status</th>
              <th className="px-2 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D48A96]/15">
            {users.map((u) => {
              const isSelf = u.id === me?.id;
              return (
                <tr key={u.id} className={!u.active ? 'opacity-45' : ''}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">
                      {u.name} {isSelf && <span className="text-[10px] opacity-50">(you)</span>}
                    </p>
                    <p className="text-xs opacity-55">@{u.username}</p>
                  </td>
                  <td className="px-2 py-2.5">
                    <select
                      value={u.role}
                      disabled={isSelf}
                      onChange={(e) => patchUser(u.id, { role: e.target.value })}
                      className="px-2 py-1.5 border border-[#D48A96]/30 bg-white/60 text-xs disabled:opacity-50"
                      title={ROLE_LABELS[u.role]}
                    >
                      <option value="admin">Admin</option>
                      <option value="guard">Guard</option>
                      <option value="moderator">Moderator</option>
                    </select>
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      disabled={isSelf}
                      onClick={() => patchUser(u.id, { active: !u.active })}
                      className={`px-2 py-1 text-[10px] uppercase tracking-wide font-semibold disabled:opacity-50 ${
                        u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {u.active ? 'Active' : 'Deactivated'}
                    </button>
                  </td>
                  <td className="px-2 py-2.5 whitespace-nowrap text-right pr-4">
                    <button
                      disabled={isSelf}
                      onClick={() => removeUser(u)}
                      className="text-xs text-red-900/60 underline underline-offset-2 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center opacity-50">
                  No team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// ---------- moderation ----------

function ModerationTab() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const moderationQuery = useQuery({
    queryKey: ['moderation', view],
    queryFn: () =>
      api.get<{ uploads: ModerationUpload[]; messages: ModerationMessage[] }>(
        `/admin/moderation?status=${view}`,
      ),
    refetchInterval: view === 'pending' ? 8000 : false,
  });

  const act = async (type: 'upload' | 'message', id: number, action: 'approve' | 'reject' | 'pending') => {
    await api.post(`/admin/moderation/${type}/${id}/${action}`);
    queryClient.invalidateQueries({ queryKey: ['moderation'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  };

  const uploads = moderationQuery.data?.uploads ?? [];
  const messages = moderationQuery.data?.messages ?? [];

  return (
    <div className="space-y-6">
      <div className="flex gap-1">
        {(['pending', 'approved', 'rejected'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 text-xs uppercase tracking-[0.15em] border ${
              view === v
                ? 'bg-[#45383C] text-[#F9F3F3] border-[#45383C]'
                : 'border-[#D48A96]/40 text-[#45383C]/60 hover:bg-[#D48A96]/10'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <section>
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50 mb-3">
          Memory uploads ({uploads.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {uploads.map((u) => (
            <div key={u.id} className="bg-[#F9F3F3] border border-[#D48A96]/30 overflow-hidden">
              {u.fileType === 'image' && (
                <img src={u.fileUrl} alt={u.caption ?? 'upload'} className="w-full h-40 object-cover" />
              )}
              {u.fileType === 'video' && (
                <video src={u.fileUrl} controls className="w-full h-40 object-cover bg-black" />
              )}
              {u.fileType === 'audio' && (
                <div className="p-3">
                  <audio src={u.fileUrl} controls className="w-full" />
                </div>
              )}
              <div className="p-2.5">
                <p className="text-xs font-medium truncate">{u.uploadedByName || 'Anonymous'}</p>
                {u.caption && <p className="text-[11px] opacity-60 truncate">“{u.caption}”</p>}
                <div className="flex gap-2 mt-2">
                  {view !== 'approved' && (
                    <button
                      onClick={() => act('upload', u.id, 'approve')}
                      className="flex-1 py-1.5 bg-emerald-700 text-white text-[10px] uppercase tracking-widest font-bold"
                    >
                      Approve
                    </button>
                  )}
                  {view !== 'rejected' && (
                    <button
                      onClick={() => act('upload', u.id, 'reject')}
                      className="flex-1 py-1.5 bg-red-700/85 text-white text-[10px] uppercase tracking-widest font-bold"
                    >
                      {view === 'approved' ? 'Hide' : 'Reject'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {uploads.length === 0 && (
            <p className="text-sm opacity-50 col-span-full">No {view} uploads.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50 mb-3">
          Guestbook messages ({messages.length})
        </h2>
        <div className="space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-[#F9F3F3] border border-[#D48A96]/30 p-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <p className="text-xs font-medium">
                  {msg.guestName || 'Anonymous'}
                  <span className="ml-2 text-[10px] uppercase opacity-50">{msg.messageType}</span>
                </p>
                {msg.text && <p className="text-sm italic opacity-80 mt-0.5">“{msg.text}”</p>}
                {msg.fileUrl && msg.messageType === 'voice' && (
                  <audio src={msg.fileUrl} controls className="mt-1 h-9 w-full max-w-xs" />
                )}
              </div>
              <div className="flex gap-2">
                {view !== 'approved' && (
                  <button
                    onClick={() => act('message', msg.id, 'approve')}
                    className="px-4 py-1.5 bg-emerald-700 text-white text-[10px] uppercase tracking-widest font-bold"
                  >
                    Approve
                  </button>
                )}
                {view !== 'rejected' && (
                  <button
                    onClick={() => act('message', msg.id, 'reject')}
                    className="px-4 py-1.5 bg-red-700/85 text-white text-[10px] uppercase tracking-widest font-bold"
                  >
                    {view === 'approved' ? 'Hide' : 'Reject'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm opacity-50">No {view} messages.</p>}
        </div>
      </section>
    </div>
  );
}

// ---------- settings ----------

const EMPTY_INVITATION_CONFIG: InvitationConfig = {
  sections: DEFAULT_SECTIONS,
  texts: {},
  backgrounds: {},
};

function normalizeInvitationConfig(value: unknown): InvitationConfig {
  let raw = value;
  if (typeof value === 'string' && value.trim()) {
    try {
      raw = JSON.parse(value);
    } catch {
      raw = null;
    }
  }
  const config =
    raw && typeof raw === 'object' ? (raw as InvitationConfig) : EMPTY_INVITATION_CONFIG;
  return {
    sections: resolveSections(config),
    texts: config.texts ?? {},
    backgrounds: config.backgrounds ?? {},
  };
}

function SettingsTab({ event }: { event: EventSettings | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [welcome, setWelcome] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);
  const [uploadsEnabled, setUploadsEnabled] = useState(true);
  const [maxUploadsPerGuest, setMaxUploadsPerGuest] = useState(5);
  const [configDraft, setConfigDraft] = useState<InvitationConfig>(
    EMPTY_INVITATION_CONFIG,
  );
  const [uploadingBg, setUploadingBg] = useState<
    keyof NonNullable<InvitationConfig['backgrounds']> | null
  >(null);

  useEffect(() => {
    if (!event) return;
    const normalized = normalizeInvitationConfig(event.invitationConfig);
    // Seed every editable field with real text — the couple's own custom
    // wording if they've saved any, otherwise the built-in default copy —
    // so the editor always shows what's actually live, never a blank box.
    const texts = { ...(normalized.texts ?? {}) };
    for (const { key } of EDITABLE_TEXTS) {
      texts[key] = {
        en: texts[key]?.en ?? defaultText('en', key),
        ar: texts[key]?.ar ?? defaultText('ar', key),
      };
    }
    setConfigDraft({ ...normalized, texts });
  }, [event?.id, event?.invitationConfig]);

  useEffect(() => {
    if (!event) return;
    setUploadsEnabled(event.uploadsEnabled);
    setMaxUploadsPerGuest(event.maxUploadsPerGuest);
  }, [event?.id, event?.uploadsEnabled, event?.maxUploadsPerGuest]);

  if (!event) return <p className="text-sm opacity-60">Loading…</p>;

  const save = async (patch: Record<string, unknown>) => {
    try {
      await api.patch('/admin/event', patch);
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast({ title: 'Settings saved', duration: 2500 });
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : '' });
    }
  };

  const setSection = (id: SectionId, patch: Partial<{ enabled: boolean }>) => {
    setConfigDraft((current) => ({
      ...current,
      sections: resolveSections(current).map((section) =>
        section.id === id ? { ...section, ...patch } : section,
      ),
    }));
  };

  const moveSection = (id: SectionId, direction: -1 | 1) => {
    setConfigDraft((current) => {
      const sections = resolveSections(current);
      const index = sections.findIndex((section) => section.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= sections.length) return current;
      const next = [...sections];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item!);
      return { ...current, sections: next };
    });
  };

  /** Re-adds a removed section at the end of the card, shown again. */
  const addSection = (id: SectionId) => {
    setConfigDraft((current) => {
      const others = resolveSections(current).filter((section) => section.id !== id);
      return { ...current, sections: [...others, { id, enabled: true }] };
    });
  };

  const setText = (key: string, lang: 'en' | 'ar', value: string) => {
    setConfigDraft((current) => ({
      ...current,
      texts: {
        ...(current.texts ?? {}),
        [key]: {
          ...(current.texts?.[key] ?? {}),
          [lang]: value,
        },
      },
    }));
  };

  const setBackground = (
    key: keyof NonNullable<InvitationConfig['backgrounds']>,
    value: string | null | undefined,
  ) => {
    setConfigDraft((current) => ({
      ...current,
      backgrounds: {
        ...(current.backgrounds ?? {}),
        [key]: value,
      },
    }));
  };

  const uploadBackground = async (
    key: keyof NonNullable<InvitationConfig['backgrounds']>,
    file: File | undefined,
  ) => {
    if (!file) return;
    setUploadingBg(key);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await api.post<{ url: string }>('/admin/asset', fd);
      setBackground(key, result.url);
      toast({ title: 'Image uploaded', duration: 2500 });
    } catch (e) {
      toast({ title: 'Upload failed', description: e instanceof Error ? e.message : '' });
    } finally {
      setUploadingBg(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <section className="bg-[#F9F3F3] border border-[#D48A96]/30 p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50">Event mode</h2>
        <div className="flex gap-2">
          {(['live', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                if (
                  s !== event.status &&
                  window.confirm(
                    s === 'archived'
                      ? 'Switch to after-wedding archive mode? Invitation links will show the thank-you page and album.'
                      : 'Switch event back to live mode?',
                  )
                )
                  save({ status: s });
              }}
              className={`px-5 py-2.5 text-xs uppercase tracking-[0.15em] border ${
                event.status === s
                  ? 'bg-[#45383C] text-[#F9F3F3] border-[#45383C]'
                  : 'border-[#D48A96]/40 text-[#45383C]/60'
              }`}
            >
              {s === 'live' ? 'Live wedding' : 'After-wedding archive'}
            </button>
          ))}
        </div>
        <p className="text-[11px] opacity-55">
          Archive mode turns every invitation link into the thank-you page with the approved
          photo album and guestbook.
        </p>
      </section>

      <section className="bg-[#F9F3F3] border border-[#D48A96]/30 p-5 space-y-4">
        <div>
          <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50">Guest uploads</h2>
          <p className="text-[11px] opacity-55 mt-2 leading-relaxed">
            Control whether guests can add memories from the invitation or table screens, and
            choose the per-guest upload cap.
            <br />
            تحكموا إذا كان الضيوف يستطيعون رفع الذكريات من شاشة الدعوة أو شاشة الطاولة، وحددوا الحد الأعلى لكل ضيف.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <label className="flex items-start gap-3 text-sm rounded-2xl border border-[#D48A96]/25 bg-white/55 p-4">
            <input
              type="checkbox"
              checked={uploadsEnabled}
              onChange={(e) => setUploadsEnabled(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-[#B25A6C]"
            />
            <span>
              <span className="block font-medium">
                {uploadsEnabled ? 'Uploads enabled' : 'Uploads locked'}
              </span>
              <span className="block text-[11px] opacity-55 mt-1 leading-relaxed">
                When locked, guests can still confirm RSVP and send guestbook wishes, but photo
                and voice uploads are hidden.
                <br />
                عند الإغلاق، يبقى تأكيد الحضور ورسائل سجل التهاني متاحين، لكن رفع الصور والرسائل الصوتية يختفي.
              </span>
            </span>
          </label>
          <div className="rounded-2xl border border-[#D48A96]/25 bg-white/55 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Max uploads per guest</p>
                <p className="text-[11px] opacity-55">
                  Applies to memories and voice notes together.
                  <br />
                  ينطبق على الذكريات والرسائل الصوتية معاً.
                </p>
              </div>
              <input
                type="number"
                min={1}
                max={20}
                value={maxUploadsPerGuest}
                onChange={(e) =>
                  setMaxUploadsPerGuest(
                    Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                  )
                }
                className="w-20 px-3 py-2 border border-[#D48A96]/35 bg-white text-sm focus:outline-none focus:border-[#B25A6C]"
              />
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={maxUploadsPerGuest}
              onChange={(e) => setMaxUploadsPerGuest(Number(e.target.value))}
              className="w-full accent-[#B25A6C]"
            />
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#45383C]/45">
              <span>1</span>
              <span>{maxUploadsPerGuest} per guest</span>
              <span>20</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() =>
              save({
                uploadsEnabled,
                maxUploadsPerGuest,
              })
            }
            className="px-6 py-2.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-xs font-semibold"
          >
            Save upload controls
          </button>
          <p className="text-[11px] opacity-55 self-center">
            The current limit is shared by both invitation and table upload flows.
          </p>
        </div>
      </section>

      <section className="bg-[#F9F3F3] border border-[#D48A96]/30 p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50">Moderation</h2>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={event.tablesEnabled}
            onChange={(e) => {
              if (
                !e.target.checked ||
                window.confirm('Enable table assignments and table QR pages?')
              ) {
                save({ tablesEnabled: e.target.checked });
              }
            }}
            className="w-4 h-4 mt-0.5 accent-[#B25A6C]"
          />
          <span>
            Table assignments and table QR pages
            <span className="block text-[11px] opacity-55">
              Currently off. While off, guests are not tied to tables and table names are hidden from invitations.
            </span>
          </span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={event.autoApprove}
            onChange={(e) => save({ autoApprove: e.target.checked })}
            className="w-4 h-4 accent-[#B25A6C]"
          />
          Auto-approve new uploads and messages (skip the moderation queue)
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={event.guestbookPublic}
            onChange={(e) => save({ guestbookPublic: e.target.checked })}
            className="w-4 h-4 accent-[#B25A6C]"
          />
          Show approved guestbook messages to guests in the archive
        </label>
      </section>

      <section className="bg-[#F9F3F3] border border-[#D48A96]/30 p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50">Wording</h2>
        <label className="block text-xs">
          <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Welcome message</span>
          <textarea
            rows={3}
            value={welcome ?? event.welcomeMessage ?? ''}
            onChange={(e) => setWelcome(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 focus:outline-none focus:border-[#B25A6C] text-sm"
          />
        </label>
        <label className="block text-xs">
          <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Thank-you message (archive)</span>
          <textarea
            rows={3}
            value={thanks ?? event.thankYouMessage ?? ''}
            onChange={(e) => setThanks(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 focus:outline-none focus:border-[#B25A6C] text-sm"
          />
        </label>
        <button
          onClick={() =>
            save({
              welcomeMessage: welcome ?? event.welcomeMessage,
              thankYouMessage: thanks ?? event.thankYouMessage,
            })
          }
          className="px-6 py-2.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-xs font-semibold"
        >
          Save wording
        </button>
      </section>

      <section className="bg-[#F9F3F3] border border-[#D48A96]/30 p-5 space-y-5">
        <div>
          <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50">Invitation card editor</h2>
          <p className="text-[11px] opacity-55 mt-2">
            This shows exactly what's live on the card right now — edit it directly. Save applies to
            both public and personal invitation links.
          </p>
        </div>

        {(() => {
          const allSections = resolveSections(configDraft);
          const shown = allSections.filter((s) => s.enabled);
          const hidden = allSections.filter((s) => !s.enabled);
          const enabledMap = new Map(allSections.map((s) => [s.id, s.enabled]));
          return (
            <>
              <div>
                <h3 className="text-[10px] uppercase tracking-widest opacity-60 mb-2">
                  Sections on your card
                </h3>
                <div className="space-y-2">
                  {shown.map((section, index) => (
                    <div
                      key={section.id}
                      className="flex items-center gap-2 bg-white/55 border border-[#D48A96]/25 px-3 py-2"
                    >
                      <span className="flex-1 text-sm">{SECTION_LABELS[section.id]}</span>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveSection(section.id, -1)}
                        className="px-2 py-1 border border-[#D48A96]/35 text-xs disabled:opacity-30"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        disabled={index === shown.length - 1}
                        onClick={() => moveSection(section.id, 1)}
                        className="px-2 py-1 border border-[#D48A96]/35 text-xs disabled:opacity-30"
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        onClick={() => setSection(section.id, { enabled: false })}
                        title="Remove from card"
                        className="px-2 py-1 border border-red-800/25 text-red-800/70 text-xs hover:bg-red-800/5"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ))}
                  {shown.length === 0 && (
                    <p className="text-xs opacity-50 italic">
                      No sections on the card — add one below.
                    </p>
                  )}
                </div>
                {hidden.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {hidden.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => addSection(section.id)}
                        className="px-3 py-1.5 border border-[#D48A96]/40 text-[#B25A6C] text-xs hover:bg-[#D48A96]/10"
                      >
                        + Add {SECTION_LABELS[section.id]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-[10px] uppercase tracking-widest opacity-60 mb-2">Card wording</h3>
                <div className="space-y-4">
                  {TEXT_GROUPS.map((group) => {
                    const groupLabel =
                      group.id === 'envelope' ? 'Envelope (before opening)' : SECTION_LABELS[group.id];
                    const isHidden = group.id !== 'envelope' && enabledMap.get(group.id) === false;
                    return (
                      <div
                        key={group.id}
                        className="bg-[#FDF9F8] border border-[#D48A96]/30 p-4 space-y-3"
                      >
                        <p className="text-[10px] uppercase tracking-widest text-[#B25A6C] font-semibold">
                          {groupLabel}
                          {isHidden && <span className="ml-2 text-[#45383C]/40">(currently hidden)</span>}
                        </p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {group.keys.map((key) => {
                            const label = EDITABLE_TEXTS.find((e) => e.key === key)?.label ?? key;
                            return (
                              <div key={key}>
                                <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">{label}</p>
                                <textarea
                                  rows={2}
                                  value={configDraft.texts?.[key]?.en ?? ''}
                                  onChange={(e) => setText(key, 'en', e.target.value)}
                                  className="w-full px-3 py-2 border border-[#D48A96]/30 bg-white text-sm font-serif focus:outline-none focus:border-[#B25A6C]"
                                />
                                <textarea
                                  rows={2}
                                  dir="rtl"
                                  value={configDraft.texts?.[key]?.ar ?? ''}
                                  onChange={(e) => setText(key, 'ar', e.target.value)}
                                  className="w-full mt-2 px-3 py-2 border border-[#D48A96]/30 bg-white text-sm font-serif focus:outline-none focus:border-[#B25A6C]"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()}

        <div>
          <h3 className="text-[10px] uppercase tracking-widest opacity-60 mb-2">Background images</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(['top', 'center', 'bottom'] as const).map((key) => (
              <div key={key} className="bg-white/55 border border-[#D48A96]/25 p-3 space-y-2">
                <p className="text-[10px] uppercase tracking-widest opacity-60">{key} image</p>
                <input
                  value={configDraft.backgrounds?.[key] ?? ''}
                  onChange={(e) => setBackground(key, e.target.value || undefined)}
                  placeholder={key === 'center' ? '/faded-transparent-floral-background.png' : 'Default garland'}
                  className="w-full px-3 py-2 border border-[#D48A96]/30 bg-white/80 text-xs focus:outline-none focus:border-[#B25A6C]"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    uploadBackground(key, e.target.files?.[0]);
                    e.target.value = '';
                  }}
                  className="w-full text-xs"
                />
                <button
                  type="button"
                  onClick={() => setBackground(key, null)}
                  className="text-xs underline underline-offset-2 text-[#B25A6C]"
                >
                  Hide this image
                </button>
                {uploadingBg === key && <p className="text-xs opacity-55">Uploading...</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => save({ invitationConfig: configDraft })}
            className="px-6 py-2.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-xs font-semibold"
          >
            Save invitation card
          </button>
          <button
            onClick={() => setConfigDraft(EMPTY_INVITATION_CONFIG)}
            className="px-6 py-2.5 border border-[#D48A96]/50 text-[#B25A6C] uppercase tracking-widest text-xs"
          >
            Reset draft
          </button>
        </div>
      </section>

      <section className="bg-[#F9F3F3] border border-[#D48A96]/30 p-5">
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50 mb-3">Staff accounts</h2>
        <p className="text-sm opacity-70 leading-relaxed">
          <strong>admin</strong> — full dashboard access (this account).<br />
          <strong>guard</strong> — entrance scanner only. Give the guard device the{' '}
          <a href="/scanner" className="text-[#B25A6C] underline underline-offset-2">/scanner</a> link.
        </p>
      </section>
    </div>
  );
}
