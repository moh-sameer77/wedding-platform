import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, GripVertical, Image as ImageIcon, Mail, Pencil, RotateCcw, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api, type InviteDetails } from '@/lib/api';
import InvitationCard from '@/components/InvitationCard';
import {
  DEFAULT_SECTIONS,
  EDITABLE_TEXTS,
  SECTION_LABELS,
  TEXT_GROUPS,
  defaultText,
  resolveSections,
  setTextOverrides,
  type InvitationConfig,
  type Lang,
  type SectionId,
  type StringKey,
} from '@/lib/i18n';

/**
 * The invitation CMS: renders the real InvitationCard (the exact component
 * guests see) with editing chrome on every section — drag to reorder,
 * pencil to edit the wording in both languages, eye to hide/show.
 * Nothing goes live until "Save & publish".
 */

const SAMPLE_INVITATION: InviteDetails['invitation'] = {
  guestName: 'Ahmad Family',
  allowedCount: 4,
  rsvpStatus: 'pending',
  rsvpCount: null,
  checkedIn: 0,
  tableName: null,
};

export function normalizeInvitationConfig(value: unknown): InvitationConfig {
  let raw = value;
  if (typeof value === 'string' && value.trim()) {
    try {
      raw = JSON.parse(value);
    } catch {
      raw = null;
    }
  }
  const config =
    raw && typeof raw === 'object'
      ? (raw as InvitationConfig)
      : { sections: DEFAULT_SECTIONS, texts: {}, backgrounds: {} };
  return {
    sections: resolveSections(config),
    texts: config.texts ?? {},
    backgrounds: config.backgrounds ?? {},
    // Keep the WhatsApp template — dropping it here would silently erase it
    // whenever the card editor saves.
    whatsappMessage: config.whatsappMessage,
  };
}

/** Seed every editable key with real text (custom if saved, else the built-in
 * default) so the editor always shows what's actually live — never a blank box. */
function seedConfig(config: InvitationConfig): InvitationConfig {
  const texts = { ...(config.texts ?? {}) };
  for (const { key } of EDITABLE_TEXTS) {
    texts[key] = {
      en: texts[key]?.en ?? defaultText('en', key),
      ar: texts[key]?.ar ?? defaultText('ar', key),
    };
  }
  return { ...config, texts };
}

function CmsModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-[#45383C]/45 backdrop-blur-[2px] p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] overflow-y-auto bg-[#FDF9F8] border border-[#D48A96]/40 shadow-2xl rounded-t-2xl sm:rounded-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-[#FDF9F8]/95 backdrop-blur border-b border-[#D48A96]/25">
          <h3 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/60 font-semibold">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-[#D48A96]/35 text-[#45383C]/60 hover:bg-[#D48A96]/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-5">{children}</div>
      </div>
    </div>
  );
}

function TextFieldEditor({
  textKey,
  values,
  onChange,
}: {
  textKey: StringKey;
  values: { en?: string; ar?: string };
  onChange: (lang: Lang, value: string) => void;
}) {
  const label = EDITABLE_TEXTS.find((e) => e.key === textKey)?.label ?? textKey;
  const placeholders = (defaultText('en', textKey).match(/\{[a-zA-Z]+\}/g) ?? []).join(' ');
  return (
    <div className="bg-white/70 border border-[#D48A96]/25 p-3.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-[#B25A6C] font-semibold">{label}</p>
        <button
          type="button"
          title="Reset to the original wording"
          onClick={() => {
            onChange('en', defaultText('en', textKey));
            onChange('ar', defaultText('ar', textKey));
          }}
          className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-[#45383C]/45 hover:text-[#B25A6C]"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>
      <label className="block">
        <span className="block text-[10px] uppercase tracking-widest opacity-45 mb-1">English</span>
        <textarea
          rows={2}
          value={values.en ?? ''}
          onChange={(e) => onChange('en', e.target.value)}
          className="w-full px-3 py-2 border border-[#D48A96]/30 bg-white text-sm font-serif focus:outline-none focus:border-[#B25A6C]"
        />
      </label>
      <label className="block">
        <span className="block text-[10px] uppercase tracking-widest opacity-45 mb-1">العربية</span>
        <textarea
          rows={2}
          dir="rtl"
          value={values.ar ?? ''}
          onChange={(e) => onChange('ar', e.target.value)}
          className="w-full px-3 py-2 border border-[#D48A96]/30 bg-white text-sm font-serif focus:outline-none focus:border-[#B25A6C]"
        />
      </label>
      {placeholders && (
        <p className="text-[10px] text-[#B25A6C]/80">
          Keep the {placeholders} placeholder{placeholders.includes(' ') ? 's' : ''} — they are
          filled in automatically for each guest.
        </p>
      )}
    </div>
  );
}

/** Wraps one card section with the editing chrome: drag handle, label,
 * edit + hide buttons. Hidden sections collapse to a slim restore bar. */
function SortableCmsSection({
  section,
  node,
  onEdit,
  onToggle,
}: {
  section: { id: SectionId; enabled: boolean };
  node: React.ReactNode;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative w-full group ${isDragging ? 'z-50 opacity-80' : ''}`}
    >
      {/* Floating toolbar */}
      <div
        dir="ltr"
        className={`absolute ${section.enabled ? '-top-4' : 'top-1/2 -translate-y-1/2'} right-1 z-40 flex items-center gap-0.5 rounded-full border border-[#D48A96]/40 bg-white/95 shadow-md backdrop-blur px-1.5 py-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity`}
      >
        <span
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          className="p-1 cursor-grab active:cursor-grabbing touch-none text-[#45383C]/50 hover:text-[#B25A6C]"
        >
          <GripVertical className="w-4 h-4" />
        </span>
        <span className="hidden sm:block px-1 text-[10px] uppercase tracking-widest text-[#45383C]/55 max-w-[130px] truncate">
          {SECTION_LABELS[section.id]}
        </span>
        <button
          type="button"
          onClick={onEdit}
          title="Edit wording (English & Arabic)"
          className="p-1.5 text-[#45383C]/60 hover:text-[#B25A6C]"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          title={section.enabled ? 'Hide from the card' : 'Show on the card'}
          className="p-1.5 text-[#45383C]/60 hover:text-[#B25A6C]"
        >
          {section.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      {section.enabled ? (
        <div className="pointer-events-none select-none rounded-sm transition-shadow group-hover:ring-1 group-hover:ring-[#B25A6C]/35 group-hover:ring-dashed">
          {node}
        </div>
      ) : (
        <div className="flex items-center gap-3 w-full max-w-md mx-auto border border-dashed border-[#B25A6C]/45 bg-white/70 px-4 py-3 text-[#45383C]/55">
          <EyeOff className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-xs uppercase tracking-[0.18em] truncate">
            {SECTION_LABELS[section.id]} — hidden
          </span>
          <button
            type="button"
            onClick={onToggle}
            className="text-[10px] uppercase tracking-widest text-[#B25A6C] underline underline-offset-2 mr-20"
          >
            Show
          </button>
        </div>
      )}
    </div>
  );
}

export default function InvitationCms({
  invitationConfig,
  enableEnglish,
  enableArabic,
  tablesEnabled,
}: {
  invitationConfig: unknown;
  enableEnglish: boolean;
  enableArabic: boolean;
  tablesEnabled: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const baseline = useMemo(
    () => seedConfig(normalizeInvitationConfig(invitationConfig)),
    [invitationConfig],
  );
  const [draft, setDraft] = useState<InvitationConfig>(baseline);
  useEffect(() => setDraft(baseline), [baseline]);

  const [previewLang, setPreviewLang] = useState<Lang>(enableEnglish ? 'en' : 'ar');
  const [editingSection, setEditingSection] = useState<SectionId | 'envelope' | null>(null);
  const [artworkOpen, setArtworkOpen] = useState(false);
  const [uploadingBg, setUploadingBg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The preview card reads wording through t() exactly like the guest page,
  // so mirror the draft into the global overrides on every draft change.
  useMemo(() => setTextOverrides(draft.texts), [draft.texts]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(baseline),
    [draft, baseline],
  );

  const sections = resolveSections(draft);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setDraft((current) => ({
      ...current,
      sections: arrayMove(resolveSections(current), oldIndex, newIndex),
    }));
  };

  const toggleSection = (id: SectionId) => {
    setDraft((current) => ({
      ...current,
      sections: resolveSections(current).map((section) =>
        section.id === id ? { ...section, enabled: !section.enabled } : section,
      ),
    }));
  };

  const setText = (key: string, lang: Lang, value: string) => {
    setDraft((current) => ({
      ...current,
      texts: {
        ...(current.texts ?? {}),
        [key]: { ...(current.texts?.[key] ?? {}), [lang]: value },
      },
    }));
  };

  const setBackground = (
    key: keyof NonNullable<InvitationConfig['backgrounds']>,
    value: string | null | undefined,
  ) => {
    setDraft((current) => ({
      ...current,
      backgrounds: { ...(current.backgrounds ?? {}), [key]: value },
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

  const publish = async () => {
    setSaving(true);
    try {
      await api.patch('/admin/event', { invitationConfig: draft });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast({ title: 'Invitation published', description: 'Guests now see the updated card.', duration: 3000 });
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : '' });
    } finally {
      setSaving(false);
    }
  };

  const editingGroup =
    editingSection === null ? null : TEXT_GROUPS.find((g) => g.id === editingSection) ?? null;

  const backgrounds = draft.backgrounds ?? {};
  const topBg = backgrounds.top;
  const bottomBg = backgrounds.bottom;

  return (
    <section className="bg-[#F9F3F3] border border-[#D48A96]/30 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/50">
            Invitation card — live editor
          </h2>
          <p className="text-[11px] opacity-55 mt-2 max-w-md leading-relaxed">
            This is the exact card guests see. Hover a section (or tap on mobile) for its tools:
            drag <GripVertical className="inline w-3 h-3 -mt-0.5" /> to reorder, pencil to edit the
            wording in both languages, eye to hide or show it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditingSection('envelope')}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#D48A96]/40 text-[#B25A6C] text-[11px] uppercase tracking-widest hover:bg-[#D48A96]/10"
          >
            <Mail className="w-3.5 h-3.5" /> Envelope text
          </button>
          <button
            type="button"
            onClick={() => setArtworkOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#D48A96]/40 text-[#B25A6C] text-[11px] uppercase tracking-widest hover:bg-[#D48A96]/10"
          >
            <ImageIcon className="w-3.5 h-3.5" /> Artwork
          </button>
        </div>
      </div>

      {/* Language tabs for the preview */}
      <div className="flex items-center gap-1 w-fit border border-[#D48A96]/35 p-1 bg-white/60">
        {([
          ['en', 'English', enableEnglish],
          ['ar', 'العربية', enableArabic],
        ] as const).map(([code, label, enabled]) => (
          <button
            key={code}
            type="button"
            onClick={() => setPreviewLang(code)}
            className={`px-4 py-1.5 text-xs uppercase tracking-[0.15em] transition-colors ${
              previewLang === code
                ? 'bg-[#45383C] text-[#F9F3F3]'
                : 'text-[#45383C]/60 hover:bg-[#D48A96]/10'
            }`}
          >
            {label}
            {!enabled && ' (off)'}
          </button>
        ))}
      </div>

      {/* The live card, wrapped in editing chrome */}
      <div className="border border-[#D48A96]/30 bg-[#F3E4E2] p-3 sm:p-6 overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <InvitationCard
              lang={previewLang}
              sections={sections}
              invitation={SAMPLE_INVITATION}
              token={null}
              tablesEnabled={tablesEnabled}
              topBg={topBg}
              bottomBg={bottomBg}
              includeHidden
              renderSection={(section, node) => (
                <SortableCmsSection
                  section={section}
                  node={node}
                  onEdit={() => setEditingSection(section.id)}
                  onToggle={() => toggleSection(section.id)}
                />
              )}
            />
          </SortableContext>
        </DndContext>
      </div>
      <p className="text-[11px] opacity-50">
        The personal greeting shows a sample guest ("{SAMPLE_INVITATION.guestName}") — each guest
        sees their own name and seat count.
      </p>

      {/* Sticky publish bar */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 pointer-events-none">
          <div className="mx-auto max-w-xl flex items-center justify-between gap-3 rounded-2xl border border-[#D48A96]/40 bg-[#FDF9F8]/95 backdrop-blur px-5 py-3.5 shadow-2xl pointer-events-auto">
            <p className="text-xs text-[#45383C]/70">
              <span className="font-semibold text-[#B25A6C]">Unsaved changes</span> — guests still
              see the previous card.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDraft(baseline)}
                className="px-4 py-2 border border-[#D48A96]/50 text-[#B25A6C] uppercase tracking-widest text-[11px]"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={publish}
                className="px-5 py-2 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-[11px] font-semibold disabled:opacity-60"
              >
                {saving ? 'Publishing…' : 'Save & publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wording editor */}
      {editingSection && editingGroup && (
        <CmsModal
          title={
            editingSection === 'envelope'
              ? 'Envelope (before opening)'
              : SECTION_LABELS[editingSection]
          }
          onClose={() => setEditingSection(null)}
        >
          <p className="text-[11px] opacity-55 -mt-2">
            Changes preview instantly on the card behind — nothing reaches guests until you Save
            &amp; publish.
          </p>
          {editingGroup.keys.map((key) => (
            <TextFieldEditor
              key={key}
              textKey={key}
              values={draft.texts?.[key] ?? {}}
              onChange={(lang, value) => setText(key, lang, value)}
            />
          ))}
          <button
            type="button"
            onClick={() => setEditingSection(null)}
            className="w-full py-3 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-xs font-semibold"
          >
            Done
          </button>
        </CmsModal>
      )}

      {/* Section edit for sections without editable text (fallback) */}
      {editingSection && !editingGroup && (
        <CmsModal title={SECTION_LABELS[editingSection as SectionId]} onClose={() => setEditingSection(null)}>
          <p className="text-sm opacity-70">
            This section has no editable wording — it is generated automatically.
          </p>
        </CmsModal>
      )}

      {/* Artwork editor */}
      {artworkOpen && (
        <CmsModal title="Card artwork" onClose={() => setArtworkOpen(false)}>
          <p className="text-[11px] opacity-55 -mt-2">
            The top and bottom garlands frame the card; the center watercolor floats softly behind
            the content while guests scroll.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {(['top', 'center', 'bottom'] as const).map((key) => (
              <div key={key} className="bg-white/70 border border-[#D48A96]/25 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-[#B25A6C] font-semibold">
                    {key} image
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setBackground(key, backgrounds[key] === null ? undefined : null)
                    }
                    className="text-[10px] uppercase tracking-widest text-[#45383C]/50 underline underline-offset-2 hover:text-[#B25A6C]"
                  >
                    {backgrounds[key] === null ? 'Show default' : 'Hide this image'}
                  </button>
                </div>
                {backgrounds[key] === null ? (
                  <p className="text-xs opacity-50 italic">Hidden from the card.</p>
                ) : (
                  <>
                    <input
                      value={backgrounds[key] ?? ''}
                      onChange={(e) => setBackground(key, e.target.value || undefined)}
                      placeholder={
                        key === 'center'
                          ? 'Default watercolor background'
                          : 'Default garland artwork'
                      }
                      className="w-full px-3 py-2 border border-[#D48A96]/30 bg-white text-xs focus:outline-none focus:border-[#B25A6C]"
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
                    {uploadingBg === key && <p className="text-xs opacity-55">Uploading…</p>}
                  </>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setArtworkOpen(false)}
            className="w-full py-3 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-xs font-semibold"
          >
            Done
          </button>
        </CmsModal>
      )}
    </section>
  );
}
