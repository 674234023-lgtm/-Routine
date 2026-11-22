import React, { useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  CalendarClock,
  HeartHandshake,
  HeartPulse,
  LayoutDashboard,
  Link2,
  Lock,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  User,
  X,
} from 'lucide-react';
import { AppProvider, useAppStore } from './store/useAppStore.ts';
import {
  CareSubTab,
  DailySubTab,
  HealthSubTab,
  MainCategory,
  StudySubTab,
} from './types.ts';
import { OverviewView } from './components/OverviewView.tsx';
import { DailyTimeView } from './components/DailyTimeView.tsx';
import { HealthFitnessView } from './components/HealthFitnessView.tsx';
import { StudyWorkView } from './components/StudyWorkView.tsx';
import { NotesCareView } from './components/NotesCareView.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';
import { PingSharePublicView } from './components/PingSharePublicView.tsx';
import { AdminBackofficeView } from './components/AdminBackofficeView.tsx';

interface MainShellProps {
  onNavigatePath: (path: string, returnTo?: '/' | '/admin') => void;
}

function MainShell({ onNavigatePath }: MainShellProps) {
  const {
    state,
    toggleTheme,
    updateOwnerProfile,
    activeToast,
    dismissToast,
    passcodeRequired,
    ownerUnlocked,
    verifyOwnerPasscode,
    lockOwnerSession,
  } = useAppStore();

  const [unlockInput, setUnlockInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');

  const [category, setCategory] = useState<MainCategory>('overview');
  const [dailySub, setDailySub] = useState<DailySubTab>('todos');
  const [healthSub, setHealthSub] = useState<HealthSubTab>('sleep');
  const [studySub, setStudySub] = useState<StudySubTab>('classes');
  const [careSub, setCareSub] = useState<CareSubTab>('support');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = state.notifications.filter((n) => !n.read).length;

  const handleNavigate = (
    cat: MainCategory,
    sub?: DailySubTab | HealthSubTab | StudySubTab | CareSubTab
  ) => {
    setCategory(cat);
    if (cat === 'daily' && sub) setDailySub(sub as DailySubTab);
    if (cat === 'health' && sub) setHealthSub(sub as HealthSubTab);
    if (cat === 'study' && sub) setStudySub(sub as StudySubTab);
    if (cat === 'care' && sub) setCareSub(sub as CareSubTab);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => handleNavigate('overview')}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            category === 'overview'
              ? 'bg-rose-500 text-white'
              : 'text-stone-700 dark:text-stone-300 hover:bg-rose-50 dark:hover:bg-rose-950/30'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>ภาพรวมวันนี้</span>
        </button>

        {/* Category 1 */}
        <div>
          <p className="px-3 text-xs font-semibold text-rose-400 dark:text-rose-400/80 mb-1.5">
            1. Daily & Time
          </p>
          <div className="space-y-0.5">
            {(
              [
                ['todos', 'กิจวัตรวันนี้ & พรุ่งนี้'],
                ['weekly', 'รูทินประจำสัปดาห์'],
                ['calendar-clock', 'ปฏิทิน & นาฬิกา'],
              ] as const
            ).map(([id, label]) => {
              const active = category === 'daily' && dailySub === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNavigate('daily', id)}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-sm transition-colors ${
                    active
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-rose-50/70 dark:hover:bg-rose-950/20'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category 2 */}
        <div>
          <p className="px-3 text-xs font-semibold text-rose-400 dark:text-rose-400/80 mb-1.5">
            2. Health & Fitness
          </p>
          <div className="space-y-0.5">
            {(
              [
                ['sleep', 'การนอน'],
                ['calories', 'นับแคล & น้ำดื่ม'],
                ['workout', 'ตารางออกกำลังกาย'],
                ['cycle', 'รอบเดือน'],
              ] as const
            ).map(([id, label]) => {
              const active = category === 'health' && healthSub === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNavigate('health', id)}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-sm transition-colors ${
                    active
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-rose-50/70 dark:hover:bg-rose-950/20'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category 3 */}
        <div>
          <p className="px-3 text-xs font-semibold text-rose-400 dark:text-rose-400/80 mb-1.5">
            3. Study, Work & Growth
          </p>
          <div className="space-y-0.5">
            {(
              [
                ['classes', 'ตารางเรียน'],
                ['tasks', 'ตารางงาน & เดดไลน์'],
                ['skills', 'การหาสกิลเสริม'],
              ] as const
            ).map(([id, label]) => {
              const active = category === 'study' && studySub === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNavigate('study', id)}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-sm transition-colors ${
                    active
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-rose-50/70 dark:hover:bg-rose-950/20'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category 4 */}
        <div>
          <p className="px-3 text-xs font-semibold text-rose-400 dark:text-rose-400/80 mb-1.5">
            4. Notes, Care & Reminders
          </p>
          <div className="space-y-0.5">
            {(
              [
                ['notes', 'จดโน้ต & ไดอารี่'],
                ['support', 'คำคม & คู่คิดฮีลใจ'],
                ['notifications', 'แจ้งเตือนของฉัน'],
              ] as const
            ).map(([id, label]) => {
              const active = category === 'care' && careSub === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNavigate('care', id)}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-sm transition-colors ${
                    active
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-rose-50/70 dark:hover:bg-rose-950/20'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Owner Profile & Separated Links */}
      <div className="pt-4 mt-6 border-t border-rose-100 dark:border-rose-900/40 space-y-1.5">
        <div className="px-3.5 py-2 rounded-xl bg-rose-50/70 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30">
          {!editingProfile ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 truncate">
                  {state.ownerProfile?.displayName || 'คุณปิ้ง'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileNameInput(state.ownerProfile?.displayName || 'คุณปิ้ง');
                  setEditingProfile(true);
                }}
                className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline shrink-0"
              >
                แก้ชื่อ
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (profileNameInput.trim()) {
                  updateOwnerProfile(profileNameInput.trim());
                }
                setEditingProfile(false);
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={profileNameInput}
                onChange={(e) => setProfileNameInput(e.target.value)}
                placeholder="ชื่อเจ้าของ..."
                className="flex-1 min-w-0 px-2 py-1 text-xs rounded-lg border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-[#1F1926]"
              />
              <button
                type="submit"
                className="px-2 py-1 text-[11px] font-semibold bg-rose-500 text-white rounded-lg shrink-0"
              >
                บันทึก
              </button>
            </form>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            onNavigatePath('/ปิ้ง', '/');
          }}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
        >
          <span>หน้าลิงก์ปิ้งสำหรับเพื่อน (/ปิ้ง)</span>
          <Link2 className="w-3.5 h-3.5 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            onNavigatePath('/admin');
          }}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
        >
          <span>เข้าสู่ระบบหลังบ้าน (Backoffice)</span>
          <ShieldCheck className="w-3.5 h-3.5 text-stone-500 shrink-0" />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
        >
          <span>{state.theme === 'light' ? 'โหมดกลางคืนละมุน' : 'โหมดกลางวันพาสเทล'}</span>
          {state.theme === 'light' ? (
            <Moon className="w-4 h-4 text-rose-500" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>

        {passcodeRequired && (
          <button
            type="button"
            onClick={lockOwnerSession}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <span>ล็อกหน้าจอส่วนตัว</span>
            <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          </button>
        )}
      </div>
    </div>
  );

  if (passcodeRequired && !ownerUnlocked) {
    const handleUnlockOwner = async (e: React.FormEvent) => {
      e.preventDefault();
      setUnlockLoading(true);
      setUnlockError('');
      const res = await verifyOwnerPasscode(unlockInput);
      setUnlockLoading(false);
      if (res.ok) {
        setUnlockInput('');
      } else {
        setUnlockError(res.error || 'รหัสผ่านไม่ถูกต้อง');
      }
    };

    return (
      <div className="min-h-screen bg-[#FFF9FA] dark:bg-[#16121A] text-stone-800 dark:text-stone-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <Lock className="w-5 h-5" />
            <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100">
              Pinging Your Day · พื้นที่ส่วนตัว
            </h1>
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            แอปนี้ถูกล็อกด้วยรหัสผ่านเจ้าของระบบ (OWNER_PASSCODE) เพื่อปกป้องบันทึกส่วนตัวและฐานข้อมูลให้เข้าดูได้เพียงคนเดียว
          </p>
          <form onSubmit={handleUnlockOwner} className="space-y-3.5">
            <input
              type="password"
              required
              value={unlockInput}
              onChange={(e) => setUnlockInput(e.target.value)}
              placeholder="กรอกรหัสผ่านส่วนตัวของคุณ"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] font-mono"
            />
            {unlockError && <p className="text-xs text-rose-600">{unlockError}</p>}
            <button
              type="submit"
              disabled={unlockLoading}
              className="w-full py-2.5 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl disabled:opacity-50"
            >
              {unlockLoading ? 'กำลังปลดล็อก...' : 'ปลดล็อกเข้าใช้งาน'}
            </button>
          </form>
          <div className="pt-3 border-t border-rose-100 dark:border-rose-900/30 flex items-center justify-between text-xs">
            <span className="text-stone-400">สำหรับเพื่อนที่มาเปิดการ์ดกำลังใจ:</span>
            <button
              type="button"
              onClick={() => onNavigatePath('/ปิ้ง')}
              className="font-semibold text-rose-600 dark:text-rose-400 hover:underline"
            >
              เปิดหน้า /ปิ้ง
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9FA] dark:bg-[#16121A] text-stone-800 dark:text-stone-100">
      {/* Top Bar: Clean 3-Zone Contract */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#1F1926]/95 backdrop-blur-sm border-b border-rose-200/70 dark:border-rose-900/40">
        <div className="flex items-center justify-between gap-8 px-4 sm:px-6 h-14">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="เปิดเมนู"
              className="lg:hidden p-2 -ml-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('overview')}
              className="text-lg font-bold tracking-tight text-rose-600 dark:text-rose-400 whitespace-nowrap shrink-0"
            >
              Pinging Your Day
            </button>
          </div>

          {/* Zone 2: 4 Category Text Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600 dark:text-stone-400">
            <button
              type="button"
              onClick={() => handleNavigate('daily', dailySub)}
              className={`inline-flex items-center gap-1.5 hover:text-rose-600 dark:hover:text-rose-300 transition-colors whitespace-nowrap shrink-0 ${
                category === 'daily' ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>เวลา & รูทิน</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('health', healthSub)}
              className={`inline-flex items-center gap-1.5 hover:text-rose-600 dark:hover:text-rose-300 transition-colors whitespace-nowrap shrink-0 ${
                category === 'health' ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>สุขภาพ</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('study', studySub)}
              className={`inline-flex items-center gap-1.5 hover:text-rose-600 dark:hover:text-rose-300 transition-colors whitespace-nowrap shrink-0 ${
                category === 'study' ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>เรียน & งาน</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('care', careSub)}
              className={`inline-flex items-center gap-1.5 hover:text-rose-600 dark:hover:text-rose-300 transition-colors whitespace-nowrap shrink-0 ${
                category === 'care' ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>คำคม & ดูแลใจ</span>
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors whitespace-nowrap shrink-0 tabular-nums"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>แจ้งเตือน{unreadCount > 0 ? ` (${unreadCount})` : ''}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Container */}
      <div className="flex-1 flex">
        <aside className="hidden lg:block w-[260px] shrink-0 bg-white dark:bg-[#1F1926] border-r border-rose-200/70 dark:border-rose-900/40">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
            {sidebarContent}
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex bg-stone-950/30">
            <aside className="w-72 max-w-[85vw] bg-white dark:bg-[#1F1926] h-full overflow-y-auto border-r border-rose-200/70 dark:border-rose-900/40">
              {sidebarContent}
            </aside>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        <main className="flex-1 min-w-0 p-4 pb-24 sm:p-6 sm:pb-24 md:pb-8 lg:p-8">
          <div className="max-w-[1160px] mx-auto">
            {category === 'overview' && (
              <OverviewView
                onNavigate={handleNavigate}
                onOpenPingShare={() => onNavigatePath('/ปิ้ง', '/')}
              />
            )}
            {category === 'daily' && (
              <DailyTimeView subTab={dailySub} onChangeSubTab={setDailySub} />
            )}
            {category === 'health' && (
              <HealthFitnessView subTab={healthSub} onChangeSubTab={setHealthSub} />
            )}
            {category === 'study' && (
              <StudyWorkView subTab={studySub} onChangeSubTab={setStudySub} />
            )}
            {category === 'care' && (
              <NotesCareView
                subTab={careSub}
                onChangeSubTab={setCareSub}
                onOpenPingSlug={(slug) =>
                  onNavigatePath(
                    slug === 'ปิ้ง' || slug === 'ping'
                      ? '/ปิ้ง'
                      : `/ปิ้ง/${encodeURIComponent(slug)}`,
                    '/'
                  )
                }
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Phones) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#1F1926]/95 backdrop-blur-md border-t border-rose-200/70 dark:border-rose-900/40 pb-safe">
        <div className="grid grid-cols-5 h-16">
          {(
            [
              ['overview', 'ภาพรวม', LayoutDashboard],
              ['daily', 'เวลา', CalendarClock],
              ['health', 'สุขภาพ', HeartPulse],
              ['study', 'เรียน/งาน', BookOpen],
              ['care', 'ดูแลใจ', HeartHandshake],
            ] as const
          ).map(([id, label, Icon]) => {
            const active = category === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleNavigate(id)}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <NotificationDrawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onOpenSettings={() => handleNavigate('care', 'notifications')}
      />

      {activeToast && (
        <div className="fixed bottom-20 md:bottom-5 right-4 sm:right-5 z-50 max-w-sm bg-rose-600 text-white rounded-2xl shadow-lg px-4 py-3.5 flex items-start gap-3">
          <Bell className="w-4 h-4 mt-0.5 text-rose-100 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">Pinging Your Day</p>
            <p className="text-sm mt-0.5">{activeToast.title}</p>
          </div>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="ปิดการแจ้งเตือน"
            className="text-rose-200 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

const CREATOR_RETURN_KEY = 'pinging_creator_return_path';

function AppRouter() {
  const { passcodeRequired, ownerUnlocked } = useAppStore();
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? decodeURIComponent(window.location.pathname) : '/'
  );
  const [returnPath, setReturnPath] = useState<'/' | '/admin' | null>(() => {
    try {
      const saved = sessionStorage.getItem(CREATOR_RETURN_KEY);
      if (saved === '/' || saved === '/admin') return saved;
    } catch {
      // ignore
    }
    return null;
  });

  // Record creator origin whenever an authorized creator uses the main app or admin
  useEffect(() => {
    try {
      if (pathname === '/' && (!passcodeRequired || ownerUnlocked)) {
        sessionStorage.setItem(CREATOR_RETURN_KEY, '/');
        setReturnPath('/');
      } else if (pathname.startsWith('/admin') && ownerUnlocked) {
        sessionStorage.setItem(CREATOR_RETURN_KEY, '/admin');
        setReturnPath('/admin');
      }
    } catch {
      // ignore
    }
  }, [pathname, passcodeRequired, ownerUnlocked]);

  useEffect(() => {
    const onPopState = () => setPathname(decodeURIComponent(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigatePath = (nextPath: string, returnTo?: '/' | '/admin') => {
    if (typeof window !== 'undefined') {
      if (returnTo) {
        setReturnPath(returnTo);
        try {
          sessionStorage.setItem(CREATOR_RETURN_KEY, returnTo);
        } catch {
          // ignore
        }
      }
      window.history.pushState({}, '', nextPath);
      setPathname(decodeURIComponent(nextPath.split('?')[0]));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <AdminBackofficeView
        onExitAdmin={() => navigatePath('/')}
        onPreviewPingSlug={(slug) =>
          navigatePath(
            slug === 'ปิ้ง' || slug === 'ping'
              ? '/ปิ้ง'
              : `/ปิ้ง/${encodeURIComponent(slug)}`,
            '/admin'
          )
        }
      />
    );
  }

  if (
    pathname === '/ปิ้ง' ||
    pathname.startsWith('/ปิ้ง/') ||
    pathname === '/ping' ||
    pathname.startsWith('/ping/')
  ) {
    const rawSlug = pathname.replace(/^\/(ปิ้ง|ping)\/?/, '');
    const slug = rawSlug ? decodeURIComponent(rawSlug) : 'ปิ้ง';
    return (
      <PingSharePublicView
        slug={slug}
        onReturnToApp={returnPath ? () => navigatePath(returnPath) : undefined}
        returnLabel={returnPath === '/admin' ? 'กลับหน้าระบบหลังบ้าน' : 'กลับหน้าหลักของฉัน'}
      />
    );
  }

  return <MainShell onNavigatePath={navigatePath} />;
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

