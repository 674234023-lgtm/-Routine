import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, HeartHandshake, RefreshCw, Send } from 'lucide-react';
import { PingShareLink } from '../types.ts';
import { useOneMinuteQuoteRotation } from '../utils/useQuoteRotation.ts';

interface PingSharePublicViewProps {
  slug: string;
  onReturnToApp?: () => void;
  returnLabel?: string;
}

const PUBLIC_HEALING_QUOTES = [
  'ไม่ต้องรีบเติบโตให้ทันใคร แค่ค่อยๆ เป็นตัวเองในเวอร์ชันที่ใจดีขึ้นทุกวันก็พอ',
  'เธอเก่งมากแล้วที่ประคองตัวเองมาได้จนถึงวันนี้ ขอให้วันนี้ใจดีกับเธอเป็นพิเศษนะ',
  'พักดื่มน้ำ สูดหายใจลึกๆ แล้วค่อยไปต่อในจังหวะที่สบายใจได้เลย',
  'เหนื่อยก็พัก หนักก็วาง วันพรุ่งนี้ยังมีแสงแดดอ่อนๆ รอเราเริ่มต้นใหม่อยู่เสมอ',
  'ทุกก้าวเล็กๆ ที่เธอตั้งใจทำในวันนี้ กำลังพาเธอไปสู่เรื่องราวดีๆ ในวันข้างหน้านะ',
];

export const PingSharePublicView: React.FC<PingSharePublicViewProps> = ({
  slug,
  onReturnToApp,
  returnLabel = 'กลับหน้าหลักของฉัน',
}) => {
  const [remoteLink, setRemoteLink] = useState<PingShareLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Friend-to-friend reply / create own /ปิ้ง card form (strictly isolated from owner private data)
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyTo, setReplyTo] = useState('');
  const [replyFrom, setReplyFrom] = useState('');
  const [replyMsg, setReplyMsg] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!slug) return;
    setLoading(true);
    fetch(`/api/supabase/ping/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.link) {
          setRemoteLink({
            id: json.link.slug,
            slug: json.link.slug,
            friendName: json.link.friend_name,
            senderName: json.link.sender_name,
            message: json.link.message,
            quoteText: json.link.quote_text,
            createdAt: json.link.created_at,
          });
        } else {
          setRemoteLink(null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const params = new URLSearchParams(window.location.search);
  const qTo = params.get('to');
  const qFrom = params.get('from');
  const qMsg = params.get('msg');
  const qQuote = params.get('q');

  const activeCard: PingShareLink = remoteLink || {
    id: 'default_ping',
    slug: slug || 'ปิ้ง',
    friendName:
      qTo ||
      (slug && slug !== 'ปิ้ง' && slug !== 'ping' ? decodeURIComponent(slug) : 'เพื่อนคนเก่ง'),
    senderName: qFrom || 'คนส่งกำลังใจ',
    message:
      qMsg ||
      'แวะมาปิ้งกำลังใจให้วันนี้ใจดีกับเธอเยอะๆ นะ เหนื่อยเมื่อไหร่ก็พักได้เสมอเลย',
    quoteText: qQuote || PUBLIC_HEALING_QUOTES[0],
    createdAt: new Date().toISOString(),
  };

  const pingQuotePool = [
    activeCard.quoteText,
    ...PUBLIC_HEALING_QUOTES.filter((q) => q !== activeCard.quoteText),
  ];
  const { activeIndex, formattedCountdown, nextQuote } = useOneMinuteQuoteRotation(
    pingQuotePool.length
  );
  const displayQuoteText = pingQuotePool[activeIndex] || pingQuotePool[0];

  const handleCreateOwnPing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTo.trim() || !replyMsg.trim() || creating) return;
    setCreating(true);
    const randomQuote =
      pingQuotePool[Math.floor(Math.random() * Math.max(1, pingQuotePool.length))] ||
      displayQuoteText;
    const cleanSlug =
      replyTo
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\u0E00-\u0E7Fa-z0-9_-]/g, '')
        .slice(0, 32) || `ปิ้ง-${Date.now().toString(36).slice(-4)}`;
    const senderLabel = replyFrom.trim() || 'เพื่อนของคุณ';

    try {
      await fetch('/api/supabase/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: cleanSlug,
          friendName: replyTo.trim(),
          senderName: senderLabel,
          message: replyMsg.trim(),
          quoteText: randomQuote,
          ownerKey: 'public-friend',
          ownerName: senderLabel,
        }),
      });
    } catch {
      // ignore transient errors
    } finally {
      setCreating(false);
    }
    setCreatedUrl(`${window.location.origin}/ปิ้ง/${cleanSlug}`);
  };

  const handleCopy = () => {
    if (!createdUrl) return;
    navigator.clipboard.writeText(createdUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="min-h-screen bg-[#FFF9FA] dark:bg-[#16121A] text-stone-800 dark:text-stone-100 flex flex-col justify-between p-4 sm:p-8">
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between gap-3 py-2">
        <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
          ปิ้ง · การ์ดส่งกำลังใจ
        </span>
        <span className="text-xs font-medium text-stone-400">Pinging Your Day</span>
      </header>

      <main className="max-w-2xl w-full mx-auto my-6 sm:my-8 space-y-6">
        <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-3xl overflow-hidden shadow-sm">
          <div className="h-48 sm:h-64 bg-rose-50 dark:bg-[#141018]">
            {!imgError ? (
              <img
                src="/src/assets/images/cute_care_corner_1795071516737.jpg"
                alt="การ์ดส่งกำลังใจจากลิงก์ปิ้ง"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <HeartHandshake className="w-10 h-10 text-rose-400" />
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {loading ? (
              <p className="text-sm text-stone-500">กำลังเปิดการ์ดปิ้งของเธอ...</p>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-rose-500">
                    ปิ้งกำลังใจถึง {activeCard.friendName} · จาก {activeCard.senderName}
                  </p>
                  <h1 className="text-xl sm:text-2xl font-bold text-stone-800 dark:text-stone-100 leading-snug">
                    {activeCard.message}
                  </h1>
                </div>

                <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                    <span>คำคมฮีลใจสำหรับเธอ</span>
                    <span className="font-mono tabular-nums">
                      เปลี่ยนคำคมใหม่อัตโนมัติทุก 1 นาที ({formattedCountdown})
                    </span>
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-stone-800 dark:text-stone-100 leading-relaxed">
                    “{displayQuoteText}”
                  </p>
                  <button
                    type="button"
                    onClick={nextQuote}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline pt-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>สุ่มคำคมกำลังใจถัดไป</span>
                  </button>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReplyForm((v) => !v)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>สร้างลิงก์ปิ้งส่งให้เพื่อนคนอื่น</span>
                  </button>
                  {onReturnToApp && (
                    <button
                      type="button"
                      onClick={onReturnToApp}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-stone-700 dark:text-stone-200 border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 text-rose-500" />
                      <span>{returnLabel}</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {showReplyForm && (
          <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
              สร้างลิงก์ปิ้งส่งหาเพื่อน
            </h2>
            <form onSubmit={handleCreateOwnPing} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="ชื่อเพื่อน (ใช้เป็นชื่อลิงก์ /ปิ้ง/...)"
                  className="px-3.5 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
                <input
                  type="text"
                  value={replyFrom}
                  onChange={(e) => setReplyFrom(e.target.value)}
                  placeholder="ชื่อผู้ส่ง (ไม่บังคับ)"
                  className="px-3.5 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>
              <textarea
                rows={3}
                required
                value={replyMsg}
                onChange={(e) => setReplyMsg(e.target.value)}
                placeholder="เขียนข้อความน่ารักๆ ที่อยากส่งให้เพื่อน..."
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
              />
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl disabled:opacity-50"
              >
                {creating ? 'กำลังสร้างลิงก์...' : 'สร้างลิงก์ปิ้งเลย'}
              </button>
            </form>

            {createdUrl && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-[#141018] border border-rose-200/70 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-mono text-stone-700 dark:text-stone-200 truncate">
                  {createdUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500 text-white rounded-lg shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="max-w-3xl w-full mx-auto text-center text-xs text-stone-400 py-2">
        ปิ้ง · การ์ดส่งกำลังใจให้กันทุกวัน
      </footer>
    </div>
  );
};
