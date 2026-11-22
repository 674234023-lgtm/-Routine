import React, { useState } from 'react';
import {
  Bell,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  Globe,
  HeartHandshake,
  Link2,
  NotebookPen,
  Pin,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { CareSubTab, NoteType, ReminderCategory } from '../types.ts';
import { generateId, getTodayISO } from '../utils/date.ts';
import { useOneMinuteQuoteRotation } from '../utils/useQuoteRotation.ts';

interface NotesCareViewProps {
  subTab: CareSubTab;
  onChangeSubTab: (tab: CareSubTab) => void;
  onOpenPingSlug?: (slug: string) => void;
}

const HEALING_QUOTES = [
  {
    quote: 'เธอไม่จำเป็นต้องเก่งทุกวัน และไม่จำเป็นต้องสมบูรณ์แบบเพื่อให้มีคุณค่า',
    reflection: 'อนุญาตให้ตัวเองได้พักเมื่อเหนื่อย และเริ่มต้นใหม่ได้เสมอในจังหวะของตัวเอง',
  },
  {
    quote: 'พายุไม่ได้อยู่กับเราตลอดไป แค่ประคองหัวใจผ่านวันนี้ไปให้ได้ก็เก่งมากแล้ว',
    reflection: 'ความรู้สึกหนักอึ้งตอนนี้เป็นเพียงฤดูกาลหนึ่ง เดี๋ยวมันจะค่อยๆ คลี่คลาย',
  },
  {
    quote: 'อย่าเปรียบเทียบก้าวเดินของตัวเองกับใคร เพราะเส้นทางและเวลาของแต่ละคนไม่เหมือนกัน',
    reflection: 'โฟกัสแค่สิ่งเล็กๆ ที่ทำได้ในวันนี้ แล้วชื่นชมตัวเองที่ยังพยายามอยู่เสมอ',
  },
];

const WEB_QUOTE_SOURCES = [
  { id: 'wongnai', label: 'Wongnai Beauty' },
  { id: 'linetoday', label: 'LINE TODAY' },
  { id: 'asianparent', label: 'theAsianparent Thailand' },
  { id: 'salehere', label: 'Sale Here' },
  { id: 'shopee', label: 'Shopee Blog' },
] as const;

interface FetchedQuoteResult {
  quote: string;
  note?: string;
  sourceName: string;
  sourceUrl?: string;
}

export const NotesCareView: React.FC<NotesCareViewProps> = ({
  subTab,
  onChangeSubTab,
  onOpenPingSlug,
}) => {
  const {
    state,
    addNote,
    updateNote,
    deleteNote,
    addVent,
    deleteVent,
    appendChatMessages,
    clearChat,
    saveWebQuote,
    deleteWebQuote,
    createPingLink,
    addReminder,
    toggleReminder,
    deleteReminder,
    pushNotification,
    toggleSound,
  } = useAppStore();

  // --- Notes state ---
  const [noteType, setNoteType] = useState<NoteType>('diary');
  const [noteFilter, setNoteFilter] = useState<'all' | NoteType>('all');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteUrl, setNoteUrl] = useState('');
  const [noteMood, setNoteMood] = useState('สบายใจ');
  const [noteSearch, setNoteSearch] = useState('');

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteContent.trim()) return;
    addNote({
      type: noteType,
      title: noteTitle.trim() || 'บันทึกไม่มีหัวข้อ',
      content: noteContent.trim(),
      url: noteUrl.trim() || undefined,
      mood: noteType === 'diary' ? noteMood : undefined,
      pinned: false,
    });
    setNoteTitle('');
    setNoteContent('');
    setNoteUrl('');
  };

  // --- Support / Care / Web Quote Fetcher ---
  const [bannerError, setBannerError] = useState(false);
  const [aiQuote, setAiQuote] = useState<{
    quote: string;
    reflection: string;
    gentleAction: string;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  const healingPool = [
    ...state.savedQuotes.map((q) => ({
      quote: q.quote,
      reflection: q.note || `คำคมบันทึกจาก ${q.sourceName}`,
      source: q.sourceName,
    })),
    ...HEALING_QUOTES.map((h) => ({ ...h, source: 'Pinging Your Day' })),
  ];
  const {
    activeIndex: quoteIdx,
    formattedCountdown: quoteCountdown,
    nextQuote: advanceQuote,
    resetTimer: resetQuoteTimer,
  } = useOneMinuteQuoteRotation(healingPool.length);

  React.useEffect(() => {
    setAiQuote(null);
  }, [quoteIdx]);

  const activePoolQuote = healingPool[quoteIdx] || {
    ...HEALING_QUOTES[0],
    source: 'Pinging Your Day',
  };

  const [webSource, setWebSource] = useState<string>('wongnai');
  const [webTopic, setWebTopic] = useState('คำคมฮีลใจ กำลังใจ รักตัวเอง');
  const [customUrl, setCustomUrl] = useState('');
  const [webLoading, setWebLoading] = useState(false);
  const [webError, setWebError] = useState('');
  const [fetchedQuotes, setFetchedQuotes] = useState<FetchedQuoteResult[]>([]);
  const [fetchedSources, setFetchedSources] = useState<Array<{ title: string; uri: string }>>([]);

  const [currentMood, setCurrentMood] = useState('เหนื่อยล้า');
  const [consultTopic, setConsultTopic] = useState('ฮีลใจ & เติมพลัง');
  const [chatProvider, setChatProvider] = useState<'auto' | 'chatgpt'>('auto');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');

  const [ventInput, setVentInput] = useState('');
  const [ventMood, setVentMood] = useState('หนักใจ');
  const [ventReleasedMsg, setVentReleasedMsg] = useState('');

  // --- Quick Ping Share state ---
  const [pingFriend, setPingFriend] = useState('');
  const [pingGreeting, setPingGreeting] = useState('');
  const [pingQuoteText, setPingQuoteText] = useState('');
  const [pingShareUrl, setPingShareUrl] = useState('');
  const [pingShareSlug, setPingShareSlug] = useState('');
  const [pingCopied, setPingCopied] = useState(false);

  const handleQuickCreatePing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pingFriend.trim()) return;
    const chosenQuote =
      pingQuoteText.trim() ||
      aiQuote?.quote ||
      activePoolQuote.quote;
    const chosenSource = pingQuoteText.trim()
      ? state.savedQuotes.find((q) => q.quote === pingQuoteText.trim())?.sourceName || 'Pinging Your Day'
      : aiQuote
      ? 'น้องปิ้ง AI'
      : state.savedQuotes[0]?.sourceName || 'Pinging Your Day';

    const created = createPingLink({
      slug: pingFriend.trim(),
      friendName: pingFriend.trim(),
      senderName: state.ownerProfile?.displayName || 'เพื่อนของคุณ',
      message:
        pingGreeting.trim() || 'แวะมาส่งปิ้งกำลังใจให้วันนี้ใจดีกับเธอนะ',
      quoteText: chosenQuote,
      quoteSource: chosenSource,
      ownerKey: state.ownerProfile?.userKey,
      ownerName: state.ownerProfile?.displayName,
    });
    setPingShareSlug(created.slug);
    setPingShareUrl(`${window.location.origin}/ปิ้ง/${created.slug}`);
  };

  const handleGenerateAiQuote = async () => {
    setQuoteLoading(true);
    setQuoteError('');
    try {
      const res = await fetch('/api/care/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: currentMood, provider: chatProvider }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถสร้างคำคมได้');
      }
      setAiQuote(data);
      resetQuoteTimer();
    } catch (err: unknown) {
      setQuoteError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setQuoteLoading(false);
    }
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
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถดึงคำคมจากเว็บได้');
      }
      setFetchedQuotes(Array.isArray(data.quotes) ? data.quotes : []);
      setFetchedSources(Array.isArray(data.sources) ? data.sources : []);
      if (!data.quotes || data.quotes.length === 0) {
        setWebError('ไม่พบข้อความคำคมที่ชัดเจนจากหน้านี้ ลองเปลี่ยนหัวข้อหรือวางลิงก์บทความโดยตรงได้เลย');
      }
    } catch (err: unknown) {
      setWebError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงคำคม');
    } finally {
      setWebLoading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = {
      id: generateId(),
      role: 'user' as const,
      text: chatInput.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextHistory = [...state.chatMessages, userMsg];
    appendChatMessages([userMsg]);
    setChatInput('');
    setChatLoading(true);
    setChatError('');

    try {
      const res = await fetch('/api/care/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          mood: currentMood,
          topic: consultTopic,
          provider: chatProvider,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถรับข้อความตอบกลับได้');
      }
      appendChatMessages([
        {
          id: generateId(),
          role: 'model',
          text: data.reply,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setChatLoading(false);
    }
  };

  const handleSaveVent = () => {
    if (!ventInput.trim()) return;
    addVent(ventInput.trim(), ventMood);
    setVentInput('');
    setVentReleasedMsg('เก็บความรู้สึกไว้ในพื้นที่ปลอดภัยเรียบร้อยแล้ว');
    setTimeout(() => setVentReleasedMsg(''), 3500);
  };

  const handleReleaseVent = () => {
    if (!ventInput.trim()) return;
    setVentInput('');
    setVentReleasedMsg('ปล่อยวางความกังวลเหล่านั้นออกไปแล้ว หายใจเข้าลึกๆ นะ');
    setTimeout(() => setVentReleasedMsg(''), 4000);
  };

  // --- Notifications state ---
  const [remTitle, setRemTitle] = useState('');
  const [remCat, setRemCat] = useState<ReminderCategory>('water');
  const [remTime, setRemTime] = useState('14:00');
  const [remRepeat, setRemRepeat] = useState<'daily' | 'weekdays' | 'once'>('daily');
  const [browserPerm, setBrowserPerm] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setBrowserPerm(perm);
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim()) return;
    addReminder({
      title: remTitle.trim(),
      category: remCat,
      time: remTime,
      repeat: remRepeat,
      onceDate: remRepeat === 'once' ? getTodayISO() : undefined,
      enabled: true,
    });
    setRemTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">
            Notes, Care & Reminders
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            สมุดโน้ตและไดอารี่ คลังคำคมจากเว็บโปรด ส่งลิงก์ปิ้งหาเพื่อน น้องปิ้งคู่คิด และแจ้งเตือนส่วนตัว
          </p>
        </div>

        <div className="inline-flex max-w-full overflow-x-auto p-1 bg-rose-50 dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-xl self-start">
          {(
            [
              ['notes', 'จดโน้ต & ไดอารี่'],
              ['support', 'คำคม & คู่คิดฮีลใจ'],
              ['notifications', 'แจ้งเตือนของฉัน'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onChangeSubTab(id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                subTab === id
                  ? 'bg-white dark:bg-rose-500 text-rose-700 dark:text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: Notes, Diary & Links */}
      {subTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <NotebookPen className="w-4 h-4 text-rose-500" />
              <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
                เขียนบันทึกใหม่
              </h2>
            </div>

            <form onSubmit={handleAddNote} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['diary', 'ไดอารี่'],
                    ['general', 'บันทึกทั่วไป'],
                    ['link', 'แปะลิงก์'],
                  ] as const
                ).map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNoteType(t)}
                    className={`py-2 text-xs font-semibold rounded-xl border ${
                      noteType === t
                        ? 'bg-rose-500 border-rose-500 text-white'
                        : 'border-rose-200/80 dark:border-rose-900/50 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                  หัวข้อบันทึก
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="ตั้งชื่อบันทึกสั้นๆ"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              {noteType === 'diary' && (
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                    ความรู้สึกวันนี้
                  </label>
                  <select
                    value={noteMood}
                    onChange={(e) => setNoteMood(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  >
                    <option value="สบายใจ">สบายใจ / ผ่อนคลาย</option>
                    <option value="ภูมิใจ">ภูมิใจในตัวเอง</option>
                    <option value="สงบใจ">สงบ / เรียบง่าย</option>
                    <option value="เหนื่อยล้า">เหนื่อยล้า / อยากพัก</option>
                    <option value="กังวล">กังวล / สับสน</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                  ลิงก์ที่แนบ (ถ้ามี)
                </label>
                <input
                  type="url"
                  value={noteUrl}
                  onChange={(e) => setNoteUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                  เนื้อหา
                </label>
                <textarea
                  rows={5}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="เขียนสิ่งที่เกิดขึ้น ความคิด หรือสิ่งดีๆ ในวันนี้..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>บันทึกโน้ต</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <input
                type="text"
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                placeholder="ค้นหาบันทึก..."
                className="flex-1 min-w-[180px] px-3 py-1.5 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
              />
              <div className="inline-flex p-1 bg-rose-50 dark:bg-[#141018] rounded-xl">
                {(
                  [
                    ['all', 'ทั้งหมด'],
                    ['diary', 'ไดอารี่'],
                    ['general', 'ทั่วไป'],
                    ['link', 'ลิงก์'],
                  ] as const
                ).map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNoteFilter(t)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap ${
                      noteFilter === t
                        ? 'bg-white dark:bg-rose-500 text-rose-700 dark:text-white shadow-sm'
                        : 'text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {state.notes
              .filter((n) => noteFilter === 'all' || n.type === noteFilter)
              .filter(
                (n) =>
                  !noteSearch.trim() ||
                  n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
                  n.content.toLowerCase().includes(noteSearch.toLowerCase())
              )
              .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
              .map((note) => (
                <article
                  key={note.id}
                  className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-stone-800 dark:text-stone-100">
                        {note.title}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                        {note.type === 'diary'
                          ? 'ไดอารี่'
                          : note.type === 'link'
                          ? 'คลังลิงก์'
                          : 'บันทึกทั่วไป'}
                        {note.mood ? ` · อารมณ์: ${note.mood}` : ''} ·{' '}
                        {new Date(note.updatedAt).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateNote(note.id, { pinned: !note.pinned })}
                        aria-label="ปักหมุด"
                        className={`p-1.5 rounded-lg ${
                          note.pinned
                            ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50'
                            : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteNote(note.id)}
                        aria-label="ลบบันทึก"
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                  {note.url && (
                    <a
                      href={note.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                    >
                      <span>{note.url}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </article>
              ))}
          </div>
        </div>
      )}

      {/* TAB 2: Web Quotes + Encouragement + AI Companion + Private Vent */}
      {subTab === 'support' && (
        <div className="space-y-6">
          {/* Calm Sanctuary Banner + Daily Healing Quote */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-rose-200/70 dark:border-rose-900/40 bg-rose-50 dark:bg-[#1F1926] min-h-[200px]">
              {!bannerError ? (
                <img
                  src="/src/assets/images/cute_care_corner_1795071516737.jpg"
                  alt="มุมหน้าต่างอบอุ่นพร้อมน้องแมวหลับและถ้วยชาร้อน"
                  referrerPolicy="no-referrer"
                  onError={() => setBannerError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-rose-50 to-amber-50 dark:from-[#1F1926] dark:to-[#292033]">
                  <HeartHandshake className="w-8 h-8 text-rose-500 mb-2" />
                  <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                    พื้นที่พักใจส่วนตัว
                  </p>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-rose-500 dark:text-rose-400">
                      โควทคำคมฮีลใจ{aiQuote ? ' · น้องปิ้ง AI' : ''}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-stone-400">
                      เปลี่ยนทุก 1 นาที ({quoteCountdown})
                    </span>
                  </div>
                  <select
                    value={currentMood}
                    onChange={(e) => setCurrentMood(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  >
                    <option value="เหนื่อยล้า">กำลังเหนื่อยล้า</option>
                    <option value="กังวล">กังวลเรื่องเรียน/งาน</option>
                    <option value="ท้อแท้">รู้สึกท้อใจ</option>
                    <option value="เหงา">เหงา / ต้องการเพื่อนคุย</option>
                    <option value="สงบ">อยากเติมพลังบวก</option>
                  </select>
                </div>

                {aiQuote ? (
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-stone-800 dark:text-stone-100 leading-relaxed">
                      “{aiQuote.quote}”
                    </p>
                    <p className="text-sm text-stone-600 dark:text-stone-300">{aiQuote.reflection}</p>
                    <p className="text-xs text-rose-600 dark:text-rose-400 pt-1">
                      สิ่งเล็กๆ ที่ลองทำได้ใน 5 นาที: {aiQuote.gentleAction}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-stone-800 dark:text-stone-100 leading-relaxed">
                      “{activePoolQuote.quote}”
                    </p>
                    <p className="text-sm text-stone-600 dark:text-stone-300">
                      {activePoolQuote.reflection}
                    </p>
                  </div>
                )}

                {quoteError && (
                  <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{quoteError}</p>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-rose-100 dark:border-rose-900/30 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAiQuote(null);
                    advanceQuote();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>เปลี่ยนคำคม</span>
                </button>
                <button
                  type="button"
                  disabled={quoteLoading}
                  onClick={handleGenerateAiQuote}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{quoteLoading ? 'กำลังเรียบเรียง...' : 'ขอกำลังใจเฉพาะอารมณ์ตอนนี้'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Web Quote Collector (Wongnai Beauty, LINE TODAY, theAsianparent, Sale Here, Shopee Blog, Custom URL) */}
          <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-rose-500" />
                  <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
                    ดึงคำคมจากเว็บอื่นมาใช้ในแอป
                  </h2>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  เลือกเว็บยอดนิยม (Wongnai Beauty, LINE TODAY, theAsianparent Thailand, Sale Here, Shopee Blog) หรือวางลิงก์บทความที่ชอบแล้วบันทึกเก็บไว้ได้เลย
                </p>
              </div>
            </div>

            <form onSubmit={handleFetchWebQuotes} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {WEB_QUOTE_SOURCES.map((src) => (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => setWebSource(src.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                      webSource === src.id
                        ? 'bg-rose-500 border-rose-500 text-white'
                        : 'border-rose-200/80 dark:border-rose-900/50 text-stone-600 dark:text-stone-300 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                    }`}
                  >
                    {src.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setWebSource('custom')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                    webSource === 'custom'
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'border-rose-200/80 dark:border-rose-900/50 text-stone-600 dark:text-stone-300 hover:bg-rose-50 dark:hover:bg-rose-950/30'
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
                    placeholder="วางลิงก์บทความ เช่น https://www.wongnai.com/... หรือ https://salehere.co.th/..."
                    className="flex-1 min-w-0 px-3.5 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  />
                ) : (
                  <input
                    type="text"
                    value={webTopic}
                    onChange={(e) => setWebTopic(e.target.value)}
                    placeholder="หัวข้อคำคมที่อยากค้นหา เช่น คำคมฮีลใจ, แคปชั่นน่ารัก, กำลังใจทำงาน"
                    className="flex-1 min-w-0 px-3.5 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  />
                )}
                <button
                  type="submit"
                  disabled={webLoading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Globe className="w-4 h-4" />
                  <span>{webLoading ? 'กำลังดึงคำคม...' : 'ดึงคำคมจากเว็บ'}</span>
                </button>
              </div>
            </form>

            {webError && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{webError}</p>
            )}

            {fetchedQuotes.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                  คำคมที่ดึงมาได้ (กดบันทึกเพื่อเก็บไว้ใช้ในแอป)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fetchedQuotes.map((fq, idx) => {
                    const alreadySaved = state.savedQuotes.some((sq) => sq.quote === fq.quote);
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-rose-50/50 dark:bg-[#141018] border border-rose-200/70 dark:border-rose-900/40 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-stone-800 dark:text-stone-100 leading-relaxed">
                            “{fq.quote}”
                          </p>
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5">
                            ที่มา: {fq.sourceName}
                            {fq.note ? ` · ${fq.note}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-rose-100 dark:border-rose-900/30">
                          {fq.sourceUrl ? (
                            <a
                              href={fq.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline truncate"
                            >
                              <span>เปิดเว็บต้นทาง</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span />
                          )}
                          <button
                            type="button"
                            disabled={alreadySaved}
                            onClick={() =>
                              saveWebQuote({
                                quote: fq.quote,
                                sourceName: fq.sourceName,
                                sourceUrl: fq.sourceUrl,
                                topic: webTopic,
                                note: fq.note,
                              })
                            }
                            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                              alreadySaved
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-500 hover:bg-rose-600 text-white'
                            }`}
                          >
                            <Bookmark className="w-3 h-3" />
                            <span>{alreadySaved ? 'บันทึกแล้ว' : 'เก็บไว้ใช้'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {fetchedSources.length > 0 && (
                  <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-wrap items-center gap-2 pt-1">
                    <span>แหล่งอ้างอิงจากเว็บ:</span>
                    {fetchedSources.map((s, i) => (
                      <a
                        key={i}
                        href={s.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        {s.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Saved Quotes Collection */}
            <div className="pt-4 border-t border-rose-100 dark:border-rose-900/30">
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-3">
                คลังคำคมที่บันทึกไว้ ({state.savedQuotes.length})
              </h3>
              {state.savedQuotes.length === 0 ? (
                <p className="text-xs text-stone-500">ยังไม่มีคำคมที่บันทึกไว้</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {state.savedQuotes.map((sq) => (
                    <div
                      key={sq.id}
                      className="p-4 rounded-xl bg-[#FFFDFD] dark:bg-[#141018] border border-rose-200/70 dark:border-rose-900/40 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
                          “{sq.quote}”
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          <span className="text-xs text-stone-500 dark:text-stone-400">
                            {sq.sourceName}
                          </span>
                          {sq.sourceUrl && (
                            <a
                              href={sq.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
                            >
                              ลิงก์ต้นทาง
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setPingQuoteText(sq.quote)}
                            className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                          >
                            ใช้คำคมนี้ส่งปิ้งให้เพื่อน
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteWebQuote(sq.id)}
                        aria-label="ลบคำคมที่บันทึก"
                        className="p-1 text-stone-400 hover:text-rose-600 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Share /ปิ้ง Link to Friends */}
          <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-rose-500" />
                  <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
                    ส่งลิงก์ชื่อ “ปิ้ง” (/ปิ้ง) หาเพื่อน
                  </h2>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  สร้างลิงก์การ์ดคำคมน่ารักๆ ชื่อ /ปิ้ง/ชื่อเพื่อน เพื่อส่งต่อให้เพื่อนเปิดอ่านโดยไม่เห็นข้อมูลส่วนตัว ระบบหลังบ้าน หรือที่มาของคำคม
                </p>
              </div>
              {onOpenPingSlug && (
                <button
                  type="button"
                  onClick={() => onOpenPingSlug('ปิ้ง')}
                  className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline whitespace-nowrap shrink-0"
                >
                  ดูตัวอย่างหน้า /ปิ้ง
                </button>
              )}
            </div>

            <form onSubmit={handleQuickCreatePing} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <input
                type="text"
                required
                value={pingFriend}
                onChange={(e) => setPingFriend(e.target.value)}
                placeholder="ชื่อเพื่อน (เช่น fah, bestie)"
                className="md:col-span-3 px-3.5 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
              />
              <input
                type="text"
                value={pingGreeting}
                onChange={(e) => setPingGreeting(e.target.value)}
                placeholder="ข้อความทักทายเพื่อน (เช่น วันนี้สู้ๆ นะ)"
                className="md:col-span-6 px-3.5 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
              />
              <button
                type="submit"
                className="md:col-span-3 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl whitespace-nowrap"
              >
                <Link2 className="w-4 h-4" />
                <span>สร้างลิงก์ปิ้ง</span>
              </button>
            </form>

            {pingQuoteText && (
              <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-rose-50/70 dark:bg-[#141018] text-xs text-stone-600 dark:text-stone-300">
                <span className="truncate">คำคมที่เลือกแนบ: “{pingQuoteText}”</span>
                <button
                  type="button"
                  onClick={() => setPingQuoteText('')}
                  className="text-rose-600 hover:underline shrink-0"
                >
                  เปลี่ยนกลับเป็นอัตโนมัติ
                </button>
              </div>
            )}

            {pingShareUrl && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-[#141018] border border-rose-200/70 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-mono text-stone-700 dark:text-stone-200 truncate">
                  {pingShareUrl}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pingShareUrl);
                      setPingCopied(true);
                      setTimeout(() => setPingCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500 text-white rounded-lg"
                  >
                    {pingCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{pingCopied ? 'คัดลอกแล้ว' : 'คัดลอกส่งเพื่อน'}</span>
                  </button>
                  {onOpenPingSlug && pingShareSlug && (
                    <button
                      type="button"
                      onClick={() => onOpenPingSlug(pingShareSlug)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-rose-200/80 dark:border-rose-900/50 rounded-lg"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>เปิดดู</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* AI Companion & ChatGPT Life Consultation */}
            <div className="lg:col-span-7 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 flex flex-col min-h-[540px]">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-rose-100 dark:border-rose-900/30">
                <div>
                  <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
                    น้องปิ้ง AI (ChatGPT) · ฮีลใจ & ปรึกษาเรื่องต่างๆ
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    ขอกำลังใจ ระบายความรู้สึก หรือปรึกษาเรื่องเรียน งาน ความรัก และการใช้ชีวิต
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={chatProvider}
                    onChange={(e) => setChatProvider(e.target.value as 'auto' | 'chatgpt')}
                    aria-label="เลือกระบบ AI"
                    className="px-2.5 py-1 text-xs rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  >
                    <option value="auto">อัตโนมัติ (ChatGPT / AI)</option>
                    <option value="chatgpt">ChatGPT (OpenAI)</option>
                  </select>
                  <button
                    type="button"
                    onClick={clearChat}
                    className="text-xs text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 whitespace-nowrap"
                  >
                    เริ่มคุยใหม่
                  </button>
                </div>
              </div>

              {/* Consultation Topics & Quick Starters */}
              <div className="pt-3 pb-2 space-y-2 border-b border-rose-100/70 dark:border-rose-900/20">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    'ฮีลใจ & เติมพลัง',
                    'เรื่องเรียน & งาน',
                    'ความรัก & ความสัมพันธ์',
                    'ครอบครัว & เพื่อน',
                    'ความเครียด & การนอน',
                    'วางแผน & ตัดสินใจ',
                  ].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setConsultTopic(t)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
                        consultTopic === t
                          ? 'bg-rose-500 border-rose-500 text-white'
                          : 'border-rose-200/80 dark:border-rose-900/50 text-stone-600 dark:text-stone-300 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'วันนี้เหนื่อยมาก ขอกำลังใจหน่อย',
                    'งานเยอะจนท้อ ช่วยจัดลำดับทีละขั้นหน่อย',
                    'มีเรื่องไม่สบายใจ อยากระบายและขอคำแนะนำ',
                  ].map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => setChatInput(starter)}
                      className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline px-1.5 py-0.5"
                    >
                      + {starter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 max-h-[300px]">
                {state.chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-rose-500 text-white'
                          : 'bg-rose-50 dark:bg-[#141018] text-stone-800 dark:text-stone-200 border border-rose-100 dark:border-rose-900/30'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-2.5 text-xs bg-rose-50 dark:bg-[#141018] text-stone-500">
                      น้องปิ้งกำลังตั้งใจอ่านและพิมพ์ตอบกลับนะ...
                    </div>
                  </div>
                )}
              </div>

              {chatError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mb-2">{chatError}</p>
              )}

              <form onSubmit={handleSendChat} className="pt-3 border-t border-rose-100 dark:border-rose-900/30 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`ปรึกษาเรื่อง "${consultTopic}" หรือพิมพ์สิ่งที่อยากเล่าได้เลย...`}
                  className="flex-1 min-w-0 px-3.5 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>ส่ง</span>
                </button>
              </form>
            </div>

            {/* Private Vent Box */}
            <div className="lg:col-span-5 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
                  พื้นที่พิมพ์ระบายความรู้สึกส่วนตัว
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  เขียนระบายสิ่งที่อึดอัดออกมาทั้งหมด แล้วเลือกเก็บไว้ทบทวนหรือปล่อยวางทิ้งไปเลยก็ได้
                </p>

                <select
                  value={ventMood}
                  onChange={(e) => setVentMood(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                >
                  <option value="หนักใจ">หนักใจ / กดดัน</option>
                  <option value="เศร้า">เศร้า / น้อยใจ</option>
                  <option value="หงุดหงิด">หงุดหงิด / โกรธ</option>
                  <option value="สับสน">สับสน / ไม่แน่ใจ</option>
                </select>

                <textarea
                  rows={5}
                  value={ventInput}
                  onChange={(e) => setVentInput(e.target.value)}
                  placeholder="พิมพ์ทุกอย่างที่อยู่ในใจออกมาได้เลย ไม่มีใครตัดสิน..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />

                {ventReleasedMsg && (
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {ventReleasedMsg}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSaveVent}
                    className="py-2 text-xs font-semibold rounded-xl border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-stone-700 dark:text-stone-200"
                  >
                    เก็บไว้ส่วนตัว
                  </button>
                  <button
                    type="button"
                    onClick={handleReleaseVent}
                    className="py-2 text-xs font-semibold rounded-xl bg-rose-500 hover:bg-rose-600 text-white"
                  >
                    ปล่อยวางความรู้สึกนี้
                  </button>
                </div>
              </div>

              {state.vents.length > 0 && (
                <div className="pt-4 border-t border-rose-100 dark:border-rose-900/30 max-h-44 overflow-y-auto space-y-2">
                  <p className="text-xs font-medium text-stone-500">บันทึกความรู้สึกที่เก็บไว้</p>
                  {state.vents.map((v) => (
                    <div
                      key={v.id}
                      className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap">
                          {v.text}
                        </p>
                        <p className="text-[11px] text-stone-400 mt-1 tabular-nums">
                          {v.mood} · {new Date(v.createdAt).toLocaleString('th-TH')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteVent(v.id)}
                        aria-label="ลบข้อความระบาย"
                        className="p-1 text-stone-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Notifications & System */}
      {subTab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-5 h-fit">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-rose-500" />
              <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
                สร้างการแจ้งเตือนใหม่ (ทุกหมวดหมู่)
              </h2>
            </div>

            <form onSubmit={handleAddReminder} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                  ข้อความแจ้งเตือน
                </label>
                <input
                  type="text"
                  required
                  value={remTitle}
                  onChange={(e) => setRemTitle(e.target.value)}
                  placeholder="เช่น เตือนกินน้ำ, เตือนเข้านอน, ส่งงานก่อนเที่ยงคืน"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={remCat}
                    onChange={(e) => setRemCat(e.target.value as ReminderCategory)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  >
                    <option value="water">ดื่มน้ำ</option>
                    <option value="sleep">การนอน</option>
                    <option value="meal">มื้ออาหาร / ยา</option>
                    <option value="study">การเรียน</option>
                    <option value="work">เดดไลน์งาน</option>
                    <option value="workout">ออกกำลังกาย</option>
                    <option value="general">ทั่วไป</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                    เวลาเตือน
                  </label>
                  <input
                    type="time"
                    required
                    value={remTime}
                    onChange={(e) => setRemTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                  ความถี่ในการเตือน
                </label>
                <select
                  value={remRepeat}
                  onChange={(e) => setRemRepeat(e.target.value as 'daily' | 'weekdays' | 'once')}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                >
                  <option value="daily">ทุกวัน</option>
                  <option value="weekdays">เฉพาะวันจันทร์ – ศุกร์</option>
                  <option value="once">เตือนครั้งเดียววันนี้</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>ตั้งเวลาแจ้งเตือน</span>
              </button>
            </form>

            <div className="pt-4 border-t border-rose-100 dark:border-rose-900/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-600 dark:text-stone-300">
                  เสียงกระดิ่งแจ้งเตือนในแอป
                </span>
                <button
                  type="button"
                  onClick={toggleSound}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-rose-200/80 dark:border-rose-900/50"
                >
                  {state.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-rose-500" /> : <VolumeX className="w-3.5 h-3.5 text-stone-400" />}
                  <span>{state.soundEnabled ? 'เปิดเสียง' : 'ปิดเสียง'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-600 dark:text-stone-300">
                  แจ้งเตือนเบราว์เซอร์ ({browserPerm === 'granted' ? 'อนุญาตแล้ว' : browserPerm === 'denied' ? 'ถูกปิดกั้น' : 'รอขอสิทธิ์'})
                </span>
                <button
                  type="button"
                  onClick={handleRequestNotificationPermission}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  ขอสิทธิ์แจ้งเตือน
                </button>
              </div>

              <button
                type="button"
                onClick={() => pushNotification('ปิ้ง! ทดสอบการแจ้งเตือนจาก Pinging Your Day สำเร็จแล้ว', 'general')}
                className="w-full py-2 text-xs font-semibold rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-700 dark:text-rose-300"
              >
                ทดสอบส่ง Ping แจ้งเตือนตอนนี้
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-3">
                รายการตั้งเวลาแจ้งเตือน
              </h2>
              <ul className="divide-y divide-rose-100 dark:divide-rose-900/30">
                {state.reminders.map((r) => (
                  <li key={r.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                        {r.title}
                      </p>
                      <p className="text-xs text-stone-500 tabular-nums mt-0.5">
                        เวลา {r.time} ·{' '}
                        {r.repeat === 'daily' ? 'ทุกวัน' : r.repeat === 'weekdays' ? 'จ.–ศ.' : 'ครั้งเดียว'} ·{' '}
                        {r.enabled ? 'เปิดใช้งาน' : 'ปิดชั่วคราว'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleReminder(r.id)}
                        className={`px-3 py-1 text-xs font-semibold rounded-xl border ${
                          r.enabled
                            ? 'bg-rose-500 border-rose-500 text-white'
                            : 'border-rose-200/80 dark:border-rose-900/50 text-stone-500'
                        }`}
                      >
                        {r.enabled ? 'เปิด' : 'ปิด'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteReminder(r.id)}
                        aria-label="ลบการแจ้งเตือน"
                        className="p-1.5 text-stone-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-rose-50/70 dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-5">
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                การจัดการฐานข้อมูลและสำรองข้อมูล (Backoffice)
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">
                สำหรับการซิงก์ฐานข้อมูล Supabase ส่งออก/นำเข้า JSON และการจัดการลิงก์ปิ้งทั้งหมด สามารถเข้าไปจัดการได้ที่เมนู “เข้าสู่ระบบหลังบ้าน” ในแถบด้านซ้าย
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
