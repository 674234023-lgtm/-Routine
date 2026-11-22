import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Check,
  Copy,
  Database,
  Download,
  ExternalLink,
  FolderKanban,
  Globe,
  Link2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';

interface AdminBackofficeViewProps {
  onExitAdmin: () => void;
  onPreviewPingSlug: (slug: string) => void;
}

type AdminTab = 'people' | 'ping-links' | 'quotes-cms' | 'database';

interface AdminPersonRecord {
  userKey: string;
  displayName: string;
  roleNote?: string;
  updatedAt: string;
  stats: {
    todosCount: number;
    pendingTodosCount: number;
    routinesCount: number;
    eventsCount: number;
    sleepCount: number;
    mealsCount: number;
    workoutsCount: number;
    cycleCount: number;
    classesCount: number;
    workTasksCount: number;
    skillsCount: number;
    notesCount: number;
    ventsCount: number;
    quotesCount: number;
    pingLinksCount: number;
  };
  recentTodos: Array<{ id: string; title: string; date: string; completed: boolean; category: string }>;
  recentNotes: Array<{ id: string; title: string; type: string; mood?: string; updatedAt: string }>;
  recentWork: Array<{ id: string; title: string; dueDate: string; status: string }>;
  savedQuotes: Array<{ id: string; quote: string; source_name: string; created_at?: string }>;
  shareLinks: Array<{
    slug: string;
    friend_name: string;
    sender_name: string;
    message: string;
    owner_key?: string;
    owner_name?: string;
    created_at?: string;
  }>;
}

const WEB_QUOTE_SOURCES = [
  { id: 'wongnai', label: 'Wongnai Beauty' },
  { id: 'linetoday', label: 'LINE TODAY' },
  { id: 'asianparent', label: 'theAsianparent Thailand' },
  { id: 'salehere', label: 'Sale Here' },
  { id: 'shopee', label: 'Shopee Blog' },
] as const;

const SUPABASE_SQL_SNIPPET = `CREATE TABLE IF NOT EXISTS public.pinging_app_state (
  user_key TEXT PRIMARY KEY,
  state_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pinging_saved_quotes (
  id TEXT PRIMARY KEY,
  user_key TEXT NOT NULL,
  quote TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pinging_share_links (
  slug TEXT PRIMARY KEY,
  friend_name TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT 'เพื่อนของคุณ',
  message TEXT NOT NULL,
  quote_text TEXT NOT NULL,
  quote_source TEXT,
  owner_key TEXT DEFAULT 'owner-ping',
  owner_name TEXT DEFAULT 'คุณปิ้ง',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ล็อกตารางส่วนตัวไม่ให้คนภายนอก (anon) อ่านหรือเขียนได้ ดูได้เฉพาะผู้ดูแลผ่าน Server เท่านั้น
ALTER TABLE public.pinging_app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinging_saved_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinging_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow app state access" ON public.pinging_app_state;
DROP POLICY IF EXISTS "Allow saved quotes access" ON public.pinging_saved_quotes;
DROP POLICY IF EXISTS "Allow share links access" ON public.pinging_share_links;

CREATE POLICY "Deny public app state access" ON public.pinging_app_state FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny public saved quotes access" ON public.pinging_saved_quotes FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Public read share links only" ON public.pinging_share_links FOR SELECT TO anon, authenticated USING (true);`;

interface FetchedQuoteResult {
  quote: string;
  note?: string;
  sourceName: string;
  sourceUrl?: string;
}

export const AdminBackofficeView: React.FC<AdminBackofficeViewProps> = ({
  onExitAdmin,
  onPreviewPingSlug,
}) => {
  const {
    state,
    createPingLink,
    deletePingLink,
    saveWebQuote,
    deleteWebQuote,
    switchUserProfile,
    supabaseConfigured,
    serviceRoleActive,
    passcodeRequired,
    ownerToken,
    verifyOwnerPasscode,
    syncNowToSupabase,
    exportBackup,
    importBackup,
    resetAllData,
  } = useAppStore();

  const [unlocked, setUnlocked] = useState(Boolean(ownerToken));
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [tab, setTab] = useState<AdminTab>('people');

  // --- Per-Person Organizer state ---
  const [selectedPersonKey, setSelectedPersonKey] = useState<string>('all');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonKey, setNewPersonKey] = useState('');
  const [personStatusMsg, setPersonStatusMsg] = useState('');

  // --- Ping Link Builder ---
  const [slugInput, setSlugInput] = useState('ฟ้า');
  const [friendName, setFriendName] = useState('');
  const [senderName, setSenderName] = useState(state.ownerProfile?.displayName || 'คุณปิ้ง');
  const [pingMsg, setPingMsg] = useState('');
  const [selectedQuoteIdx, setSelectedQuoteIdx] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [linkOwnerFilter, setLinkOwnerFilter] = useState<string>('all');

  // --- Quote CMS ---
  const [webSource, setWebSource] = useState<string>('wongnai');
  const [webTopic, setWebTopic] = useState('คำคมฮีลใจ กำลังใจ รักตัวเอง');
  const [customUrl, setCustomUrl] = useState('');
  const [webLoading, setWebLoading] = useState(false);
  const [webError, setWebError] = useState('');
  const [fetchedQuotes, setFetchedQuotes] = useState<FetchedQuoteResult[]>([]);

  // --- Database & Private Viewer ---
  const [syncMsg, setSyncMsg] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [dbLoading, setDbLoading] = useState(false);
  const [dbSummary, setDbSummary] = useState<{
    configured?: boolean;
    errors?: string[];
    people?: AdminPersonRecord[];
    appStates?: Array<{
      userKey: string;
      displayName?: string;
      updatedAt: string;
      todosCount: number;
      notesCount: number;
      sleepCount: number;
    }>;
    savedQuotes?: Array<{ id: string; user_key?: string; quote: string; source_name: string }>;
    shareLinks?: Array<{
      slug: string;
      friend_name: string;
      sender_name?: string;
      message: string;
      owner_key?: string;
      owner_name?: string;
    }>;
  } | null>(null);

  const handleLoadDbSummary = useCallback(async () => {
    if (!ownerToken) return;
    setDbLoading(true);
    try {
      const res = await fetch('/api/admin/db-summary', {
        headers: { 'x-owner-token': ownerToken },
      });
      const json = await res.json();
      setDbSummary(json);
    } catch {
      setDbSummary({ configured: false, errors: ['ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้'] });
    } finally {
      setDbLoading(false);
    }
  }, [ownerToken]);

  useEffect(() => {
    if (unlocked && ownerToken) {
      handleLoadDbSummary();
    }
  }, [unlocked, ownerToken, handleLoadDbSummary]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinLoading(true);
    setPinError('');
    const result = await verifyOwnerPasscode(pinInput);
    setPinLoading(false);
    if (result.ok) {
      setUnlocked(true);
      setPinInput('');
    } else {
      setPinError(result.error || 'รหัสผ่านระบบหลังบ้านไม่ถูกต้อง');
    }
  };

  const buildShareUrl = (link: { slug: string }) => {
    return `${window.location.origin}/ปิ้ง/${link.slug}`;
  };

  const handleCreatePingLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim() || !pingMsg.trim()) return;
    const chosenQuote = state.savedQuotes[selectedQuoteIdx] || state.savedQuotes[0];
    createPingLink({
      slug: slugInput.trim() || friendName.trim(),
      friendName: friendName.trim(),
      senderName: senderName.trim() || state.ownerProfile?.displayName || 'คุณปิ้ง',
      message: pingMsg.trim(),
      quoteText:
        chosenQuote?.quote ||
        'วันนี้ขอให้มีเรื่องน่ารักๆ เข้ามาทักทายหัวใจเธอนะ',
      quoteSource: chosenQuote?.sourceName || 'Pinging Your Day',
      ownerKey: state.ownerProfile?.userKey || 'owner-ping',
      ownerName: state.ownerProfile?.displayName || 'คุณปิ้ง',
    });
    setFriendName('');
    setPingMsg('');
    setTimeout(() => handleLoadDbSummary(), 400);
  };

  const handleCopyPing = (id: string, url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleCreateAndSwitchPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    const key =
      newPersonKey.trim() ||
      `user-${newPersonName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\u0E00-\u0E7Fa-z0-9_-]/g, '') || Date.now().toString(36).slice(-4)}`;
    await switchUserProfile(key, newPersonName.trim());
    setPersonStatusMsg(`สลับมาใช้งานพื้นที่ของ “${newPersonName.trim()}” (${key}) เรียบร้อยแล้ว`);
    setNewPersonName('');
    setNewPersonKey('');
    setTimeout(() => handleLoadDbSummary(), 950);
  };

  const handleFetchWebQuotes = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebLoading(true);
    setWebError('');
    try {
      const res = await fetch('/api/quotes/fetch-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: webSource,
          topic: webTopic,
          customUrl: webSource === 'custom' ? customUrl.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ดึงข้อมูลไม่สำเร็จ');
      setFetchedQuotes(Array.isArray(data.quotes) ? data.quotes : []);
    } catch (err: unknown) {
      setWebError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setWebLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    const result = await syncNowToSupabase();
    setSyncMsg(result.message);
    setSyncing(false);
    handleLoadDbSummary();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importBackup(String(reader.result || ''));
      setImportStatus(ok ? 'นำเข้าข้อมูลเรียบร้อยแล้ว' : 'ไฟล์ JSON ไม่ถูกต้อง');
      setTimeout(() => setImportStatus(''), 4000);
    };
    reader.readAsText(file);
  };

  // Merge current local active profile into fallback person view if server hasn't synced yet
  const activeKey = state.ownerProfile?.userKey || 'owner-ping';
  const activeName = state.ownerProfile?.displayName || 'คุณปิ้ง';
  const serverPeople = dbSummary?.people || [];
  const currentFallbackPerson: AdminPersonRecord = {
    userKey: activeKey,
    displayName: activeName,
    roleNote: state.ownerProfile?.roleNote || 'เจ้าของบัญชีหลัก',
    updatedAt: new Date().toISOString(),
    stats: {
      todosCount: state.todos.length,
      pendingTodosCount: state.todos.filter((t) => !t.completed).length,
      routinesCount: state.weeklyRoutines.length,
      eventsCount: state.calendarEvents.length,
      sleepCount: state.sleepEntries.length,
      mealsCount: state.mealEntries.length,
      workoutsCount: state.workouts.length,
      cycleCount: state.cycleEntries.length,
      classesCount: state.classes.length,
      workTasksCount: state.workTasks.length,
      skillsCount: state.skills.length,
      notesCount: state.notes.length,
      ventsCount: state.vents.length,
      quotesCount: state.savedQuotes.length,
      pingLinksCount: state.pingLinks.length,
    },
    recentTodos: state.todos.slice(0, 5).map((t) => ({
      id: t.id,
      title: t.title,
      date: t.date,
      completed: t.completed,
      category: t.category,
    })),
    recentNotes: state.notes.slice(0, 5).map((n) => ({
      id: n.id,
      title: n.title,
      type: n.type,
      mood: n.mood,
      updatedAt: n.updatedAt,
    })),
    recentWork: state.workTasks.slice(0, 5).map((w) => ({
      id: w.id,
      title: w.title,
      dueDate: w.dueDate,
      status: w.status,
    })),
    savedQuotes: state.savedQuotes.slice(0, 12).map((q) => ({
      id: q.id,
      quote: q.quote,
      source_name: q.sourceName,
      created_at: q.createdAt,
    })),
    shareLinks: state.pingLinks.slice(0, 12).map((l) => ({
      slug: l.slug,
      friend_name: l.friendName,
      sender_name: l.senderName,
      message: l.message,
      owner_key: l.ownerKey || activeKey,
      owner_name: l.ownerName || activeName,
      created_at: l.createdAt,
    })),
  };

  const organizedPeople: AdminPersonRecord[] =
    serverPeople.length > 0
      ? serverPeople.some((p) => p.userKey === activeKey)
        ? serverPeople
        : [currentFallbackPerson, ...serverPeople]
      : [currentFallbackPerson];

  const visiblePeople =
    selectedPersonKey === 'all'
      ? organizedPeople
      : organizedPeople.filter((p) => p.userKey === selectedPersonKey);

  // Combine links from server + current state for comprehensive Admin view with owner labels
  const combinedShareLinks = (() => {
    const map = new Map<
      string,
      {
        id: string;
        slug: string;
        friendName: string;
        senderName: string;
        message: string;
        quoteText: string;
        ownerKey: string;
        ownerName: string;
      }
    >();
    for (const l of state.pingLinks) {
      map.set(l.slug, {
        id: l.id,
        slug: l.slug,
        friendName: l.friendName,
        senderName: l.senderName,
        message: l.message,
        quoteText: l.quoteText,
        ownerKey: l.ownerKey || activeKey,
        ownerName: l.ownerName || activeName,
      });
    }
    for (const sl of dbSummary?.shareLinks || []) {
      if (!map.has(sl.slug)) {
        map.set(sl.slug, {
          id: sl.slug,
          slug: sl.slug,
          friendName: sl.friend_name,
          senderName: sl.sender_name || 'ผู้ส่ง',
          message: sl.message,
          quoteText: '',
          ownerKey: sl.owner_key || 'owner-ping',
          ownerName: sl.owner_name || sl.sender_name || 'คุณปิ้ง',
        });
      }
    }
    return Array.from(map.values());
  })();

  const distinctLinkOwners = Array.from(
    new Map(combinedShareLinks.map((l) => [l.ownerKey, l.ownerName])).entries()
  );

  const filteredShareLinks =
    linkOwnerFilter === 'all'
      ? combinedShareLinks
      : combinedShareLinks.filter((l) => l.ownerKey === linkOwnerFilter);

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#FFF9FA] dark:bg-[#16121A] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Lock className="w-5 h-5" />
              <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100">
                เข้าสู่ระบบหลังบ้าน (เฉพาะผู้ดูแล)
              </h1>
            </div>
            <button
              type="button"
              onClick={onExitAdmin}
              className="text-xs font-semibold text-stone-500 hover:text-rose-600"
            >
              กลับหน้าผู้ใช้งาน
            </button>
          </div>

          <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            {passcodeRequired
              ? 'ระบบล็อกด้วยรหัสผู้ดูแล (OWNER_PASSCODE) เพื่อไม่ให้บุคคลอื่นหรือเพื่อนที่เปิดลิงก์ /ปิ้ง เห็นข้อมูลส่วนตัวของใครได้ ยกเว้นผู้ดูแลเท่านั้น'
              : 'ส่วนนี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบในการตรวจสอบข้อมูลแยกตามเจ้าของแต่ละคน (รหัสเริ่มต้น: 1234 — แนะนำให้ตั้ง OWNER_PASSCODE ใน Secrets)'}
          </p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder={passcodeRequired ? 'กรอกรหัสผ่านผู้ดูแลของคุณ' : 'กรอกรหัสผ่านผู้ดูแล (1234)'}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] font-mono"
            />
            {pinError && <p className="text-xs text-rose-600">{pinError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pinLoading}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl disabled:opacity-50"
              >
                {pinLoading ? 'กำลังตรวจสอบ...' : 'ปลดล็อกระบบหลังบ้าน'}
              </button>
              <button
                type="button"
                onClick={onExitAdmin}
                className="px-4 py-2.5 text-sm font-semibold text-stone-600 dark:text-stone-300 border border-rose-200/80 dark:border-rose-900/50 rounded-xl"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#141018] text-stone-800 dark:text-stone-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[#1F1926] border-b border-rose-200/70 dark:border-rose-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 shrink-0">
            <ShieldCheck className="w-5 h-5 text-rose-500" />
            <span className="text-base font-bold text-stone-800 dark:text-stone-100 whitespace-nowrap">
              Pinging Backoffice · ผู้ดูแลระบบ
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <button
              type="button"
              onClick={() => setTab('people')}
              className={`whitespace-nowrap ${
                tab === 'people'
                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              จัดระเบียบข้อมูลรายบุคคล
            </button>
            <button
              type="button"
              onClick={() => setTab('ping-links')}
              className={`whitespace-nowrap ${
                tab === 'ping-links'
                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              จัดการลิงก์ปิ้ง (/ปิ้ง)
            </button>
            <button
              type="button"
              onClick={() => setTab('quotes-cms')}
              className={`whitespace-nowrap ${
                tab === 'quotes-cms'
                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              จัดการคลังคำคมเว็บ
            </button>
            <button
              type="button"
              onClick={() => setTab('database')}
              className={`whitespace-nowrap ${
                tab === 'database'
                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              ฐานข้อมูล Supabase & สำรอง
            </button>
          </nav>

          <button
            type="button"
            onClick={onExitAdmin}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับหน้าคนใช้งาน</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-1">
          {(
            [
              ['people', 'ข้อมูลรายบุคคล'],
              ['ping-links', 'ลิงก์ปิ้ง (/ปิ้ง)'],
              ['quotes-cms', 'คลังคำคมเว็บ'],
              ['database', 'ฐานข้อมูล Supabase'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 ${
                tab === id
                  ? 'bg-rose-500 text-white'
                  : 'bg-white dark:bg-[#1F1926] border border-rose-200/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* TAB 1: Per-Person Organized Data View */}
        {tab === 'people' && (
          <div className="space-y-6">
            {/* Filter & Create Person Bar */}
            <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-rose-500" />
                    <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100">
                      ระบบจัดระเบียบข้อมูลแยกตามเจ้าของ (เฉพาะผู้ดูแล)
                    </h1>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    แยกแฟ้มข้อมูลของแต่ละคนอย่างชัดเจน พร้อมป้ายระบุว่าใครเป็นเจ้าของบันทึกและใครเป็นคนสร้างลิงก์ /ปิ้ง ส่งหาเพื่อน
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadDbSummary}
                  disabled={dbLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-rose-200/80 dark:border-rose-900/50 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 self-start shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${dbLoading ? 'animate-spin' : ''}`} />
                  <span>{dbLoading ? 'กำลังอัปเดต...' : 'รีเฟรชข้อมูลล่าสุด'}</span>
                </button>
              </div>

              {/* Person Selector Strip */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-100 dark:border-rose-900/30">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 mr-1">
                  เลือกดูตามเจ้าของข้อมูล:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPersonKey('all')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                    selectedPersonKey === 'all'
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'border-rose-200/80 dark:border-rose-900/50 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="tabular-nums">ทุกคน ({organizedPeople.length} คน)</span>
                </button>
                {organizedPeople.map((person) => (
                  <button
                    key={person.userKey}
                    type="button"
                    onClick={() => setSelectedPersonKey(person.userKey)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                      selectedPersonKey === person.userKey
                        ? 'bg-rose-500 border-rose-500 text-white'
                        : 'border-rose-200/80 dark:border-rose-900/50 text-stone-700 dark:text-stone-300 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                    }`}
                  >
                    {person.displayName} ({person.userKey})
                  </button>
                ))}
              </div>

              {/* Quick Create / Switch Person Workspace */}
              <form
                onSubmit={handleCreateAndSwitchPerson}
                className="pt-3 border-t border-rose-100 dark:border-rose-900/30 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center"
              >
                <input
                  type="text"
                  required
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="สร้าง/สลับโปรไฟล์ใหม่ เช่น น้องฟ้า, พี่มินท์"
                  className="md:col-span-5 px-3 py-2 text-xs rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
                <input
                  type="text"
                  value={newPersonKey}
                  onChange={(e) => setNewPersonKey(e.target.value)}
                  placeholder="รหัสอ้างอิง user_key (ไม่บังคับ เช่น fah)"
                  className="md:col-span-4 px-3 py-2 text-xs rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] font-mono"
                />
                <button
                  type="submit"
                  className="md:col-span-3 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>เพิ่ม / สลับโปรไฟล์</span>
                </button>
              </form>
              {personStatusMsg && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {personStatusMsg}
                </p>
              )}
            </div>

            {/* Per-Person Organized Folders */}
            <div className="space-y-5">
              {visiblePeople.map((person) => {
                const isActiveWorkspace = person.userKey === activeKey;
                return (
                  <section
                    key={person.userKey}
                    className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-5"
                  >
                    {/* Person Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-rose-100 dark:border-rose-900/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-base flex items-center justify-center shrink-0">
                          {person.displayName.slice(0, 1)}
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
                            เจ้าของข้อมูล: {person.displayName}
                          </h2>
                          <p className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                            รหัสประจำตัว: <span className="font-mono">{person.userKey}</span> ·{' '}
                            {person.roleNote || 'ผู้ใช้งานระบบ'} · อัปเดตล่าสุด{' '}
                            {new Date(person.updatedAt).toLocaleString('th-TH')}
                          </p>
                        </div>
                      </div>

                      {isActiveWorkspace ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 self-start sm:self-center">
                          <UserCheck className="w-4 h-4" />
                          <span>กำลังเปิดใช้งานบัญชีนี้</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            await switchUserProfile(person.userKey, person.displayName);
                            setPersonStatusMsg(`สลับไปใช้งานพื้นที่ของ “${person.displayName}” แล้ว`);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold border border-rose-200/80 dark:border-rose-900/50 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 self-start sm:self-center"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-rose-500" />
                          <span>สลับเข้าใช้งานบัญชีนี้</span>
                        </button>
                      )}
                    </div>

                    {/* 4-Category Summary Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30 space-y-1">
                        <p className="font-bold text-rose-600 dark:text-rose-400">
                          1. เวลา & รูทิน
                        </p>
                        <p className="text-stone-700 dark:text-stone-300 tabular-nums">
                          งาน {person.stats.todosCount} (ค้าง {person.stats.pendingTodosCount})
                        </p>
                        <p className="text-stone-500 tabular-nums">
                          รูทิน {person.stats.routinesCount} · นัดหมาย {person.stats.eventsCount}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30 space-y-1">
                        <p className="font-bold text-rose-600 dark:text-rose-400">
                          2. สุขภาพ & การนอน
                        </p>
                        <p className="text-stone-700 dark:text-stone-300 tabular-nums">
                          นอน {person.stats.sleepCount} · อาหาร {person.stats.mealsCount}
                        </p>
                        <p className="text-stone-500 tabular-nums">
                          ออกกำลังกาย {person.stats.workoutsCount} · รอบเดือน {person.stats.cycleCount}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30 space-y-1">
                        <p className="font-bold text-rose-600 dark:text-rose-400">
                          3. เรียน & งาน
                        </p>
                        <p className="text-stone-700 dark:text-stone-300 tabular-nums">
                          วิชาเรียน {person.stats.classesCount} · งาน {person.stats.workTasksCount}
                        </p>
                        <p className="text-stone-500 tabular-nums">
                          สกิลเสริม {person.stats.skillsCount} รายการ
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30 space-y-1">
                        <p className="font-bold text-rose-600 dark:text-rose-400">
                          4. บันทึก & ปิ้ง
                        </p>
                        <p className="text-stone-700 dark:text-stone-300 tabular-nums">
                          โน้ต {person.stats.notesCount} · ระบายใจ {person.stats.ventsCount}
                        </p>
                        <p className="text-stone-500 tabular-nums">
                          คำคม {person.stats.quotesCount} · ลิงก์ปิ้ง {person.stats.pingLinksCount}
                        </p>
                      </div>
                    </div>

                    {/* Person's Specific Items (Clearly labeled by owner) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-xl bg-[#FFFDFD] dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30 space-y-2.5">
                        <p className="font-bold text-stone-800 dark:text-stone-100">
                          บันทึกและรายการล่าสุดของ {person.displayName}
                        </p>
                        {person.recentTodos.length === 0 && person.recentNotes.length === 0 ? (
                          <p className="text-stone-400">ยังไม่มีรายการบันทึกในบัญชีนี้</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {person.recentTodos.slice(0, 3).map((t) => (
                              <li key={t.id} className="text-stone-700 dark:text-stone-300 truncate">
                                [งานของ {person.displayName}] {t.completed ? '✓' : '•'} {t.title}
                              </li>
                            ))}
                            {person.recentNotes.slice(0, 3).map((n) => (
                              <li key={n.id} className="text-stone-600 dark:text-stone-400 truncate">
                                [โน้ตของ {person.displayName}] {n.title}
                                {n.mood ? ` (${n.mood})` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="p-4 rounded-xl bg-[#FFFDFD] dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30 space-y-2.5">
                        <p className="font-bold text-stone-800 dark:text-stone-100">
                          ลิงก์ /ปิ้ง ที่ {person.displayName} สร้างส่งเพื่อน
                        </p>
                        {person.shareLinks.length === 0 ? (
                          <p className="text-stone-400">ยังไม่ได้สร้างลิงก์ส่งเพื่อน</p>
                        ) : (
                          <ul className="space-y-2">
                            {person.shareLinks.slice(0, 4).map((l) => (
                              <li
                                key={l.slug}
                                className="flex items-center justify-between gap-2 text-stone-700 dark:text-stone-300"
                              >
                                <span className="truncate">
                                  /ปิ้ง/{l.slug} · ส่งถึง {l.friend_name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onPreviewPingSlug(l.slug)}
                                  className="text-rose-600 dark:text-rose-400 font-semibold hover:underline shrink-0"
                                >
                                  เปิดดู
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: /ปิ้ง Share Links Manager */}
        {tab === 'ping-links' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-4 h-fit">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-rose-500" />
                <h2 className="text-base font-bold">สร้างลิงก์ชื่อ “ปิ้ง” (/ปิ้ง) ส่งให้เพื่อน</h2>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                ลิงก์จะถูกบันทึกในชื่อผู้สร้าง <span className="font-semibold text-stone-700 dark:text-stone-200">{activeName}</span> และแสดงให้เพื่อนเห็นเฉพาะการ์ดกำลังใจ ไม่เห็นข้อมูลส่วนตัวหรือระบบหลังบ้านใดๆ
              </p>

              <form onSubmit={handleCreatePingLink} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                    ชื่อลิงก์ต่อท้าย (/ปิ้ง/...)
                  </label>
                  <input
                    type="text"
                    required
                    value={slugInput}
                    onChange={(e) => setSlugInput(e.target.value)}
                    placeholder="เช่น ฟ้า, bestie"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                      ถึงเพื่อนชื่อ
                    </label>
                    <input
                      type="text"
                      required
                      value={friendName}
                      onChange={(e) => setFriendName(e.target.value)}
                      placeholder="เช่น ฟ้า, มิว"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                      ชื่อผู้ส่ง
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                    เลือกคำคมแนบไปกับลิงก์ปิ้ง
                  </label>
                  <select
                    value={selectedQuoteIdx}
                    onChange={(e) => setSelectedQuoteIdx(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  >
                    {state.savedQuotes.map((q, idx) => (
                      <option key={q.id} value={idx}>
                        [{q.sourceName}] {q.quote.slice(0, 55)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                    ข้อความทักทายถึงเพื่อน
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={pingMsg}
                    onChange={(e) => setPingMsg(e.target.value)}
                    placeholder="เช่น ส่งปิ้งกำลังใจให้วันนี้สอบผ่านฉลุยนะ!"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl"
                >
                  + สร้างลิงก์ปิ้ง
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold tabular-nums">
                  รายการลิงก์ปิ้งทั้งหมด ({filteredShareLinks.length})
                </h2>
                <select
                  value={linkOwnerFilter}
                  onChange={(e) => setLinkOwnerFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                >
                  <option value="all">ผู้สร้างทั้งหมด</option>
                  {distinctLinkOwners.map(([key, name]) => (
                    <option key={key} value={key}>
                      ของ {name} ({key})
                    </option>
                  ))}
                </select>
              </div>
              <div className="divide-y divide-rose-100 dark:divide-rose-900/30">
                {filteredShareLinks.map((link) => {
                  const fullUrl = buildShareUrl(link);
                  const canDeleteLocal = state.pingLinks.some((p) => p.id === link.id);
                  return (
                    <div key={link.slug} className="py-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-rose-500 dark:text-rose-400">
                            เจ้าของลิงก์: {link.ownerName} ({link.ownerKey}) → ส่งถึง: {link.friendName}
                          </p>
                          <p className="text-sm font-bold text-stone-800 dark:text-stone-100 mt-0.5">
                            /ปิ้ง/{link.slug}
                          </p>
                          <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                            {link.message}
                          </p>
                          {link.quoteText && (
                            <p className="text-xs text-stone-400 mt-1">
                              คำคม: “{link.quoteText}”
                            </p>
                          )}
                        </div>
                        {canDeleteLocal && (
                          <button
                            type="button"
                            onClick={() => deletePingLink(link.id)}
                            aria-label="ลบลิงก์"
                            className="p-1.5 text-stone-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCopyPing(link.slug, fullUrl)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500 text-white rounded-lg"
                        >
                          {copiedId === link.slug ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedId === link.slug ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์ส่งเพื่อน'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onPreviewPingSlug(link.slug)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-rose-200/80 dark:border-rose-900/50 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>เปิดดูหน้าเพื่อน</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Quotes CMS */}
        {tab === 'quotes-cms' && (
          <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold">
                จัดการคลังคำคมจากเว็บ (Wongnai Beauty, LINE TODAY, theAsianparent, Sale Here, Shopee Blog)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                ดึงคำคมเข้าสู่ระบบหลังบ้านของ <span className="font-semibold text-stone-700 dark:text-stone-200">{activeName}</span> โดยส่วนของผู้ดูแลจะเห็นทั้งที่มาและผู้บันทึกอย่างชัดเจน
              </p>
            </div>

            <form onSubmit={handleFetchWebQuotes} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {WEB_QUOTE_SOURCES.map((src) => (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => setWebSource(src.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border ${
                      webSource === src.id
                        ? 'bg-rose-500 border-rose-500 text-white'
                        : 'border-rose-200/80 dark:border-rose-900/50'
                    }`}
                  >
                    {src.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setWebSource('custom')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border ${
                    webSource === 'custom'
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'border-rose-200/80 dark:border-rose-900/50'
                  }`}
                >
                  วางลิงก์เว็บเอง (URL)
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {webSource === 'custom' ? (
                  <input
                    type="url"
                    required
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  />
                ) : (
                  <input
                    type="text"
                    value={webTopic}
                    onChange={(e) => setWebTopic(e.target.value)}
                    placeholder="คำค้นหา เช่น คำคมฮีลใจ แคปชั่นน่ารัก"
                    className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  />
                )}
                <button
                  type="submit"
                  disabled={webLoading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl disabled:opacity-50"
                >
                  <Globe className="w-4 h-4" />
                  <span>{webLoading ? 'กำลังดึงคำคม...' : 'ดึงคำคม'}</span>
                </button>
              </div>
            </form>

            {webError && <p className="text-xs text-rose-600">{webError}</p>}

            {fetchedQuotes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fetchedQuotes.map((fq, idx) => {
                  const saved = state.savedQuotes.some((s) => s.quote === fq.quote);
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-rose-50/50 dark:bg-[#141018] border border-rose-200/70 dark:border-rose-900/40 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-medium">“{fq.quote}”</p>
                        <p className="text-xs text-stone-500 mt-1">ที่มา: {fq.sourceName}</p>
                      </div>
                      <button
                        type="button"
                        disabled={saved}
                        onClick={() =>
                          saveWebQuote({
                            quote: fq.quote,
                            sourceName: fq.sourceName,
                            sourceUrl: fq.sourceUrl,
                            topic: webTopic,
                          })
                        }
                        className="self-end inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-rose-500 text-white rounded-lg disabled:opacity-50"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>{saved ? 'บันทึกแล้ว' : 'บันทึกเข้าคลัง'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-rose-100 dark:border-rose-900/30">
              <h3 className="text-sm font-bold mb-3 tabular-nums">
                คำคมที่บันทึกไว้ของ {activeName} ({state.savedQuotes.length})
              </h3>
              <ul className="divide-y divide-rose-100 dark:divide-rose-900/30">
                {state.savedQuotes.map((sq) => (
                  <li key={sq.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm">“{sq.quote}”</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        บันทึกโดย: {sq.ownerName || activeName} · ที่มา: {sq.sourceName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteWebQuote(sq.id)}
                      aria-label="ลบคำคม"
                      className="p-1.5 text-stone-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* TAB 4: Supabase Database, Single-Owner Privacy & Live DB Viewer */}
        {tab === 'database' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-rose-500" />
                  <h2 className="text-base font-bold">การเชื่อมต่อ & ความปลอดภัยเฉพาะผู้ดูแล</h2>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 dark:bg-[#141018]">
                    <span className="text-stone-600 dark:text-stone-300">การเชื่อมต่อ Supabase</span>
                    <span className={`font-semibold ${supabaseConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {supabaseConfigured ? 'เชื่อมต่อแล้ว' : 'ใช้จัดเก็บเซิร์ฟเวอร์ (แนะนำตั้งค่า Supabase)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 dark:bg-[#141018]">
                    <span className="text-stone-600 dark:text-stone-300">สิทธิ์เฉพาะ Server (SERVICE_ROLE_KEY)</span>
                    <span className={`font-semibold ${serviceRoleActive ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {serviceRoleActive ? 'เปิดใช้งานแล้ว (ปลอดภัยสูงสุด)' : 'แนะนำให้ใช้ SERVICE_ROLE_KEY'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 dark:bg-[#141018]">
                    <span className="text-stone-600 dark:text-stone-300">รหัสผ่านผู้ดูแล (OWNER_PASSCODE)</span>
                    <span className={`font-semibold ${passcodeRequired ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {passcodeRequired ? 'ล็อกส่วนตัวแล้ว' : 'ใช้รหัสเริ่มต้น 1234 (ควรตั้งใน Secrets)'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30 space-y-1.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  <p className="font-bold text-stone-800 dark:text-stone-100">
                    วิธีเชื่อมต่อให้ดูข้อมูลส่วนตัวได้เฉพาะผู้ดูแล:
                  </p>
                  <p>1. นำ SQL ด้านขวาไปรันใน Supabase SQL Editor (RLS จะปิดการอ่าน/เขียนข้อมูลส่วนตัวจากภายนอกทั้งหมด)</p>
                  <p>2. ตั้งค่าใน Settings &gt; Secrets: <span className="font-mono">SUPABASE_URL</span>, <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span>, <span className="font-mono">OWNER_PASSCODE</span> และ <span className="font-mono">OPENAI_API_KEY</span></p>
                  <p>3. เพื่อนที่เปิดลิงก์ <span className="font-mono">/ปิ้ง</span> จะไม่มีทางเห็นข้อมูลของเจ้าของบัญชีใดๆ เลย ดูได้เฉพาะผู้ดูแลในหน้าหลังบ้านนี้เท่านั้น</p>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={syncing}
                    onClick={handleManualSync}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>ซิงก์ข้อมูลของ {activeName} ตอนนี้</span>
                  </button>
                  <button
                    type="button"
                    disabled={dbLoading}
                    onClick={handleLoadDbSummary}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-xl"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{dbLoading ? 'กำลังโหลด...' : 'อัปเดตสรุปฐานข้อมูล'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportBackup}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-rose-200/80 dark:border-rose-900/50 rounded-xl"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ส่งออก JSON</span>
                  </button>
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-rose-200/80 dark:border-rose-900/50 rounded-xl cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>นำเข้า JSON</span>
                    <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={resetAllData}
                    className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                  >
                    รีเซ็ตข้อมูลเริ่มต้น
                  </button>
                </div>

                {syncMsg && <p className="text-xs font-semibold text-rose-600">{syncMsg}</p>}
                {importStatus && <p className="text-xs font-semibold text-emerald-600">{importStatus}</p>}
              </div>

              <div className="lg:col-span-6 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold">SQL สร้างตารางและล็อก RLS ส่วนตัว</h2>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SQL_SNIPPET);
                      setSqlCopied(true);
                      setTimeout(() => setSqlCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-rose-500 text-white rounded-lg shrink-0"
                  >
                    {sqlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{sqlCopied ? 'คัดลอก SQL แล้ว' : 'คัดลอก SQL'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-stone-900 text-stone-100 text-[11px] font-mono overflow-x-auto leading-relaxed max-h-[360px]">
                  {SUPABASE_SQL_SNIPPET}
                </pre>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold">
                ตารางข้อมูลทั้งหมดแยกตามผู้ใช้งาน (เฉพาะผู้ดูแล)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30 space-y-1.5">
                  <p className="font-bold text-stone-800 dark:text-stone-100">
                    บัญชีผู้ใช้ ({organizedPeople.length})
                  </p>
                  {organizedPeople.map((st) => (
                    <p key={st.userKey} className="text-stone-600 dark:text-stone-300 tabular-nums">
                      <span className="font-semibold">{st.displayName}</span> ({st.userKey}) · งาน {st.stats.todosCount} · โน้ต {st.stats.notesCount}
                    </p>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30 space-y-1.5">
                  <p className="font-bold text-stone-800 dark:text-stone-100">
                    คำคมที่บันทึก ({dbSummary?.savedQuotes?.length ?? state.savedQuotes.length})
                  </p>
                  {(dbSummary?.savedQuotes && dbSummary.savedQuotes.length > 0
                    ? dbSummary.savedQuotes
                    : state.savedQuotes.map((q) => ({
                        id: q.id,
                        user_key: q.ownerName || activeName,
                        quote: q.quote,
                        source_name: q.sourceName,
                      }))
                  )
                    .slice(0, 5)
                    .map((q) => (
                      <p key={q.id} className="text-stone-600 dark:text-stone-300 truncate">
                        [{q.user_key || activeName} · {q.source_name}] {q.quote}
                      </p>
                    ))}
                </div>
                <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30 space-y-1.5">
                  <p className="font-bold text-stone-800 dark:text-stone-100">
                    ลิงก์ปิ้ง ({combinedShareLinks.length})
                  </p>
                  {combinedShareLinks.slice(0, 5).map((l) => (
                    <p key={l.slug} className="text-stone-600 dark:text-stone-300 truncate">
                      {l.ownerName} → {l.friendName} (/ปิ้ง/{l.slug})
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
