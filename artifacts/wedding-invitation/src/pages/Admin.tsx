import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import LoginGate from '@/components/LoginGate';
import { useToast } from '@/hooks/use-toast';
import { api, getSessionToken, publicUrl } from '@/lib/api';
import { usePageTitle } from '@/hooks/use-page-title';

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
  welcomeMessage: string | null;
  thankYouMessage: string | null;
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

type Tab = 'overview' | 'guests' | 'tables' | 'moderation' | 'settings';

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
        {TABS.map((t) => (
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
        {tab === 'guests' && <GuestsTab />}
        {tab === 'tables' && <TablesTab />}
        {tab === 'moderation' && <ModerationTab />}
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

function GuestsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ guestName: '', phone: '', allowedCount: 2, tableId: '' });

  const invitationsQuery = useQuery({
    queryKey: ['admin-invitations'],
    queryFn: () => api.get<{ invitations: AdminInvitation[] }>('/admin/invitations'),
  });
  const tablesQuery = useQuery({
    queryKey: ['admin-tables'],
    queryFn: () => api.get<{ tables: AdminTable[] }>('/admin/tables'),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/admin/invitations', {
        guestName: form.guestName.trim(),
        phone: form.phone.trim() || null,
        allowedCount: form.allowedCount,
        tableId: form.tableId ? Number(form.tableId) : null,
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
        tableName: cols[3] || undefined,
      }));
    if (rows.length === 0) {
      toast({ title: 'No rows found', description: 'Expected columns: name, phone, allowed count, table' });
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

  const inviteText = (inv: AdminInvitation, lang: 'en' | 'ar') =>
    lang === 'ar'
      ? `بكل حب وسعادة، نتشرف بدعوتكم لمشاركتنا فرحتنا في يوم زفافنا 💍\n` +
        `محمد ورناد — السبت ٢٥ تموز ٢٠٢٦ · تال باين، عمّان\n` +
        `دعوتكم الشخصية (${inv.allowedCount} ${inv.allowedCount === 1 ? 'مقعد' : 'مقاعد'}):\n` +
        inviteUrl(inv, 'ar')
      : `With love and joy, we invite you to celebrate our wedding day with us. 💍\n` +
        `Mohammad & Renad — Saturday, July 25, 2026 · Tal Pine, Amman\n` +
        `Your personal invitation (${inv.allowedCount} ${inv.allowedCount === 1 ? 'seat' : 'seats'}):\n` +
        inviteUrl(inv, 'en');

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
  const tables = tablesQuery.data?.tables ?? [];

  return (
    <div className="space-y-6">
      <section className="bg-[#F9F3F3] border border-[#D48A96]/30 p-4">
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50 mb-3">Add guest / family</h2>
        <form
          className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_auto_1.5fr_auto] gap-2 items-end"
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
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 focus:outline-none focus:border-[#B25A6C]"
              placeholder="+9627…"
            />
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
          <label className="text-xs">
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
            CSV columns: name, phone, seats, table
          </p>
        </div>
      </section>

      <section className="bg-[#F9F3F3] border border-[#D48A96]/30 overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-[#45383C]/50 border-b border-[#D48A96]/25">
              <th className="px-4 py-3">Guest</th>
              <th className="px-2 py-3">Seats</th>
              <th className="px-2 py-3">RSVP</th>
              <th className="px-2 py-3">Table</th>
              <th className="px-2 py-3">Checked in</th>
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
                <td className="px-2 py-2.5">
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
                <td colSpan={7} className="px-4 py-8 text-center opacity-50">
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

function SettingsTab({ event }: { event: EventSettings | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [welcome, setWelcome] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);

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

  return (
    <div className="max-w-2xl space-y-6">
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
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50">Moderation</h2>
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
