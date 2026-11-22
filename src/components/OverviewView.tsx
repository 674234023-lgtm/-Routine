import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Droplets,
  Flame,
  GraduationCap,
  HeartHandshake,
  Link2,
  Moon,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { useOneMinuteQuoteRotation } from '../utils/useQuoteRotation.ts';
import {
  CareSubTab,
  DailySubTab,
  DayOfWeek,
  HealthSubTab,
  MainCategory,
  StudySubTab,
} from '../types.ts';
import {
  diffDaysISO,
  formatMinutesToHours,
  formatThaiDate,
  formatThaiShortDate,
  getTodayISO,
  getWeekKey,
} from '../utils/date.ts';

interface OverviewViewProps {
  onNavigate: (
    cat: MainCategory,
    sub?: DailySubTab | HealthSubTab | StudySubTab | CareSubTab
  ) => void;
  onOpenPingShare?: () => void;
}

const DAILY_QUOTES = [
  {
    quote: 'วันนี้ไม่จำเป็นต้องเก่งที่สุด แค่ใจดีกับตัวเองให้มากกว่าเมื่อวานก็เพียงพอแล้ว',
    source: 'Pinging Your Day',
  },
  {
    quote: 'การพักไม่ได้แปลว่าหยุดเดิน แต่มันคือการเติมพลังให้ก้าวต่อไปน่ารักและมั่นคงกว่าเดิม',
    source: 'Pinging Your Day',
  },
  {
    quote: 'สิ่งเล็กๆ ที่เธอทำซ้ำทุกวัน กำลังค่อยๆ สร้างชีวิตที่อบอุ่นโดยไม่รู้ตัว',
    source: 'Pinging Your Day',
  },
];

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate, onOpenPingShare }) => {
  const { state, toggleTodo, addTodo, addWater, toggleWeeklyRoutine } = useAppStore();
  const [quickTask, setQuickTask] = useState('');
  const [imgError, setImgError] = useState(false);

  const today = getTodayISO();
  const todayDay = new Date().getDay() as DayOfWeek;
  const weekKey = getWeekKey();

  const todayTodos = state.todos.filter((t) => t.date === today);
  const completedCount = todayTodos.filter((t) => t.completed).length;

  const todayMeals = state.mealEntries.filter((m) => m.date === today);
  const caloriesToday = todayMeals.reduce((acc, m) => acc + m.calories, 0);
  const waterToday = state.waterIntakeByDate[today] || 0;

  const latestSleep = state.sleepEntries[state.sleepEntries.length - 1];

  const upcomingWork = state.workTasks
    .filter((w) => w.status !== 'done')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const nextWork = upcomingWork[0];

  const todayClasses = state.classes
    .filter((c) => c.dayOfWeek === todayDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const todayRoutines = state.weeklyRoutines.filter((r) => r.days.includes(todayDay));

  const quotePool = [
    ...state.savedQuotes.map((q) => ({
      quote: q.quote,
      source: q.sourceName,
    })),
    ...DAILY_QUOTES,
  ];
  const { activeIndex, formattedCountdown, nextQuote } = useOneMinuteQuoteRotation(quotePool.length);
  const featuredQuote = quotePool[activeIndex] || DAILY_QUOTES[0];

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTask.trim()) return;
    addTodo({
      title: quickTask.trim(),
      date: today,
      priority: 'medium',
      category: 'วันนี้',
      completed: false,
    });
    setQuickTask('');
  };

  return (
    <div className="space-y-8">
      {/* Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-rose-500 dark:text-rose-400 tabular-nums">
              {formatThaiDate(today)}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-800 dark:text-stone-100 leading-snug">
              สวัสดีวันใหม่ มาจัดจังหวะชีวิตน่ารักๆ ไปกับ Pinging Your Day
            </h1>
            <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 max-w-2xl leading-relaxed">
              พื้นที่ดูแลตัวเองครบทั้ง 4 หมวด ทั้งกิจวัตรประจำวัน สุขภาพและการนอน ตารางเรียนและเดดไลน์ พร้อมคลังคำคมจากเว็บโปรดและน้องปิ้งคู่คิดฮีลใจ
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-rose-100 dark:border-rose-900/30 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('daily', 'todos')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 dark:bg-rose-500 dark:hover:bg-rose-400 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <span>วางแผนวันนี้</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('care', 'support')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-950 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <HeartHandshake className="w-4 h-4 text-rose-500" />
              <span>ดึงคำคม & คุยกับน้องปิ้ง</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-rose-200/70 dark:border-rose-900/40 bg-rose-50 dark:bg-[#1F1926] min-h-[220px]">
          {!imgError ? (
            <img
              src="/src/assets/images/cute_pastel_desk_1795071517590.jpg"
              alt="โต๊ะอ่านหนังสือโทนพาสเทลน่ารักพร้อมสมุดแพลนเนอร์และแก้วกระต่าย"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-rose-50 to-amber-50 dark:from-[#1F1926] dark:to-[#292033]">
              <Calendar className="w-8 h-8 text-rose-500 mb-2" />
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Pinging Your Day</p>
            </div>
          )}
        </div>
      </section>

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('daily', 'todos')}
          className="text-left bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 hover:border-rose-400 dark:hover:border-rose-500/60 rounded-2xl p-5 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
            <span>ภารกิจวันนี้</span>
            <Check className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-stone-800 dark:text-stone-100">
            {completedCount}/{todayTodos.length}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {todayTodos.length === 0
              ? 'ยังไม่มีรายการวันนี้'
              : completedCount === todayTodos.length
              ? 'ทำครบทั้งหมดแล้ว เก่งมาก!'
              : `เหลืออีก ${todayTodos.length - completedCount} รายการ`}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('health', 'calories')}
          className="text-left bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 hover:border-rose-400 dark:hover:border-rose-500/60 rounded-2xl p-5 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
            <span>แคลอรี่ & น้ำดื่ม</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-stone-800 dark:text-stone-100">
            {caloriesToday.toLocaleString()} <span className="text-xs font-normal text-stone-500">kcal</span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 tabular-nums">
            เป้าหมาย {state.dailyCalorieGoal.toLocaleString()} kcal · น้ำ {waterToday} ml
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('health', 'sleep')}
          className="text-left bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 hover:border-rose-400 dark:hover:border-rose-500/60 rounded-2xl p-5 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
            <span>การนอนล่าสุด</span>
            <Moon className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-stone-800 dark:text-stone-100">
            {latestSleep ? formatMinutesToHours(latestSleep.durationMinutes) : '—'}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 tabular-nums">
            {latestSleep ? `เข้านอน ${latestSleep.bedTime} – ตื่น ${latestSleep.wakeTime}` : 'กดเพื่อบันทึกเวลานอน'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('study', 'tasks')}
          className="text-left bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 hover:border-rose-400 dark:hover:border-rose-500/60 rounded-2xl p-5 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
            <span>เดดไลน์ถัดไป</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-base font-semibold text-stone-800 dark:text-stone-100 truncate">
            {nextWork ? nextWork.title : 'ไม่มีงานค้างส่ง'}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 tabular-nums">
            {nextWork
              ? `${nextWork.projectOrCourse} · ส่ง ${formatThaiShortDate(nextWork.dueDate)} (${
                  diffDaysISO(today, nextWork.dueDate) <= 0
                    ? 'วันนี้/เลยกำหนด'
                    : `อีก ${diffDaysISO(today, nextWork.dueDate)} วัน`
                })`
              : 'จัดการงานเรียบร้อยดีมาก'}
          </p>
        </button>
      </section>

      {/* Main Two-Column Overview */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Today's Tasks + Weekly Routine */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">
                  เช็กลิสต์วันนี้
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  เพิ่มงานด่วนหรือติ๊กสิ่งที่ทำสำเร็จแล้วได้เลย
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('daily', 'todos')}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline whitespace-nowrap shrink-0"
              >
                ดูทั้งหมดและแพลนพรุ่งนี้
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="flex gap-2 mb-4">
              <input
                type="text"
                value={quickTask}
                onChange={(e) => setQuickTask(e.target.value)}
                placeholder="เพิ่มสิ่งที่ต้องทำวันนี้..."
                className="flex-1 min-w-0 px-3.5 py-2 text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่ม</span>
              </button>
            </form>

            {todayTodos.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">
                ยังไม่มีรายการสำหรับวันนี้ ลองเพิ่มภารกิจแรกของคุณด้านบน
              </p>
            ) : (
              <ul className="divide-y divide-rose-100 dark:divide-rose-900/30">
                {todayTodos.map((todo) => (
                  <li key={todo.id} className="py-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleTodo(todo.id)}
                      aria-label={`สลับสถานะ ${todo.title}`}
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                        todo.completed
                          ? 'bg-rose-500 border-rose-500 text-white'
                          : 'border-rose-300 dark:border-rose-700 hover:border-rose-500'
                      }`}
                    >
                      {todo.completed && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate ${
                          todo.completed
                            ? 'line-through text-stone-400 dark:text-stone-500'
                            : 'text-stone-800 dark:text-stone-200'
                        }`}
                      >
                        {todo.title}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                        {todo.timeSlot ? `${todo.timeSlot} · ` : ''}
                        {todo.category} ·{' '}
                        {todo.priority === 'high'
                          ? 'สำคัญมาก'
                          : todo.priority === 'medium'
                          ? 'ปกติ'
                          : 'สบายๆ'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">
                  รูทินประจำสัปดาห์ของวันนี้
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  กิจวัตรซ้ำๆ ตามวันในสัปดาห์ เช่น งานบ้านหรือทบทวนบทเรียน
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('daily', 'weekly')}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline whitespace-nowrap shrink-0"
              >
                ตั้งค่าตารางสัปดาห์
              </button>
            </div>
            {todayRoutines.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400 py-4">
                วันนี้ไม่มีรูทินซ้ำรายสัปดาห์ที่ตั้งไว้
              </p>
            ) : (
              <ul className="divide-y divide-rose-100 dark:divide-rose-900/30">
                {todayRoutines.map((r) => {
                  const key = `${weekKey}_${todayDay}`;
                  const done = !!r.completedWeekKeys[key];
                  return (
                    <li key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleWeeklyRoutine(r.id, todayDay)}
                        className="flex items-center gap-3 text-left flex-1 min-w-0"
                      >
                        <span
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                            done
                              ? 'bg-rose-500 border-rose-500 text-white'
                              : 'border-rose-300 dark:border-rose-700'
                          }`}
                        >
                          {done && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span
                          className={`text-sm truncate ${
                            done ? 'line-through text-stone-400' : 'text-stone-800 dark:text-stone-200'
                          }`}
                        >
                          {r.title}
                        </span>
                      </button>
                      <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums shrink-0">
                        {r.time || r.category}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right: Classes, Water Quick Log & Healing Quote */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-rose-500" />
                <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
                  ตารางเรียนวันนี้
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('study', 'classes')}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline whitespace-nowrap shrink-0"
              >
                ตารางทั้งหมด
              </button>
            </div>

            {todayClasses.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400 py-3">
                วันนี้ไม่มีตารางเรียน พักผ่อนหรือทบทวนสกิลเสริมได้เต็มที่
              </p>
            ) : (
              <ul className="space-y-3">
                {todayClasses.map((cls) => (
                  <li
                    key={cls.id}
                    className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30"
                  >
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                      {cls.code} · {cls.name}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 tabular-nums">
                      {cls.startTime} – {cls.endTime} · {cls.room} · {cls.instructor}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-sky-500" />
                <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
                  เติมน้ำให้ร่างกายวันนี้
                </h2>
              </div>
              <span className="text-sm font-mono tabular-nums font-semibold text-stone-800 dark:text-stone-100">
                {waterToday} / 2,000 ml
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-rose-100/70 dark:bg-rose-950/40 overflow-hidden mb-4">
              <div
                className="h-full bg-sky-400 transition-all"
                style={{ width: `${Math.min(100, Math.round((waterToday / 2000) * 100))}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => addWater(today, 250)}
                className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-stone-700 dark:text-stone-200 transition-colors"
              >
                +1 แก้ว (250 ml)
              </button>
              <button
                type="button"
                onClick={() => addWater(today, 500)}
                className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-stone-700 dark:text-stone-200 transition-colors"
              >
                +1 ขวด (500 ml)
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-rose-500 dark:text-rose-400">
                คำคมฮีลใจประจำวัน
              </p>
              <span className="text-[11px] font-mono tabular-nums text-stone-400">
                เปลี่ยนทุก 1 นาที ({formattedCountdown})
              </span>
            </div>
            <p className="text-sm sm:text-base text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
              “{featuredQuote.quote}”
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={nextQuote}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>เปลี่ยนคำคม</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('care', 'support')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
              >
                <span>ดึงคำคมจากเว็บ & คุยกับน้องปิ้ง</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {onOpenPingShare && (
                <button
                  type="button"
                  onClick={onOpenPingShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>ส่งลิงก์ปิ้งให้เพื่อน (/ปิ้ง)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
