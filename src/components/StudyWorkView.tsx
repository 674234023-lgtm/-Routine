import React, { useState } from 'react';
import { BookOpen, Briefcase, ExternalLink, GraduationCap, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { DayOfWeek, PriorityLevel, StudySubTab, WorkStatus } from '../types.ts';
import {
  diffDaysISO,
  formatThaiShortDate,
  getTodayISO,
  THAI_DAY_FULL,
  THAI_DAY_SHORT,
} from '../utils/date.ts';

interface StudyWorkViewProps {
  subTab: StudySubTab;
  onChangeSubTab: (tab: StudySubTab) => void;
}

const STUDY_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6];

export const StudyWorkView: React.FC<StudyWorkViewProps> = ({ subTab, onChangeSubTab }) => {
  const {
    state,
    addClassItem,
    deleteClassItem,
    addWorkTask,
    updateWorkTaskStatus,
    deleteWorkTask,
    addSkill,
    logSkillHours,
    deleteSkill,
  } = useAppStore();

  const today = getTodayISO();

  // --- Classes state ---
  const [clsCode, setClsCode] = useState('');
  const [clsName, setClsName] = useState('');
  const [clsDay, setClsDay] = useState<DayOfWeek>(1);
  const [clsStart, setClsStart] = useState('09:00');
  const [clsEnd, setClsEnd] = useState('12:00');
  const [clsRoom, setClsRoom] = useState('');
  const [clsInstructor, setClsInstructor] = useState('');

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clsName.trim()) return;
    addClassItem({
      code: clsCode.trim() || 'COURSE',
      name: clsName.trim(),
      dayOfWeek: clsDay,
      startTime: clsStart,
      endTime: clsEnd,
      room: clsRoom.trim() || 'ไม่ระบุห้อง',
      instructor: clsInstructor.trim() || 'ไม่ระบุผู้สอน',
    });
    setClsCode('');
    setClsName('');
    setClsRoom('');
    setClsInstructor('');
  };

  // --- Work Tasks state ---
  const [wkTitle, setWkTitle] = useState('');
  const [wkCourse, setWkCourse] = useState('');
  const [wkDue, setWkDue] = useState(today);
  const [wkDueTime, setWkDueTime] = useState('23:59');
  const [wkPriority, setWkPriority] = useState<PriorityLevel>('medium');
  const [wkNote, setWkNote] = useState('');
  const [wkFilter, setWkFilter] = useState<'all' | WorkStatus>('all');

  const handleAddWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wkTitle.trim()) return;
    addWorkTask({
      title: wkTitle.trim(),
      projectOrCourse: wkCourse.trim() || 'งานทั่วไป',
      dueDate: wkDue,
      dueTime: wkDueTime || undefined,
      priority: wkPriority,
      status: 'todo',
      note: wkNote.trim() || undefined,
    });
    setWkTitle('');
    setWkCourse('');
    setWkNote('');
  };

  // --- Skills state ---
  const [skName, setSkName] = useState('');
  const [skPlatform, setSkPlatform] = useState('');
  const [skUrl, setSkUrl] = useState('');
  const [skTarget, setSkTarget] = useState(15);
  const [skNotes, setSkNotes] = useState('');

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skName.trim()) return;
    addSkill({
      name: skName.trim(),
      platform: skPlatform.trim() || 'เรียนรู้ด้วยตนเอง',
      resourceUrl: skUrl.trim() || undefined,
      targetHours: Math.max(1, Number(skTarget) || 10),
      loggedHours: 0,
      status: 'learning',
      notes: skNotes.trim(),
    });
    setSkName('');
    setSkPlatform('');
    setSkUrl('');
    setSkNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Study, Work & Growth
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            จัดการตารางเรียน รายวิชา เดดไลน์งานโปรเจกต์ และเป้าหมายพัฒนาทักษะเสริม
          </p>
        </div>

        <div className="inline-flex max-w-full overflow-x-auto p-1 bg-slate-100 dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-lg self-start">
          {(
            [
              ['classes', 'ตารางเรียน'],
              ['tasks', 'ตารางงาน & เดดไลน์'],
              ['skills', 'การหาสกิลเสริม'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onChangeSubTab(id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
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

      {/* TAB 1: Class Timetable */}
      {subTab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                เพิ่มรายวิชาในตารางเรียน
              </h2>
            </div>

            <form onSubmit={handleAddClass} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    รหัสวิชา
                  </label>
                  <input
                    type="text"
                    value={clsCode}
                    onChange={(e) => setClsCode(e.target.value)}
                    placeholder="CS301"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    วันเรียน
                  </label>
                  <select
                    value={clsDay}
                    onChange={(e) => setClsDay(Number(e.target.value) as DayOfWeek)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  >
                    {([1, 2, 3, 4, 5, 6, 0] as DayOfWeek[]).map((d) => (
                      <option key={d} value={d}>
                        {THAI_DAY_FULL[d]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  ชื่อรายวิชา
                </label>
                <input
                  type="text"
                  required
                  value={clsName}
                  onChange={(e) => setClsName(e.target.value)}
                  placeholder="เช่น Data Structures & Algorithms"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    เริ่มเรียน
                  </label>
                  <input
                    type="time"
                    value={clsStart}
                    onChange={(e) => setClsStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    เลิกเรียน
                  </label>
                  <input
                    type="time"
                    value={clsEnd}
                    onChange={(e) => setClsEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    ห้องเรียน
                  </label>
                  <input
                    type="text"
                    value={clsRoom}
                    onChange={(e) => setClsRoom(e.target.value)}
                    placeholder="อาคาร 4 / Lab 2"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    อาจารย์ผู้สอน
                  </label>
                  <input
                    type="text"
                    value={clsInstructor}
                    onChange={(e) => setClsInstructor(e.target.value)}
                    placeholder="อ.สมชาย"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มลงตารางเรียน</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              ตารางเรียนรายสัปดาห์
            </h2>

            <div className="space-y-4">
              {STUDY_DAYS.map((day) => {
                const items = state.classes
                  .filter((c) => c.dayOfWeek === day)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                return (
                  <div
                    key={day}
                    className="pb-4 border-b border-slate-100 dark:border-slate-800 last:border-b-0 last:pb-0"
                  >
                    <h3 className="text-xs font-semibold text-rose-500 dark:text-rose-400 mb-2">
                      {THAI_DAY_FULL[day]}
                    </h3>
                    {items.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500">ไม่มีคาบเรียน</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {items.map((cls) => (
                          <div
                            key={cls.id}
                            className="p-3.5 rounded-lg bg-[#FFFDFD] dark:bg-[#141018] border border-slate-200/70 dark:border-slate-800 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {cls.code} · {cls.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                                {cls.startTime} – {cls.endTime} · {cls.room}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                ผู้สอน: {cls.instructor}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteClassItem(cls.id)}
                              aria-label="ลบรายวิชา"
                              className="p-1 text-slate-400 hover:text-rose-600 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Work Tasks & Deadlines */}
      {subTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                เพิ่มงาน / โปรเจกต์ที่ต้องส่ง
              </h2>
            </div>

            <form onSubmit={handleAddWork} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  ชื่องาน / โปรเจกต์
                </label>
                <input
                  type="text"
                  required
                  value={wkTitle}
                  onChange={(e) => setWkTitle(e.target.value)}
                  placeholder="เช่น ส่งรายงานบทที่ 3, แก้แบบลูกค้า"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  วิชา / โปรเจกต์
                </label>
                <input
                  type="text"
                  value={wkCourse}
                  onChange={(e) => setWkCourse(e.target.value)}
                  placeholder="เช่น CS301, งานฟรีแลนซ์"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    วันกำหนดส่ง
                  </label>
                  <input
                    type="date"
                    required
                    value={wkDue}
                    onChange={(e) => setWkDue(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    เวลาส่ง
                  </label>
                  <input
                    type="time"
                    value={wkDueTime}
                    onChange={(e) => setWkDueTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  ระดับความเร่งด่วน
                </label>
                <select
                  value={wkPriority}
                  onChange={(e) => setWkPriority(e.target.value as PriorityLevel)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                >
                  <option value="high">สำคัญมาก / ด่วน</option>
                  <option value="medium">ปานกลาง</option>
                  <option value="low">ไม่ด่วน</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  รายละเอียดเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={wkNote}
                  onChange={(e) => setWkNote(e.target.value)}
                  placeholder="ลิงก์ส่งงาน หรือสิ่งที่ต้องเช็ก"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มรายการงาน</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                รายการงานและเดดไลน์
              </h2>
              <div className="inline-flex max-w-full overflow-x-auto p-1 bg-rose-50 dark:bg-[#141018] rounded-lg">
                {(
                  [
                    ['all', 'ทั้งหมด'],
                    ['todo', 'ยังไม่เริ่ม'],
                    ['in_progress', 'กำลังทำ'],
                    ['review', 'รอตรวจ'],
                    ['done', 'เสร็จแล้ว'],
                  ] as const
                ).map(([st, label]) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setWkFilter(st)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                      wkFilter === st
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <ul className="divide-y divide-rose-100 dark:divide-rose-900/30 mt-2">
              {state.workTasks
                .filter((w) => wkFilter === 'all' || w.status === wkFilter)
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .map((task) => {
                  const daysLeft = diffDaysISO(today, task.dueDate);
                  return (
                    <li
                      key={task.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            task.status === 'done'
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                          {task.projectOrCourse} · ส่ง {formatThaiShortDate(task.dueDate)}{' '}
                          {task.dueTime ? task.dueTime : ''} ·{' '}
                          <span
                            className={
                              task.status !== 'done' && daysLeft <= 1
                                ? 'text-rose-600 dark:text-rose-400 font-medium'
                                : task.status !== 'done' && daysLeft <= 3
                                ? 'text-amber-600 dark:text-amber-400 font-medium'
                                : ''
                            }
                          >
                            {task.status === 'done'
                              ? 'ส่งเรียบร้อย'
                              : daysLeft < 0
                              ? `เลยกำหนด ${Math.abs(daysLeft)} วัน`
                              : daysLeft === 0
                              ? 'ส่งวันนี้!'
                              : `อีก ${daysLeft} วัน`}
                          </span>
                          {task.note ? ` · ${task.note}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={task.status}
                          onChange={(e) => updateWorkTaskStatus(task.id, e.target.value as WorkStatus)}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                        >
                          <option value="todo">ยังไม่เริ่ม</option>
                          <option value="in_progress">กำลังทำ</option>
                          <option value="review">รอตรวจ</option>
                          <option value="done">เสร็จแล้ว</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => deleteWorkTask(task.id)}
                          aria-label="ลบงาน"
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 3: Skill Growth */}
      {subTab === 'skills' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                ตั้งเป้าหมายสกิลเสริมใหม่
              </h2>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  ทักษะ / คอร์สที่อยากฝึก
                </label>
                <input
                  type="text"
                  required
                  value={skName}
                  onChange={(e) => setSkName(e.target.value)}
                  placeholder="เช่น Python Data Analysis, ฝึกพูดอังกฤษ"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    แหล่งเรียนรู้ / แพลตฟอร์ม
                  </label>
                  <input
                    type="text"
                    value={skPlatform}
                    onChange={(e) => setSkPlatform(e.target.value)}
                    placeholder="Coursera, YouTube"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    เป้าหมาย (ชั่วโมง)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={skTarget}
                    onChange={(e) => setSkTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  ลิงก์คอร์สเรียน (ไม่บังคับ)
                </label>
                <input
                  type="url"
                  value={skUrl}
                  onChange={(e) => setSkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  โน้ตสิ่งที่ได้เรียนรู้ / แผนฝึก
                </label>
                <textarea
                  rows={3}
                  value={skNotes}
                  onChange={(e) => setSkNotes(e.target.value)}
                  placeholder="จดสรุปหัวข้อที่อยากโฟกัส"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-[#FFFDFD] dark:bg-[#141018]"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มสกิลเสริม</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 space-y-4">
            {state.skills.map((skill) => {
              const pct = Math.min(100, Math.round((skill.loggedHours / skill.targetHours) * 100));
              return (
                <div
                  key={skill.id}
                  className="bg-white dark:bg-[#1F1926] border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {skill.name}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                        {skill.platform} · ฝึกแล้ว {skill.loggedHours} / {skill.targetHours} ชม. ({pct}%) ·{' '}
                        {skill.status === 'completed' ? 'สำเร็จตามเป้าแล้ว' : 'กำลังฝึกฝน'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => logSkillHours(skill.id, 0.5)}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 tabular-nums"
                      >
                        +30 นาที
                      </button>
                      <button
                        type="button"
                        onClick={() => logSkillHours(skill.id, 1)}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-rose-500 hover:bg-rose-600 text-white tabular-nums"
                      >
                        +1 ชม.
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSkill(skill.id)}
                        aria-label="ลบสกิล"
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden my-4">
                    <div
                      className="h-full bg-rose-400 dark:bg-rose-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {skill.notes && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {skill.notes}
                    </p>
                  )}

                  {skill.resourceUrl && (
                    <a
                      href={skill.resourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-rose-500 dark:text-rose-400 hover:underline"
                    >
                      <span>เปิดลิงก์แหล่งเรียนรู้</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
