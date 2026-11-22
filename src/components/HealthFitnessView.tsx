import React, { useState } from 'react';
import { Check, Droplets, Dumbbell, Flame, HeartPulse, Moon, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { DayOfWeek, HealthSubTab, MealSlot, SleepEntry, WorkoutEntry } from '../types.ts';
import {
  addDaysISO,
  calcSleepMinutes,
  diffDaysISO,
  formatMinutesToHours,
  formatThaiShortDate,
  getTodayISO,
  THAI_DAY_FULL,
  THAI_DAY_SHORT,
} from '../utils/date.ts';

interface HealthFitnessViewProps {
  subTab: HealthSubTab;
  onChangeSubTab: (tab: HealthSubTab) => void;
}

const THAI_FOOD_PRESETS = [
  { name: 'ข้าวผัดกะเพราไก่ + ไข่ดาว', calories: 630, protein: 28, carbs: 68, fat: 26 },
  { name: 'ข้าวอกไก่ย่างพริกไทยดำ', calories: 480, protein: 40, carbs: 55, fat: 9 },
  { name: 'สุกี้น้ำรวมมิตร', calories: 350, protein: 24, carbs: 42, fat: 8 },
  { name: 'ไข่ต้ม 2 ฟอง', calories: 155, protein: 13, carbs: 1, fat: 11 },
  { name: 'ชาไทยหวานน้อย / กาแฟเย็น', calories: 160, protein: 3, carbs: 24, fat: 6 },
];

const SYMPTOM_OPTIONS = ['ปวดท้อง', 'อ่อนเพลีย', 'คัดตึงหน้าอก', 'ปวดหัว', 'อารมณ์แปรปรวน', 'อยากของหวาน'];
const SELFCARE_OPTIONS = ['ดื่มน้ำอุ่น', 'ประคบร้อนหน้าท้อง', 'งดคาเฟอีน', 'นอนพักเพิ่ม', 'ยืดเหยียดเบาๆ'];

export const HealthFitnessView: React.FC<HealthFitnessViewProps> = ({ subTab, onChangeSubTab }) => {
  const {
    state,
    addSleepEntry,
    deleteSleepEntry,
    addMealEntry,
    deleteMealEntry,
    addWater,
    setDailyCalorieGoal,
    addWorkout,
    toggleWorkout,
    deleteWorkout,
    addCycleEntry,
    updateCycleEntry,
    deleteCycleEntry,
    setAverageCycleLength,
  } = useAppStore();

  const today = getTodayISO();

  // --- Sleep state ---
  const [sleepDate, setSleepDate] = useState(today);
  const [bedTime, setBedTime] = useState('23:30');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepQuality, setSleepQuality] = useState<SleepEntry['quality']>('good');
  const [sleepNote, setSleepNote] = useState('');

  const handleAddSleep = (e: React.FormEvent) => {
    e.preventDefault();
    const durationMinutes = calcSleepMinutes(bedTime, wakeTime);
    addSleepEntry({
      date: sleepDate,
      bedTime,
      wakeTime,
      durationMinutes,
      quality: sleepQuality,
      note: sleepNote.trim() || undefined,
    });
    setSleepNote('');
  };

  const recentSleep = state.sleepEntries.slice(-7);
  const avgSleepMins =
    recentSleep.length > 0
      ? Math.round(recentSleep.reduce((a, b) => a + b.durationMinutes, 0) / recentSleep.length)
      : 0;

  // --- Calories state ---
  const [mealDate, setMealDate] = useState(today);
  const [mealSlot, setMealSlot] = useState<MealSlot>('lunch');
  const [mealName, setMealName] = useState('');
  const [mealCal, setMealCal] = useState(400);
  const [mealProtein, setMealProtein] = useState(20);
  const [mealCarbs, setMealCarbs] = useState(45);
  const [mealFat, setMealFat] = useState(12);

  const dayMeals = state.mealEntries.filter((m) => m.date === mealDate);
  const totalCal = dayMeals.reduce((acc, m) => acc + m.calories, 0);
  const totalPro = dayMeals.reduce((acc, m) => acc + m.protein, 0);
  const totalCarb = dayMeals.reduce((acc, m) => acc + m.carbs, 0);
  const totalFat = dayMeals.reduce((acc, m) => acc + m.fat, 0);
  const waterMl = state.waterIntakeByDate[mealDate] || 0;

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) return;
    addMealEntry({
      date: mealDate,
      slot: mealSlot,
      name: mealName.trim(),
      calories: Number(mealCal) || 0,
      protein: Number(mealProtein) || 0,
      carbs: Number(mealCarbs) || 0,
      fat: Number(mealFat) || 0,
    });
    setMealName('');
  };

  // --- Workout state ---
  const [woDay, setWoDay] = useState<DayOfWeek>(new Date().getDay() as DayOfWeek);
  const [woType, setWoType] = useState<WorkoutEntry['type']>('strength');
  const [woExercise, setWoExercise] = useState('');
  const [woSets, setWoSets] = useState(3);
  const [woReps, setWoReps] = useState(12);
  const [woWeight, setWoWeight] = useState(10);
  const [woDuration, setWoDuration] = useState(30);
  const [woCal, setWoCal] = useState(200);

  const handleAddWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!woExercise.trim()) return;
    addWorkout({
      dayOfWeek: woDay,
      date: today,
      type: woType,
      exercise: woExercise.trim(),
      sets: woType === 'strength' ? woSets : undefined,
      reps: woType === 'strength' ? woReps : undefined,
      weightKg: woType === 'strength' ? woWeight : undefined,
      durationMinutes: woDuration,
      caloriesBurned: woCal,
      completed: false,
    });
    setWoExercise('');
  };

  // --- Cycle state ---
  const [cycleStart, setCycleStart] = useState(today);
  const [cycleEnd, setCycleEnd] = useState('');
  const [cycleFlow, setCycleFlow] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [cycleSymptoms, setCycleSymptoms] = useState<string[]>([]);
  const [cycleSelfCare, setCycleSelfCare] = useState<string[]>([]);
  const [cycleNote, setCycleNote] = useState('');

  const latestCycle = state.cycleEntries[state.cycleEntries.length - 1];
  const currentCycleDay = latestCycle ? diffDaysISO(latestCycle.startDate, today) + 1 : null;
  const predictedNextDate = latestCycle
    ? addDaysISO(latestCycle.startDate, state.averageCycleLength)
    : null;
  const daysUntilNext = predictedNextDate ? diffDaysISO(today, predictedNextDate) : null;

  const toggleArr = (arr: string[], item: string, setter: (v: string[]) => void) => {
    setter(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const handleAddCycle = (e: React.FormEvent) => {
    e.preventDefault();
    addCycleEntry({
      startDate: cycleStart,
      endDate: cycleEnd || undefined,
      flow: cycleFlow,
      symptoms: cycleSymptoms,
      selfCareDone: cycleSelfCare,
      note: cycleNote.trim() || undefined,
    });
    setCycleNote('');
    setCycleSymptoms([]);
    setCycleSelfCare([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Health & Fitness
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ดูแลการนอน โภชนาการและแคลอรี่ ตารางออกกำลังกาย และติดตามรอบเดือน
          </p>
        </div>

        <div className="inline-flex max-w-full overflow-x-auto p-1 bg-slate-100 dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-lg self-start">
          {(
            [
              ['sleep', 'การนอน'],
              ['calories', 'นับแคล & น้ำ'],
              ['workout', 'ออกกำลังกาย'],
              ['cycle', 'รอบเดือน'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onChangeSubTab(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                subTab === id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: Sleep */}
      {subTab === 'sleep' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                บันทึกเวลานอนหลับ
              </h2>
            </div>

            <form onSubmit={handleAddSleep} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  วันที่ตื่นนอน
                </label>
                <input
                  type="date"
                  value={sleepDate}
                  onChange={(e) => setSleepDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    เวลาเข้านอน
                  </label>
                  <input
                    type="time"
                    value={bedTime}
                    onChange={(e) => setBedTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    เวลาตื่นนอน
                  </label>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500 tabular-nums">
                รวมระยะเวลานอน: <strong className="text-slate-900 dark:text-slate-100">{formatMinutesToHours(calcSleepMinutes(bedTime, wakeTime))}</strong>
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  คุณภาพการนอน
                </label>
                <select
                  value={sleepQuality}
                  onChange={(e) => setSleepQuality(e.target.value as SleepEntry['quality'])}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                >
                  <option value="deep">หลับสนิท สดชื่นมาก</option>
                  <option value="good">หลับได้ดี ปกติ</option>
                  <option value="light">หลับๆ ตื่นๆ</option>
                  <option value="poor">นอนไม่พอ / อ่อนเพลีย</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  บันทึกเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={sleepNote}
                  onChange={(e) => setSleepNote(e.target.value)}
                  placeholder="เช่น งดมือถือ 30 นาทีก่อนนอน"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
              >
                + บันทึกการนอน
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    สถิติการนอน 7 วันล่าสุด
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    เฉลี่ย {avgSleepMins ? formatMinutesToHours(avgSleepMins) : '—'} (แนะนำ 7–9 ชม./คืน)
                  </p>
                </div>
              </div>

              {recentSleep.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">ยังไม่มีข้อมูลการนอน</p>
              ) : (
                <div className="grid grid-cols-7 gap-3 items-end h-44 pt-4">
                  {recentSleep.map((entry) => {
                    const hrs = entry.durationMinutes / 60;
                    const pct = Math.min(100, Math.round((hrs / 10) * 100));
                    return (
                      <div key={entry.id} className="flex flex-col items-center gap-2 h-full justify-end">
                        <span className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
                          {hrs.toFixed(1)}h
                        </span>
                        <div className="w-full max-w-[36px] bg-slate-100 dark:bg-slate-800 rounded-md h-28 flex items-end overflow-hidden">
                          <div
                            className={`w-full rounded-md transition-all ${
                              hrs >= 7 ? 'bg-rose-400 dark:bg-rose-500' : 'bg-amber-500'
                            }`}
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 tabular-nums">
                          {formatThaiShortDate(entry.date).split(' ').slice(0, 2).join(' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
                ประวัติการนอน
              </h3>
              <ul className="divide-y divide-rose-100 dark:divide-rose-900/30">
                {[...state.sleepEntries].reverse().map((s) => (
                  <li key={s.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatThaiShortDate(s.date)} · {formatMinutesToHours(s.durationMinutes)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {s.bedTime} – {s.wakeTime} ·{' '}
                        {s.quality === 'deep'
                          ? 'หลับสนิท'
                          : s.quality === 'good'
                          ? 'ปกติ'
                          : s.quality === 'light'
                          ? 'หลับๆ ตื่นๆ'
                          : 'นอนไม่พอ'}
                        {s.note ? ` · ${s.note}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteSleepEntry(s.id)}
                      aria-label="ลบประวัติการนอน"
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Calories & Nutrition */}
      {subTab === 'calories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-5 h-fit">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  บันทึกมื้ออาหาร & แคลอรี่
                </h2>
              </div>
              <input
                type="date"
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
              />
            </div>

            {/* Quick Presets */}
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                เมนูลัดยอดนิยม (คลิกเพื่อกรอกค่าทันที)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {THAI_FOOD_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setMealName(p.name);
                      setMealCal(p.calories);
                      setMealProtein(p.protein);
                      setMealCarbs(p.carbs);
                      setMealFat(p.fat);
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-rose-200/80 dark:border-rose-900/50 hover:border-rose-400 text-slate-700 dark:text-slate-300 bg-[#FFFDFD] dark:bg-[#141018] transition-colors"
                  >
                    {p.name} ({p.calories})
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddMeal} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    มื้ออาหาร
                  </label>
                  <select
                    value={mealSlot}
                    onChange={(e) => setMealSlot(e.target.value as MealSlot)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  >
                    <option value="breakfast">มื้อเช้า</option>
                    <option value="lunch">มื้อกลางวัน</option>
                    <option value="dinner">มื้อเย็น</option>
                    <option value="snack">ของว่าง / เครื่องดื่ม</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    แคลอรี่ (kcal)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={mealCal}
                    onChange={(e) => setMealCal(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  ชื่อเมนูอาหาร
                </label>
                <input
                  type="text"
                  required
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  placeholder="เช่น ข้าวมันไก่ไม่หนัง"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">โปรตีน (g)</label>
                  <input
                    type="number"
                    min={0}
                    value={mealProtein}
                    onChange={(e) => setMealProtein(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">คาร์บ (g)</label>
                  <input
                    type="number"
                    min={0}
                    value={mealCarbs}
                    onChange={(e) => setMealCarbs(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">ไขมัน (g)</label>
                  <input
                    type="number"
                    min={0}
                    value={mealFat}
                    onChange={(e) => setMealFat(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
              >
                + บันทึกมื้ออาหาร
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {/* Calorie & Macro Summary */}
            <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    สรุปโภชนาการ ({formatThaiShortDate(mealDate)})
                  </h2>
                  <p className="text-xs text-slate-500 tabular-nums">
                    บริโภคแล้ว {totalCal.toLocaleString()} / {state.dailyCalorieGoal.toLocaleString()} kcal
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <label className="text-slate-500">เป้าหมายแคลอรี่:</label>
                  <input
                    type="number"
                    step={50}
                    value={state.dailyCalorieGoal}
                    onChange={(e) => setDailyCalorieGoal(Number(e.target.value))}
                    className="w-20 px-2 py-1 rounded border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    totalCal > state.dailyCalorieGoal ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((totalCal / state.dailyCalorieGoal) * 100))}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500">โปรตีน</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {totalPro}g
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">คาร์โบไฮเดรต</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {totalCarb}g
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">ไขมัน</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {totalFat}g
                  </p>
                </div>
              </div>

              {/* Water Tracker */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-sky-600" />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                    น้ำดื่ม: {waterMl} / 2,000 ml
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addWater(mealDate, 250)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200/80 dark:border-rose-900/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    +250 ml
                  </button>
                  <button
                    type="button"
                    onClick={() => addWater(mealDate, -250)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200/80 dark:border-rose-900/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    -250 ml
                  </button>
                </div>
              </div>
            </div>

            {/* Meal list */}
            <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
                รายการอาหารที่บันทึก
              </h3>
              {dayMeals.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">ยังไม่มีรายการอาหารในวันนี้</p>
              ) : (
                <ul className="divide-y divide-rose-100 dark:divide-rose-900/30">
                  {dayMeals.map((m) => (
                    <li key={m.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {m.name}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {m.slot === 'breakfast'
                            ? 'มื้อเช้า'
                            : m.slot === 'lunch'
                            ? 'มื้อกลางวัน'
                            : m.slot === 'dinner'
                            ? 'มื้อเย็น'
                            : 'ของว่าง'}{' '}
                          · {m.calories} kcal · P {m.protein}g / C {m.carbs}g / F {m.fat}g
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteMealEntry(m.id)}
                        aria-label="ลบเมนู"
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Workout */}
      {subTab === 'workout' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                เพิ่มตารางออกกำลังกาย
              </h2>
            </div>

            <form onSubmit={handleAddWorkout} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    วัน
                  </label>
                  <select
                    value={woDay}
                    onChange={(e) => setWoDay(Number(e.target.value) as DayOfWeek)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  >
                    {([1, 2, 3, 4, 5, 6, 0] as DayOfWeek[]).map((d) => (
                      <option key={d} value={d}>
                        {THAI_DAY_FULL[d]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    ประเภท
                  </label>
                  <select
                    value={woType}
                    onChange={(e) => setWoType(e.target.value as WorkoutEntry['type'])}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  >
                    <option value="strength">เวทเทรนนิ่ง</option>
                    <option value="cardio">คาร์ดิโอ</option>
                    <option value="mobility">โยคะ / ยืดเหยียด</option>
                    <option value="rest">วันพักฟื้น</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  ท่าออกกำลังกาย / กิจกรรม
                </label>
                <input
                  type="text"
                  required
                  value={woExercise}
                  onChange={(e) => setWoExercise(e.target.value)}
                  placeholder="เช่น Squat, วิ่งลู่ 30 นาที"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              {woType === 'strength' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">เซ็ต</label>
                    <input
                      type="number"
                      min={1}
                      value={woSets}
                      onChange={(e) => setWoSets(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">ครั้ง/เซ็ต</label>
                    <input
                      type="number"
                      min={1}
                      value={woReps}
                      onChange={(e) => setWoReps(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">น้ำหนัก (kg)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={woWeight}
                      onChange={(e) => setWoWeight(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    ระยะเวลา (นาที)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={woDuration}
                    onChange={(e) => setWoDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    เผาผลาญ (kcal)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={woCal}
                    onChange={(e) => setWoCal(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มรายการออกกำลังกาย</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  ตารางและบันทึกการออกกำลังกาย
                </h2>
                <p className="text-xs text-slate-500 tabular-nums">
                  ทำสำเร็จแล้ว {state.workouts.filter((w) => w.completed).length}/{state.workouts.length} เซสชัน · เผาผลาญรวม{' '}
                  {state.workouts
                    .filter((w) => w.completed)
                    .reduce((a, b) => a + b.caloriesBurned, 0)
                    .toLocaleString()}{' '}
                  kcal
                </p>
              </div>
            </div>

            <ul className="divide-y divide-rose-100 dark:divide-rose-900/30">
              {state.workouts.map((w) => (
                <li key={w.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleWorkout(w.id)}
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        w.completed
                          ? 'bg-rose-500 border-rose-500 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {w.completed && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          w.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {w.exercise}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                        {THAI_DAY_SHORT[w.dayOfWeek]} ·{' '}
                        {w.type === 'strength'
                          ? 'เวทเทรนนิ่ง'
                          : w.type === 'cardio'
                          ? 'คาร์ดิโอ'
                          : w.type === 'mobility'
                          ? 'ยืดเหยียด'
                          : 'พักฟื้น'}
                        {w.sets ? ` · ${w.sets}×${w.reps} (${w.weightKg || 0} kg)` : ''} · {w.durationMinutes} นาที ·{' '}
                        {w.caloriesBurned} kcal
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteWorkout(w.id)}
                    aria-label="ลบตารางออกกำลังกาย"
                    className="p-1.5 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 4: Period / Menstrual Cycle Tracker */}
      {subTab === 'cycle' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 space-y-4 h-fit">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                บันทึกรอบเดือนและอาการ
              </h2>
            </div>

            <form onSubmit={handleAddCycle} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    วันแรกที่มีประจำเดือน
                  </label>
                  <input
                    type="date"
                    required
                    value={cycleStart}
                    onChange={(e) => setCycleStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    วันสิ้นสุด (ถ้าทราบ)
                  </label>
                  <input
                    type="date"
                    value={cycleEnd}
                    onChange={(e) => setCycleEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  ปริมาณประจำเดือน
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['light', 'น้อย'],
                      ['medium', 'ปานกลาง'],
                      ['heavy', 'มาก'],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCycleFlow(val)}
                      className={`py-2 text-xs font-medium rounded-lg border ${
                        cycleFlow === val
                          ? 'bg-rose-600 border-rose-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  อาการฮอร์โมน / ร่างกาย
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SYMPTOM_OPTIONS.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => toggleArr(cycleSymptoms, sym, setCycleSymptoms)}
                      className={`px-2.5 py-1 text-xs rounded-lg border ${
                        cycleSymptoms.includes(sym)
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  การดูแลตัวเองช่วงวันนั้น
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SELFCARE_OPTIONS.map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => toggleArr(cycleSelfCare, sc, setCycleSelfCare)}
                      className={`px-2.5 py-1 text-xs rounded-lg border ${
                        cycleSelfCare.includes(sc)
                          ? 'bg-rose-500 border-rose-500 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {sc}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  บันทึกเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={cycleNote}
                  onChange={(e) => setCycleNote(e.target.value)}
                  placeholder="บันทึกอารมณ์หรืออาการเพิ่มเติม"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
              >
                + บันทึกรอบเดือน
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  คาดการณ์รอบเดือนถัดไป
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">ความยาวรอบเฉลี่ย (วัน):</span>
                  <input
                    type="number"
                    min={20}
                    max={45}
                    value={state.averageCycleLength}
                    onChange={(e) => setAverageCycleLength(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-rose-50/50 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30">
                  <p className="text-xs text-slate-500">วันที่ของรอบปัจจุบัน</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                    {currentCycleDay ? `Day ${currentCycleDay}` : '—'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-rose-50/50 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30">
                  <p className="text-xs text-slate-500">คาดว่าจะมาครั้งถัดไป</p>
                  <p className="text-base font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
                    {predictedNextDate ? formatThaiShortDate(predictedNextDate) : '—'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-rose-50/50 dark:bg-[#141018] border border-rose-100 dark:border-rose-900/30">
                  <p className="text-xs text-slate-500">ระยะเวลาที่เหลือ</p>
                  <p className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                    {daysUntilNext === null
                      ? '—'
                      : daysUntilNext > 0
                      ? `อีก ${daysUntilNext} วัน`
                      : daysUntilNext === 0
                      ? 'คาดว่ามาวันนี้'
                      : `เลยกำหนด ${Math.abs(daysUntilNext)} วัน`}
                  </p>
                </div>
              </div>

              {latestCycle && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                    เช็กลิสต์ดูแลตัวเองรอบล่าสุด ({formatThaiShortDate(latestCycle.startDate)})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SELFCARE_OPTIONS.map((sc) => {
                      const done = latestCycle.selfCareDone.includes(sc);
                      return (
                        <button
                          key={sc}
                          type="button"
                          onClick={() => {
                            const next = done
                              ? latestCycle.selfCareDone.filter((x) => x !== sc)
                              : [...latestCycle.selfCareDone, sc];
                            updateCycleEntry(latestCycle.id, { selfCareDone: next });
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            done
                              ? 'bg-rose-500 border-rose-500 text-white'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {done ? '✓ ' : ''}
                          {sc}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
                ประวัติรอบเดือนที่ผ่านมา
              </h3>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...state.cycleEntries].reverse().map((c) => (
                  <li key={c.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                        เริ่ม {formatThaiShortDate(c.startDate)}
                        {c.endDate ? ` – ถึง ${formatThaiShortDate(c.endDate)}` : ''}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        ปริมาณ: {c.flow === 'light' ? 'น้อย' : c.flow === 'medium' ? 'ปานกลาง' : 'มาก'}
                        {c.symptoms.length > 0 ? ` · อาการ: ${c.symptoms.join(', ')}` : ''}
                        {c.note ? ` · ${c.note}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCycleEntry(c.id)}
                      aria-label="ลบบันทึกรอบเดือน"
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
