import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { DailySubTab, DayOfWeek, PriorityLevel } from '../types.ts';
import {
  formatThaiDate,
  formatThaiShortDate,
  getTodayISO,
  getTomorrowISO,
  getWeekKey,
  THAI_DAY_FULL,
  THAI_DAY_SHORT,
  THAI_MONTHS,
  toISODate,
} from '../utils/date.ts';

interface DailyTimeViewProps {
  subTab: DailySubTab;
  onChangeSubTab: (tab: DailySubTab) => void;
}

const ORDERED_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

export const DailyTimeView: React.FC<DailyTimeViewProps> = ({ subTab, onChangeSubTab }) => {
  const {
    state,
    addTodo,
    toggleTodo,
    moveTodoToTomorrow,
    deleteTodo,
    addWeeklyRoutine,
    toggleWeeklyRoutine,
    deleteWeeklyRoutine,
    addCalendarEvent,
    deleteCalendarEvent,
    pushNotification,
  } = useAppStore();

  // --- Sub-tab 1: Today vs Tomorrow To-Do ---
  const today = getTodayISO();
  const tomorrow = getTomorrowISO();
  const [dayMode, setDayMode] = useState<'today' | 'tomorrow'>('today');
  const [todoTitle, setTodoTitle] = useState('');
  const [todoTime, setTodoTime] = useState('');
  const [todoPriority, setTodoPriority] = useState<PriorityLevel>('medium');
  const [todoCategory, setTodoCategory] = useState('ชีวิตประจำวัน');

  const activeDate = dayMode === 'today' ? today : tomorrow;
  const visibleTodos = state.todos.filter((t) => t.date === activeDate);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoTitle.trim()) return;
    addTodo({
      title: todoTitle.trim(),
      date: activeDate,
      timeSlot: todoTime || undefined,
      priority: todoPriority,
      category: todoCategory.trim() || 'ทั่วไป',
      completed: false,
    });
    setTodoTitle('');
    setTodoTime('');
  };

  // --- Sub-tab 2: Weekly Routines ---
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineTime, setRoutineTime] = useState('');
  const [routineCat, setRoutineCat] = useState('งานบ้าน');
  const [routineDays, setRoutineDays] = useState<DayOfWeek[]>([1, 3, 5]);
  const [filterDay, setFilterDay] = useState<DayOfWeek | 'all'>('all');
  const weekKey = getWeekKey();

  const toggleDaySelect = (d: DayOfWeek) => {
    setRoutineDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const handleAddRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineTitle.trim() || routineDays.length === 0) return;
    addWeeklyRoutine({
      title: routineTitle.trim(),
      days: routineDays,
      time: routineTime || undefined,
      category: routineCat.trim() || 'ทั่วไป',
    });
    setRoutineTitle('');
    setRoutineTime('');
  };

  // --- Sub-tab 3: Calendar & Clock (Countdown + Stopwatch) ---
  const [now, setNow] = useState(new Date());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedCalDate, setSelectedCalDate] = useState(today);
  const [evTitle, setEvTitle] = useState('');
  const [evTime, setEvTime] = useState('');
  const [evCat, setEvCat] = useState('นัดหมาย');

  // Countdown timer
  const [countdownInputMins, setCountdownInputMins] = useState(25);
  const [countdownSecondsLeft, setCountdownSecondsLeft] = useState(25 * 60);
  const [countdownRunning, setCountdownRunning] = useState(false);

  // Stopwatch
  const [swMs, setSwMs] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const [swLaps, setSwLaps] = useState<number[]>([]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!countdownRunning) return;
    const id = setInterval(() => {
      setCountdownSecondsLeft((prev) => {
        if (prev <= 1) {
          setCountdownRunning(false);
          pushNotification('ครบเวลานับถอยหลังแล้ว! พักสายตาสักครู่ได้เลย', 'general');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [countdownRunning]);

  useEffect(() => {
    if (!swRunning) return;
    const start = Date.now() - swMs;
    const id = setInterval(() => {
      setSwMs(Date.now() - start);
    }, 50);
    return () => clearInterval(id);
  }, [swRunning]);

  const setCountdownPreset = (mins: number) => {
    setCountdownRunning(false);
    setCountdownInputMins(mins);
    setCountdownSecondsLeft(mins * 60);
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatStopwatch = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  };

  // Calendar grid generation
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calendarCells: (string | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(toISODate(new Date(calYear, calMonth, d)));
  }

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) return;
    addCalendarEvent({
      title: evTitle.trim(),
      date: selectedCalDate,
      time: evTime || undefined,
      category: evCat,
    });
    setEvTitle('');
    setEvTime('');
  };

  const selectedDateEvents = state.calendarEvents.filter((e) => e.date === selectedCalDate);
  const selectedDateTodos = state.todos.filter((t) => t.date === selectedCalDate);
  const selectedDateDeadlines = state.workTasks.filter((w) => w.dueDate === selectedCalDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Daily & Time Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            จัดลำดับกิจวัตรวันนี้-พรุ่งนี้ รูทินประจำสัปดาห์ ปฏิทิน และเครื่องมือจับเวลา
          </p>
        </div>

        {/* Interactive Sub-navigation tabs */}
        <div className="inline-flex max-w-full overflow-x-auto p-1 bg-slate-100 dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-lg self-start">
          <button
            type="button"
            onClick={() => onChangeSubTab('todos')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'todos'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            กิจวัตรวันนี้ & พรุ่งนี้
          </button>
          <button
            type="button"
            onClick={() => onChangeSubTab('weekly')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'weekly'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            รูทินประจำสัปดาห์
          </button>
          <button
            type="button"
            onClick={() => onChangeSubTab('calendar-clock')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'calendar-clock'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            ปฏิทิน & นาฬิกา
          </button>
        </div>
      </div>

      {/* TAB 1: Today & Tomorrow To-Do List */}
      {subTab === 'todos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 h-fit">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
              เพิ่มกิจวัตรสำหรับ{dayMode === 'today' ? 'วันนี้' : 'วันพรุ่งนี้'}
            </h2>
            <form onSubmit={handleAddTodo} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  สิ่งที่ต้องทำ
                </label>
                <input
                  type="text"
                  required
                  value={todoTitle}
                  onChange={(e) => setTodoTitle(e.target.value)}
                  placeholder="เช่น เตรียมเอกสาร, วิ่งตอนเย็น"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    เวลา (ไม่บังคับ)
                  </label>
                  <input
                    type="time"
                    value={todoTime}
                    onChange={(e) => setTodoTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    ระดับความสำคัญ
                  </label>
                  <select
                    value={todoPriority}
                    onChange={(e) => setTodoPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] text-slate-900 dark:text-slate-100"
                  >
                    <option value="high">สำคัญมาก</option>
                    <option value="medium">ปกติ</option>
                    <option value="low">สบายๆ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  หมวดหมู่ย่อย
                </label>
                <input
                  type="text"
                  value={todoCategory}
                  onChange={(e) => setTodoCategory(e.target.value)}
                  placeholder="ชีวิตประจำวัน, สุขภาพ, เรียน"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] text-slate-900 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 dark:bg-rose-500 dark:hover:bg-rose-400 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มลงรายการ{dayMode === 'today' ? 'วันนี้' : 'พรุ่งนี้'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {dayMode === 'today' ? 'แผนวันนี้' : 'แพลนวันพรุ่งนี้'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatThaiDate(activeDate)}
                </p>
              </div>

              <div className="inline-flex p-1 bg-rose-50 dark:bg-[#141018] rounded-lg">
                <button
                  type="button"
                  onClick={() => setDayMode('today')}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    dayMode === 'today'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  วันนี้ ({state.todos.filter((t) => t.date === today).length})
                </button>
                <button
                  type="button"
                  onClick={() => setDayMode('tomorrow')}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    dayMode === 'tomorrow'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  พรุ่งนี้ ({state.todos.filter((t) => t.date === tomorrow).length})
                </button>
              </div>
            </div>

            {visibleTodos.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  ยังไม่มีรายการสำหรับ{dayMode === 'today' ? 'วันนี้' : 'วันพรุ่งนี้'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-rose-100 dark:divide-rose-900/30">
                {visibleTodos.map((item) => (
                  <li key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleTodo(item.id)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          item.completed
                            ? 'bg-rose-500 border-rose-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-rose-500'
                        }`}
                      >
                        {item.completed && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            item.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                          {item.timeSlot ? `${item.timeSlot} · ` : ''}
                          {item.category} ·{' '}
                          <span
                            className={
                              item.priority === 'high'
                                ? 'text-rose-600 dark:text-rose-400 font-medium'
                                : ''
                            }
                          >
                            {item.priority === 'high'
                              ? 'สำคัญมาก'
                              : item.priority === 'medium'
                              ? 'ปกติ'
                              : 'สบายๆ'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {dayMode === 'today' && !item.completed && (
                        <button
                          type="button"
                          onClick={() => moveTodoToTomorrow(item.id)}
                          title="ย้ายไปวันพรุ่งนี้"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
                        >
                          <span>ไปพรุ่งนี้</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteTodo(item.id)}
                        aria-label="ลบรายการ"
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Weekly Recurring Routines */}
      {subTab === 'weekly' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 h-fit">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
              สร้างรูทินประจำสัปดาห์
            </h2>
            <form onSubmit={handleAddRoutine} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  ชื่อกิจวัตร
                </label>
                <input
                  type="text"
                  required
                  value={routineTitle}
                  onChange={(e) => setRoutineTitle(e.target.value)}
                  placeholder="เช่น ซักผ้า, ล้างห้องน้ำ, ทิ้งขยะ"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  เลือกวันที่ทำซ้ำ
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {ORDERED_DAYS.map((d) => {
                    const selected = routineDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDaySelect(d)}
                        className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                          selected
                            ? 'bg-rose-500 border-rose-500 text-white dark:bg-rose-500 dark:border-rose-500'
                            : 'border-rose-200/80 dark:border-rose-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {THAI_DAY_SHORT[d]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    เวลาโดยประมาณ
                  </label>
                  <input
                    type="time"
                    value={routineTime}
                    onChange={(e) => setRoutineTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    หมวดหมู่
                  </label>
                  <input
                    type="text"
                    value={routineCat}
                    onChange={(e) => setRoutineCat(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 dark:bg-rose-500 dark:hover:bg-rose-400 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มรูทินรายสัปดาห์</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  ตารางรูทินประจำสัปดาห์ ({weekKey})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  กดวันด้านขวาเพื่อกรองดูหรือเช็กชื่อกิจกรรมที่ทำเสร็จในสัปดาห์นี้
                </p>
              </div>
              <div className="flex flex-wrap gap-1 p-1 bg-rose-50 dark:bg-[#141018] rounded-lg">
                <button
                  type="button"
                  onClick={() => setFilterDay('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                    filterDay === 'all'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  ทุกวัน
                </button>
                {ORDERED_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setFilterDay(d)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                      filterDay === d
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {THAI_DAY_SHORT[d]}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-rose-100 dark:divide-rose-900/30 mt-2">
              {state.weeklyRoutines
                .filter((r) => filterDay === 'all' || r.days.includes(filterDay))
                .map((routine) => (
                  <div key={routine.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {routine.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        {routine.category} {routine.time ? `· เวลา ${routine.time}` : ''} ·{' '}
                        {routine.days.map((d) => THAI_DAY_SHORT[d]).join(' / ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {routine.days.map((d) => {
                          const key = `${weekKey}_${d}`;
                          const checked = !!routine.completedWeekKeys[key];
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => toggleWeeklyRoutine(routine.id, d)}
                              className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                                checked
                                  ? 'bg-rose-500 border-rose-500 text-white'
                                  : 'border-rose-200/80 dark:border-rose-900/50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              {THAI_DAY_SHORT[d]} {checked ? '✓' : ''}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteWeeklyRoutine(routine.id)}
                        aria-label="ลบรูทิน"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Calendar & Clock (Countdown + Stopwatch) */}
      {subTab === 'calendar-clock' && (
        <div className="space-y-6">
          {/* Clock + Timers Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Digital Clock */}
            <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>เวลาปัจจุบัน</span>
                <Clock className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              </div>
              <div className="my-4">
                <div className="text-4xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 tracking-tight">
                  {now.toLocaleTimeString('th-TH', { hour12: false })}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {formatThaiDate(today)}
                </p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ระบบแจ้งเตือนทำงานอัตโนมัติตามเวลาจริง
              </p>
            </div>

            {/* Countdown / Focus Timer */}
            <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  นาฬิกานับถอยหลัง / โฟกัส
                </span>
                <div className="flex gap-1">
                  {[5, 15, 25, 45].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCountdownPreset(m)}
                      className={`px-2 py-1 text-xs rounded-md font-mono tabular-nums ${
                        countdownInputMins === m
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-4xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 my-3">
                {formatTimer(countdownSecondsLeft)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCountdownRunning((r) => !r)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
                >
                  {countdownRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{countdownRunning ? 'หยุดชั่วคราว' : 'เริ่มนับถอยหลัง'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCountdownPreset(countdownInputMins)}
                  aria-label="รีเซ็ตตัวนับถอยหลัง"
                  className="p-2 rounded-lg border border-rose-200/80 dark:border-rose-900/50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stopwatch */}
            <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  นาฬิกาจับเวลา (Stopwatch)
                </span>
                <span className="text-xs text-slate-500 tabular-nums">{swLaps.length} รอบ</span>
              </div>

              <div className="text-4xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 my-3">
                {formatStopwatch(swMs)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSwRunning((r) => !r)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  {swRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{swRunning ? 'หยุด' : 'จับเวลา'}</span>
                </button>
                <button
                  type="button"
                  disabled={!swRunning && swMs === 0}
                  onClick={() => setSwLaps((prev) => [swMs, ...prev].slice(0, 5))}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40"
                >
                  บันทึกรอบ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSwRunning(false);
                    setSwMs(0);
                    setSwLaps([]);
                  }}
                  aria-label="รีเซ็ตจับเวลา"
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              {swLaps.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 text-xs font-mono tabular-nums text-slate-500">
                  {swLaps.map((lap, idx) => (
                    <span key={idx}>
                      #{swLaps.length - idx} {formatStopwatch(lap)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Interactive Monthly Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {THAI_MONTHS[calMonth]} {calYear + 543}
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="เดือนก่อนหน้า"
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      setCalYear(d.getFullYear());
                      setCalMonth(d.getMonth());
                      setSelectedCalDate(today);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    วันนี้
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="เดือนถัดไป"
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                {(['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'] as const).map((d) => (
                  <div key={d} className="py-1.5">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((iso, idx) => {
                  if (!iso) return <div key={`empty_${idx}`} className="h-16 sm:h-20" />;
                  const dayNum = Number(iso.split('-')[2]);
                  const isToday = iso === today;
                  const isSelected = iso === selectedCalDate;
                  const evCount =
                    state.calendarEvents.filter((e) => e.date === iso).length +
                    state.workTasks.filter((w) => w.dueDate === iso && w.status !== 'done').length;
                  const todoCount = state.todos.filter((t) => t.date === iso).length;

                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedCalDate(iso)}
                      className={`h-16 sm:h-20 p-2 rounded-lg border text-left flex flex-col justify-between transition-colors ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 dark:border-rose-500'
                          : isToday
                          ? 'border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50'
                          : 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <span
                        className={`text-xs font-mono tabular-nums font-semibold ${
                          isToday ? 'text-rose-500 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {dayNum}
                      </span>
                      {(evCount > 0 || todoCount > 0) && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
                          {evCount > 0 ? `${evCount} นัด` : `${todoCount} งาน`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Details & Add Event */}
            <div className="lg:col-span-4 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-5">
              <div>
                <p className="text-xs font-medium text-rose-500 dark:text-rose-400">
                  รายละเอียดวันที่เลือก
                </p>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {formatThaiDate(selectedCalDate)}
                </h3>
              </div>

              <form onSubmit={handleAddEvent} className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  required
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  placeholder="เพิ่มนัดหมาย / กิจกรรมในวันนี้..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] text-slate-900 dark:text-slate-100"
                />
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={evTime}
                    onChange={(e) => setEvTime(e.target.value)}
                    className="w-1/2 px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                  <input
                    type="text"
                    value={evCat}
                    onChange={(e) => setEvCat(e.target.value)}
                    placeholder="หมวดหมู่"
                    className="w-1/2 px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] text-slate-900 dark:text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 text-xs font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
                >
                  + บันทึกลงปฏิทิน
                </button>
              </form>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  กิจกรรมและเดดไลน์ในวัน {formatThaiShortDate(selectedCalDate)}
                </p>
                {selectedDateEvents.length === 0 &&
                selectedDateDeadlines.length === 0 &&
                selectedDateTodos.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ไม่มีรายการบันทึกในวันนี้
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selectedDateEvents.map((ev) => (
                      <li
                        key={ev.id}
                        className="p-2.5 rounded-lg bg-[#FFFDFD] dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                            {ev.title}
                          </p>
                          <p className="text-[11px] text-slate-500 tabular-nums">
                            {ev.time ? `${ev.time} · ` : ''}
                            {ev.category}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteCalendarEvent(ev.id)}
                          aria-label="ลบนัดหมาย"
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                    {selectedDateDeadlines.map((w) => (
                      <li
                        key={w.id}
                        className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60"
                      >
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                          เดดไลน์: {w.title}
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 tabular-nums">
                          {w.projectOrCourse} · {w.dueTime || 'ทั้งวัน'}
                        </p>
                      </li>
                    ))}
                    {selectedDateTodos.map((t) => (
                      <li
                        key={t.id}
                        className="p-2.5 rounded-lg bg-[#FFFDFD] dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30"
                      >
                        <p className="text-xs text-slate-800 dark:text-slate-200">
                          กิจวัตร: {t.title} {t.completed ? '(เสร็จแล้ว)' : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
