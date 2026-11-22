import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AppDataState,
  CalendarEvent,
  ChatMessage,
  ClassItem,
  CycleEntry,
  DayOfWeek,
  MealEntry,
  NoteItem,
  PingShareLink,
  ReminderCategory,
  ReminderRule,
  SavedWebQuote,
  SkillItem,
  SleepEntry,
  TodoItem,
  TriggeredNotification,
  VentEntry,
  WeeklyRoutineItem,
  WorkTaskItem,
  WorkoutEntry,
} from '../types.ts';
import { addDaysISO, generateId, getTodayISO, getTomorrowISO, getWeekKey, playGentleChime } from '../utils/date.ts';

const LEGACY_STORAGE_KEY = 'pinging_your_day_store_v1';
const ACTIVE_USER_KEY_STORAGE = 'pinging_active_user_key_v1';

function isPublicPingPath(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const p = decodeURIComponent(window.location.pathname);
    return p === '/ปิ้ง' || p.startsWith('/ปิ้ง/') || p === '/ping' || p.startsWith('/ping/');
  } catch {
    return false;
  }
}

function getStorageKeyForUser(userKey: string): string {
  return `pinging_your_day_user_${userKey}`;
}

function createInitialState(userKey = 'owner-ping', displayName = 'คุณปิ้ง'): AppDataState {
  const today = getTodayISO();
  const tomorrow = getTomorrowISO();
  const weekKey = getWeekKey();
  const yesterday = addDaysISO(today, -1);
  const twoDaysAgo = addDaysISO(today, -2);
  const threeDaysAgo = addDaysISO(today, -3);
  const fourDaysAgo = addDaysISO(today, -4);
  const lastPeriodStart = addDaysISO(today, -19);

  return {
    ownerProfile: {
      userKey,
      displayName,
      roleNote: userKey === 'owner-ping' ? 'เจ้าของบัญชีหลัก' : 'ผู้ใช้งานระบบ',
    },
    todos: [
      {
        id: 'td_1',
        title: 'ดื่มน้ำอุ่น 1 แก้ว + ยืดเหยียดหลังตื่นนอน',
        date: today,
        timeSlot: '07:30',
        priority: 'medium',
        category: 'สุขภาพ',
        completed: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'td_2',
        title: 'สรุปสไลด์ประชุมและส่งงานรายวิชา Software Design',
        date: today,
        timeSlot: '13:30',
        priority: 'high',
        category: 'เรียน & งาน',
        completed: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'td_3',
        title: 'อ่านหนังสือสกิล TypeScript 30 นาที',
        date: today,
        timeSlot: '20:00',
        priority: 'low',
        category: 'พัฒนาตัวเอง',
        completed: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'td_4',
        title: 'จัดกระเป๋าและเตรียมชุดสำหรับวันพรุ่งนี้',
        date: tomorrow,
        timeSlot: '08:00',
        priority: 'medium',
        category: 'ชีวิตประจำวัน',
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ],
    weeklyRoutines: [
      {
        id: 'wr_1',
        title: 'ซักผ้า & ตากผ้า',
        days: [3, 6],
        time: '18:00',
        category: 'งานบ้าน',
        completedWeekKeys: { [`${weekKey}_3`]: false },
      },
      {
        id: 'wr_2',
        title: 'ทำความสะอาดห้องและเปลี่ยนผ้าปูที่นอน',
        days: [0],
        time: '10:00',
        category: 'งานบ้าน',
        completedWeekKeys: {},
      },
      {
        id: 'wr_3',
        title: 'ทบทวนบทเรียนและเคลียร์โต๊ะทำงาน',
        days: [1, 3, 5],
        time: '21:00',
        category: 'การเรียน',
        completedWeekKeys: { [`${weekKey}_1`]: true },
      },
      {
        id: 'wr_4',
        title: 'เช็กบัญชีรายรับ-รายจ่ายประจำสัปดาห์',
        days: [5],
        time: '19:30',
        category: 'การเงิน',
        completedWeekKeys: {},
      },
    ],
    calendarEvents: [
      {
        id: 'ce_1',
        title: 'นัดคุยโปรเจกต์กลุ่มช่วงบ่าย',
        date: today,
        time: '15:00',
        category: 'เรียน & งาน',
        note: 'ห้อง Co-working ชั้น 2 อาคารเรียนรวม',
      },
      {
        id: 'ce_2',
        title: 'วันตรวจสุขภาพ / ซื้อของเข้าห้อง',
        date: addDaysISO(today, 3),
        time: '10:30',
        category: 'ส่วนตัว',
      },
    ],
    sleepEntries: [
      { id: 'sl_1', date: fourDaysAgo, bedTime: '23:45', wakeTime: '06:45', durationMinutes: 420, quality: 'good', note: 'นอนหลับต่อเนื่องดี' },
      { id: 'sl_2', date: threeDaysAgo, bedTime: '00:30', wakeTime: '06:30', durationMinutes: 360, quality: 'light', note: 'ไถมือถือก่อนนอน' },
      { id: 'sl_3', date: twoDaysAgo, bedTime: '23:10', wakeTime: '06:50', durationMinutes: 460, quality: 'deep', note: 'งดคาเฟอีนหลังบ่ายสอง' },
      { id: 'sl_4', date: yesterday, bedTime: '23:30', wakeTime: '07:00', durationMinutes: 450, quality: 'deep', note: 'ตื่นมาสดชื่น' },
    ],
    mealEntries: [
      { id: 'ml_1', date: today, slot: 'breakfast', name: 'ไข่ต้ม 2 ฟอง + ขนมปังโฮลวีต', calories: 310, protein: 18, carbs: 30, fat: 12 },
      { id: 'ml_2', date: today, slot: 'lunch', name: 'ข้าวอกไก่ย่างพริกไทยดำ', calories: 520, protein: 42, carbs: 58, fat: 11 },
    ],
    dailyCalorieGoal: 1800,
    waterIntakeByDate: { [today]: 1000 },
    workouts: [
      {
        id: 'wo_1',
        dayOfWeek: 1,
        date: today,
        type: 'strength',
        exercise: 'Goblet Squat & Dumbbell Row',
        sets: 3,
        reps: 12,
        weightKg: 10,
        durationMinutes: 35,
        caloriesBurned: 210,
        completed: true,
        note: 'โฟกัสจังหวะลงช้าๆ',
      },
      {
        id: 'wo_2',
        dayOfWeek: 3,
        date: today,
        type: 'cardio',
        exercise: 'เดินเร็ว / วิ่งเหยาะๆ สวนสาธารณะ',
        durationMinutes: 30,
        caloriesBurned: 240,
        completed: false,
      },
      {
        id: 'wo_3',
        dayOfWeek: 5,
        date: addDaysISO(today, 2),
        type: 'mobility',
        exercise: 'โยคะคลายปวดหลังและบ่าไหล่',
        durationMinutes: 25,
        caloriesBurned: 95,
        completed: false,
      },
    ],
    cycleEntries: [
      {
        id: 'cy_1',
        startDate: addDaysISO(lastPeriodStart, -28),
        endDate: addDaysISO(lastPeriodStart, -24),
        flow: 'medium',
        symptoms: ['อ่อนเพลีย'],
        selfCareDone: ['ดื่มน้ำอุ่น', 'พักผ่อนเพียงพอ'],
      },
      {
        id: 'cy_2',
        startDate: lastPeriodStart,
        endDate: addDaysISO(lastPeriodStart, 4),
        flow: 'medium',
        symptoms: ['ปวดท้อง', 'อยากของหวาน'],
        selfCareDone: ['ดื่มน้ำอุ่น', 'ประคบร้อน'],
        note: 'วันแรกปวดหน่วงเล็กน้อย วันถัดมาดีขึ้น',
      },
    ],
    averageCycleLength: 28,
    classes: [
      {
        id: 'cl_1',
        code: 'CS301',
        name: 'Software Engineering & Design',
        dayOfWeek: new Date().getDay() as DayOfWeek,
        startTime: '09:00',
        endTime: '11:30',
        room: 'อาคาร 4 ห้อง 402',
        instructor: 'อ.ปวีณา',
      },
      {
        id: 'cl_2',
        code: 'UX214',
        name: 'Human-Computer Interaction',
        dayOfWeek: ((new Date().getDay() + 1) % 7) as DayOfWeek,
        startTime: '13:30',
        endTime: '16:00',
        room: 'Lab 2 อาคารไอที',
        instructor: 'ผศ.กิตติพงษ์',
      },
    ],
    workTasks: [
      {
        id: 'wk_1',
        title: 'ส่งรายงานวิเคราะห์ระบบฐานข้อมูล',
        projectOrCourse: 'CS301',
        dueDate: addDaysISO(today, 1),
        dueTime: '23:59',
        priority: 'high',
        status: 'in_progress',
        note: 'เหลือตรวจ Diagram หน้าสุดท้าย',
      },
      {
        id: 'wk_2',
        title: 'ออกแบบ Wireframe หน้าโปรไฟล์แอป',
        projectOrCourse: 'Freelance UI',
        dueDate: addDaysISO(today, 4),
        dueTime: '18:00',
        priority: 'medium',
        status: 'todo',
      },
    ],
    skills: [
      {
        id: 'sk_1',
        name: 'TypeScript & Full-Stack Web',
        platform: 'YouTube / Docs',
        resourceUrl: 'https://www.typescriptlang.org/docs/',
        targetHours: 20,
        loggedHours: 9.5,
        status: 'learning',
        notes: 'ฝึกเขียน Generic Types และจัดการ State ให้สะอาดขึ้น',
      },
      {
        id: 'sk_2',
        name: 'ภาษาอังกฤษเพื่อการสื่อสาร (Listening)',
        platform: 'Podcast / 15 นาทีต่อวัน',
        targetHours: 15,
        loggedHours: 6,
        status: 'learning',
        notes: 'ฟังระหว่างเดินทางตอนเช้า',
      },
    ],
    notes: [
      {
        id: 'nt_1',
        type: 'diary',
        title: 'บันทึกเล็กๆ ของสัปดาห์นี้',
        content: 'ช่วงนี้จัดตารางนอนได้ดีขึ้น รู้สึกสมองปลอดโปร่งขึ้นมากเวลาตื่นเช้า ค่อยๆ ทำทีละอย่าง ไม่ต้องรีบร้อนเกินไป',
        mood: 'สงบใจ',
        pinned: true,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'nt_2',
        type: 'link',
        title: 'คลังไอเดียสีและ Typography',
        content: 'รวมแรงบันดาลใจจัดเลย์เอาต์สไตล์ Minimal สำหรับโปรเจกต์ถัดไป',
        url: 'https://tailwindcss.com/docs',
        pinned: false,
        updatedAt: new Date().toISOString(),
      },
    ],
    vents: [],
    chatMessages: [
      {
        id: 'cm_1',
        role: 'model',
        text: 'สวัสดีนะคนเก่ง วันนี้เป็นยังไงบ้าง เหนื่อยจากเรื่องเรียน เรื่องงาน หรือมีอะไรที่อยากเล่าให้ฟังไหม พื้นที่ตรงนี้ปลอดภัยและรับฟังเธอเสมอเลย',
        createdAt: new Date().toISOString(),
      },
    ],
    savedQuotes: [
      {
        id: 'sq_1',
        quote: 'ไม่ต้องรีบเติบโตให้ทันใคร แค่ค่อยๆ เป็นตัวเองในเวอร์ชันที่ใจดีขึ้นทุกวันก็พอ',
        sourceName: 'Wongnai Beauty',
        sourceUrl: 'https://www.wongnai.com/beauty',
        topic: 'รักตัวเอง',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sq_2',
        quote: 'เหนื่อยก็พัก หนักก็วาง วันพรุ่งนี้ยังมีแสงแดดอ่อนๆ รอเราเริ่มต้นใหม่อยู่เสมอ',
        sourceName: 'Sale Here',
        sourceUrl: 'https://salehere.co.th',
        topic: 'กำลังใจ',
        createdAt: new Date().toISOString(),
      },
    ],
    pingLinks: [
      {
        id: 'pl_1',
        slug: 'ปิ้ง-กำลังใจ',
        friendName: 'เพื่อนคนเก่ง',
        senderName: 'เราเอง',
        message: 'แวะมาปิ้งกำลังใจให้วันนี้ผ่านไปอย่างน่ารักและใจดีกับตัวเองเยอะๆ นะ',
        quoteText: 'ไม่ต้องรีบเติบโตให้ทันใคร แค่ค่อยๆ เป็นตัวเองในเวอร์ชันที่ใจดีขึ้นทุกวันก็พอ',
        quoteSource: 'Wongnai Beauty',
        createdAt: new Date().toISOString(),
      },
    ],
    reminders: [
      {
        id: 'rm_1',
        title: 'ดื่มน้ำเติมความสดชื่น 1 แก้ว',
        category: 'water',
        time: '10:30',
        repeat: 'daily',
        enabled: true,
      },
      {
        id: 'rm_2',
        title: 'เตรียมตัวเข้านอน พักสายตาจากหน้าจอ',
        category: 'sleep',
        time: '22:30',
        repeat: 'daily',
        enabled: true,
      },
      {
        id: 'rm_3',
        title: 'เช็กเดดไลน์งานที่ต้องส่งพรุ่งนี้',
        category: 'work',
        time: '19:00',
        repeat: 'weekdays',
        enabled: true,
      },
    ],
    notifications: [],
    soundEnabled: true,
    theme: 'light',
  };
}

interface AppContextValue {
  state: AppDataState;
  setState: React.Dispatch<React.SetStateAction<AppDataState>>;
  activeToast: TriggeredNotification | null;
  dismissToast: () => void;
  pushNotification: (title: string, category: ReminderCategory) => void;
  addTodo: (item: Omit<TodoItem, 'id' | 'createdAt'>) => void;
  toggleTodo: (id: string) => void;
  moveTodoToTomorrow: (id: string) => void;
  deleteTodo: (id: string) => void;
  addWeeklyRoutine: (item: Omit<WeeklyRoutineItem, 'id' | 'completedWeekKeys'>) => void;
  toggleWeeklyRoutine: (id: string, day: DayOfWeek) => void;
  deleteWeeklyRoutine: (id: string) => void;
  addCalendarEvent: (ev: Omit<CalendarEvent, 'id'>) => void;
  deleteCalendarEvent: (id: string) => void;
  addSleepEntry: (entry: Omit<SleepEntry, 'id'>) => void;
  deleteSleepEntry: (id: string) => void;
  addMealEntry: (entry: Omit<MealEntry, 'id'>) => void;
  deleteMealEntry: (id: string) => void;
  addWater: (date: string, deltaMl: number) => void;
  setDailyCalorieGoal: (goal: number) => void;
  addWorkout: (entry: Omit<WorkoutEntry, 'id'>) => void;
  toggleWorkout: (id: string) => void;
  deleteWorkout: (id: string) => void;
  addCycleEntry: (entry: Omit<CycleEntry, 'id'>) => void;
  updateCycleEntry: (id: string, patch: Partial<CycleEntry>) => void;
  deleteCycleEntry: (id: string) => void;
  setAverageCycleLength: (days: number) => void;
  addClassItem: (item: Omit<ClassItem, 'id'>) => void;
  deleteClassItem: (id: string) => void;
  addWorkTask: (item: Omit<WorkTaskItem, 'id'>) => void;
  updateWorkTaskStatus: (id: string, status: WorkTaskItem['status']) => void;
  deleteWorkTask: (id: string) => void;
  addSkill: (item: Omit<SkillItem, 'id'>) => void;
  logSkillHours: (id: string, addHours: number) => void;
  deleteSkill: (id: string) => void;
  addNote: (item: Omit<NoteItem, 'id' | 'updatedAt'>) => void;
  updateNote: (id: string, patch: Partial<NoteItem>) => void;
  deleteNote: (id: string) => void;
  addVent: (text: string, mood: string) => void;
  deleteVent: (id: string) => void;
  appendChatMessages: (msgs: ChatMessage[]) => void;
  clearChat: () => void;
  saveWebQuote: (item: Omit<SavedWebQuote, 'id' | 'createdAt'>) => void;
  deleteWebQuote: (id: string) => void;
  createPingLink: (item: Omit<PingShareLink, 'id' | 'createdAt'>) => PingShareLink;
  deletePingLink: (id: string) => void;
  updateOwnerProfile: (displayName: string, roleNote?: string) => void;
  switchUserProfile: (userKey: string, displayName?: string) => Promise<void>;
  supabaseConfigured: boolean;
  serviceRoleActive: boolean;
  passcodeRequired: boolean;
  ownerToken: string | null;
  ownerUnlocked: boolean;
  verifyOwnerPasscode: (passcode: string) => Promise<{ ok: boolean; error?: string }>;
  lockOwnerSession: () => void;
  syncNowToSupabase: () => Promise<{ ok: boolean; message: string }>;
  addReminder: (item: Omit<ReminderRule, 'id'>) => void;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  toggleTheme: () => void;
  toggleSound: () => void;
  exportBackup: () => void;
  importBackup: (jsonString: string) => boolean;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadLocalUserState(userKey: string, fallbackName = 'คุณปิ้ง'): AppDataState {
  try {
    const perUserRaw = localStorage.getItem(getStorageKeyForUser(userKey));
    if (perUserRaw) {
      const parsed = JSON.parse(perUserRaw) as Partial<AppDataState>;
      return {
        ...createInitialState(userKey, parsed.ownerProfile?.displayName || fallbackName),
        ...parsed,
        ownerProfile: {
          userKey,
          displayName: parsed.ownerProfile?.displayName || fallbackName,
          roleNote: parsed.ownerProfile?.roleNote || 'ผู้ใช้งานระบบ',
        },
      };
    }
    if (userKey === 'owner-ping') {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw) as Partial<AppDataState>;
        return {
          ...createInitialState('owner-ping', 'คุณปิ้ง'),
          ...parsed,
          ownerProfile: parsed.ownerProfile || {
            userKey: 'owner-ping',
            displayName: 'คุณปิ้ง',
            roleNote: 'เจ้าของบัญชีหลัก',
          },
        };
      }
    }
  } catch {
    // ignore corrupted storage
  }
  return createInitialState(userKey, fallbackName);
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeUserKey, setActiveUserKey] = useState<string>(() => {
    if (isPublicPingPath()) return 'public-guest';
    try {
      return localStorage.getItem(ACTIVE_USER_KEY_STORAGE) || 'owner-ping';
    } catch {
      return 'owner-ping';
    }
  });

  const [state, setState] = useState<AppDataState>(() => {
    if (isPublicPingPath()) {
      return createInitialState('public-guest', 'เพื่อนคนเก่ง');
    }
    return loadLocalUserState(activeUserKey);
  });

  const [activeToast, setActiveToast] = useState<TriggeredNotification | null>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [serviceRoleActive, setServiceRoleActive] = useState(false);
  const [passcodeRequired, setPasscodeRequired] = useState(false);
  const [ownerToken, setOwnerToken] = useState<string | null>(() => {
    if (isPublicPingPath()) return null;
    try {
      return sessionStorage.getItem('pinging_owner_token_v1');
    } catch {
      return null;
    }
  });

  // Check server auth/supabase configuration status (skip private checks on public /ปิ้ง route)
  useEffect(() => {
    if (isPublicPingPath()) return;
    let cancelled = false;
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((json: { supabaseConfigured?: boolean; serviceRoleActive?: boolean; passcodeRequired?: boolean }) => {
        if (cancelled) return;
        setSupabaseReady(Boolean(json.supabaseConfigured));
        setServiceRoleActive(Boolean(json.serviceRoleActive));
        setPasscodeRequired(Boolean(json.passcodeRequired));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate personal state ONLY for non-public routes and authorized owner
  useEffect(() => {
    if (isPublicPingPath()) return;
    if (passcodeRequired && !ownerToken) return;
    let cancelled = false;
    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (ownerToken) headers['x-owner-token'] = ownerToken;
        const res = await fetch(
          `/api/supabase/state?userKey=${encodeURIComponent(activeUserKey)}`,
          { headers }
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          configured?: boolean;
          data?: Partial<AppDataState> | null;
        };
        if (cancelled) return;
        if (json.data && typeof json.data === 'object') {
          setState((prev) => ({
            ...prev,
            ...json.data,
            ownerProfile: json.data?.ownerProfile || prev.ownerProfile,
          }));
        }
        if (json.configured) {
          setSupabaseReady(true);
        }
      } catch {
        // Fallback silently to localStorage when offline
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeUserKey, passcodeRequired, ownerToken]);

  useEffect(() => {
    if (isPublicPingPath()) return;
    try {
      localStorage.setItem(getStorageKeyForUser(activeUserKey), JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }

    if (passcodeRequired && !ownerToken) return;
    const timer = setTimeout(() => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ownerToken) headers['x-owner-token'] = ownerToken;
      fetch('/api/supabase/state', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ userKey: activeUserKey, state }),
      }).catch(() => {
        // ignore transient network failure
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [state, activeUserKey, passcodeRequired, ownerToken]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.theme]);

  const pushNotification = (title: string, category: ReminderCategory) => {
    const notif: TriggeredNotification = {
      id: generateId(),
      title,
      category,
      triggeredAt: new Date().toISOString(),
      read: false,
    };
    setState((prev) => ({
      ...prev,
      notifications: [notif, ...prev.notifications].slice(0, 50),
    }));
    setActiveToast(notif);
    if (state.soundEnabled) {
      playGentleChime();
    }
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Pinging Your Day', { body: title });
      } catch {
        // ignore in sandboxed iframes
      }
    }
  };

  // Real-time background reminder checker
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const todayISO = getTodayISO();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hh}:${mm}`;
      const day = now.getDay();

      setState((prev) => {
        let changed = false;
        const triggeredNow: TriggeredNotification[] = [];

        const updatedReminders = prev.reminders.map((r) => {
          if (!r.enabled) return r;
          if (r.time !== currentTime) return r;
          if (r.lastTriggeredDate === todayISO) return r;
          if (r.repeat === 'weekdays' && (day === 0 || day === 6)) return r;
          if (r.repeat === 'once' && r.onceDate && r.onceDate !== todayISO) return r;

          changed = true;
          triggeredNow.push({
            id: generateId(),
            title: r.title,
            category: r.category,
            triggeredAt: new Date().toISOString(),
            read: false,
          });
          return {
            ...r,
            lastTriggeredDate: todayISO,
            enabled: r.repeat === 'once' ? false : r.enabled,
          };
        });

        if (!changed) return prev;

        if (prev.soundEnabled) {
          playGentleChime();
        }
        if (triggeredNow[0]) {
          setActiveToast(triggeredNow[0]);
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('Pinging Your Day', { body: triggeredNow[0].title });
            } catch {
              // ignore
            }
          }
        }

        return {
          ...prev,
          reminders: updatedReminders,
          notifications: [...triggeredNow, ...prev.notifications].slice(0, 50),
        };
      });
    };

    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, []);

  const value: AppContextValue = {
    state,
    setState,
    activeToast,
    dismissToast: () => setActiveToast(null),
    pushNotification,
    addTodo: (item) =>
      setState((prev) => ({
        ...prev,
        todos: [{ ...item, id: generateId(), createdAt: new Date().toISOString() }, ...prev.todos],
      })),
    toggleTodo: (id) =>
      setState((prev) => ({
        ...prev,
        todos: prev.todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
      })),
    moveTodoToTomorrow: (id) => {
      const tmr = getTomorrowISO();
      setState((prev) => ({
        ...prev,
        todos: prev.todos.map((t) => (t.id === id ? { ...t, date: tmr } : t)),
      }));
    },
    deleteTodo: (id) =>
      setState((prev) => ({ ...prev, todos: prev.todos.filter((t) => t.id !== id) })),
    addWeeklyRoutine: (item) =>
      setState((prev) => ({
        ...prev,
        weeklyRoutines: [...prev.weeklyRoutines, { ...item, id: generateId(), completedWeekKeys: {} }],
      })),
    toggleWeeklyRoutine: (id, day) => {
      const key = `${getWeekKey()}_${day}`;
      setState((prev) => ({
        ...prev,
        weeklyRoutines: prev.weeklyRoutines.map((r) =>
          r.id === id
            ? {
                ...r,
                completedWeekKeys: {
                  ...r.completedWeekKeys,
                  [key]: !r.completedWeekKeys[key],
                },
              }
            : r
        ),
      }));
    },
    deleteWeeklyRoutine: (id) =>
      setState((prev) => ({
        ...prev,
        weeklyRoutines: prev.weeklyRoutines.filter((r) => r.id !== id),
      })),
    addCalendarEvent: (ev) =>
      setState((prev) => ({
        ...prev,
        calendarEvents: [...prev.calendarEvents, { ...ev, id: generateId() }],
      })),
    deleteCalendarEvent: (id) =>
      setState((prev) => ({
        ...prev,
        calendarEvents: prev.calendarEvents.filter((e) => e.id !== id),
      })),
    addSleepEntry: (entry) =>
      setState((prev) => ({
        ...prev,
        sleepEntries: [...prev.sleepEntries, { ...entry, id: generateId() }].sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
      })),
    deleteSleepEntry: (id) =>
      setState((prev) => ({
        ...prev,
        sleepEntries: prev.sleepEntries.filter((s) => s.id !== id),
      })),
    addMealEntry: (entry) =>
      setState((prev) => ({
        ...prev,
        mealEntries: [...prev.mealEntries, { ...entry, id: generateId() }],
      })),
    deleteMealEntry: (id) =>
      setState((prev) => ({
        ...prev,
        mealEntries: prev.mealEntries.filter((m) => m.id !== id),
      })),
    addWater: (date, deltaMl) =>
      setState((prev) => ({
        ...prev,
        waterIntakeByDate: {
          ...prev.waterIntakeByDate,
          [date]: Math.max(0, (prev.waterIntakeByDate[date] || 0) + deltaMl),
        },
      })),
    setDailyCalorieGoal: (goal) =>
      setState((prev) => ({ ...prev, dailyCalorieGoal: Math.max(800, goal) })),
    addWorkout: (entry) =>
      setState((prev) => ({
        ...prev,
        workouts: [{ ...entry, id: generateId() }, ...prev.workouts],
      })),
    toggleWorkout: (id) =>
      setState((prev) => ({
        ...prev,
        workouts: prev.workouts.map((w) => (w.id === id ? { ...w, completed: !w.completed } : w)),
      })),
    deleteWorkout: (id) =>
      setState((prev) => ({
        ...prev,
        workouts: prev.workouts.filter((w) => w.id !== id),
      })),
    addCycleEntry: (entry) =>
      setState((prev) => ({
        ...prev,
        cycleEntries: [...prev.cycleEntries, { ...entry, id: generateId() }].sort((a, b) =>
          a.startDate.localeCompare(b.startDate)
        ),
      })),
    updateCycleEntry: (id, patch) =>
      setState((prev) => ({
        ...prev,
        cycleEntries: prev.cycleEntries.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      })),
    deleteCycleEntry: (id) =>
      setState((prev) => ({
        ...prev,
        cycleEntries: prev.cycleEntries.filter((c) => c.id !== id),
      })),
    setAverageCycleLength: (days) =>
      setState((prev) => ({ ...prev, averageCycleLength: Math.min(45, Math.max(20, days)) })),
    addClassItem: (item) =>
      setState((prev) => ({
        ...prev,
        classes: [...prev.classes, { ...item, id: generateId() }],
      })),
    deleteClassItem: (id) =>
      setState((prev) => ({
        ...prev,
        classes: prev.classes.filter((c) => c.id !== id),
      })),
    addWorkTask: (item) =>
      setState((prev) => ({
        ...prev,
        workTasks: [...prev.workTasks, { ...item, id: generateId() }],
      })),
    updateWorkTaskStatus: (id, status) =>
      setState((prev) => ({
        ...prev,
        workTasks: prev.workTasks.map((w) => (w.id === id ? { ...w, status } : w)),
      })),
    deleteWorkTask: (id) =>
      setState((prev) => ({
        ...prev,
        workTasks: prev.workTasks.filter((w) => w.id !== id),
      })),
    addSkill: (item) =>
      setState((prev) => ({
        ...prev,
        skills: [...prev.skills, { ...item, id: generateId() }],
      })),
    logSkillHours: (id, addHours) =>
      setState((prev) => ({
        ...prev,
        skills: prev.skills.map((s) => {
          if (s.id !== id) return s;
          const nextHours = Math.max(0, Number((s.loggedHours + addHours).toFixed(1)));
          return {
            ...s,
            loggedHours: nextHours,
            status: nextHours >= s.targetHours ? 'completed' : 'learning',
          };
        }),
      })),
    deleteSkill: (id) =>
      setState((prev) => ({
        ...prev,
        skills: prev.skills.filter((s) => s.id !== id),
      })),
    addNote: (item) =>
      setState((prev) => ({
        ...prev,
        notes: [{ ...item, id: generateId(), updatedAt: new Date().toISOString() }, ...prev.notes],
      })),
    updateNote: (id, patch) =>
      setState((prev) => ({
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
        ),
      })),
    deleteNote: (id) =>
      setState((prev) => ({
        ...prev,
        notes: prev.notes.filter((n) => n.id !== id),
      })),
    addVent: (text, mood) =>
      setState((prev) => ({
        ...prev,
        vents: [
          { id: generateId(), text, mood, createdAt: new Date().toISOString() },
          ...prev.vents,
        ],
      })),
    deleteVent: (id) =>
      setState((prev) => ({
        ...prev,
        vents: prev.vents.filter((v) => v.id !== id),
      })),
    appendChatMessages: (msgs) =>
      setState((prev) => ({
        ...prev,
        chatMessages: [...prev.chatMessages, ...msgs],
      })),
    clearChat: () =>
      setState((prev) => ({
        ...prev,
        chatMessages: [
          {
            id: generateId(),
            role: 'model',
            text: 'เริ่มบทสนทนาใหม่เรียบร้อยแล้ว เล่าเรื่องที่อยู่ในใจได้เลยนะ น้องปิ้งพร้อมรับฟังเสมอ',
            createdAt: new Date().toISOString(),
          },
        ],
      })),
    saveWebQuote: (item) =>
      setState((prev) => {
        const exists = prev.savedQuotes.some((q) => q.quote === item.quote);
        if (exists) return prev;
        return {
          ...prev,
          savedQuotes: [
            {
              ...item,
              ownerKey: prev.ownerProfile?.userKey || activeUserKey,
              ownerName: prev.ownerProfile?.displayName || 'คุณปิ้ง',
              id: generateId(),
              createdAt: new Date().toISOString(),
            },
            ...prev.savedQuotes,
          ],
        };
      }),
    deleteWebQuote: (id) =>
      setState((prev) => ({
        ...prev,
        savedQuotes: prev.savedQuotes.filter((q) => q.id !== id),
      })),
    createPingLink: (item) => {
      const raw = item.slug
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\u0E00-\u0E7Fa-z0-9_-]/g, '')
        .slice(0, 32);
      const cleanSlug = raw || `ปิ้ง-${Date.now().toString(36).slice(-4)}`;
      const ownerKey = item.ownerKey || state.ownerProfile?.userKey || activeUserKey;
      const ownerName = item.ownerName || state.ownerProfile?.displayName || 'คุณปิ้ง';
      const created: PingShareLink = {
        ...item,
        slug: cleanSlug,
        ownerKey,
        ownerName,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        pingLinks: [created, ...prev.pingLinks.filter((p) => p.slug !== cleanSlug)],
      }));
      fetch('/api/supabase/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(created),
      }).catch(() => {});
      return created;
    },
    deletePingLink: (id) =>
      setState((prev) => ({
        ...prev,
        pingLinks: prev.pingLinks.filter((p) => p.id !== id),
      })),
    updateOwnerProfile: (displayName, roleNote) => {
      const cleanName = displayName.trim() || 'คุณปิ้ง';
      setState((prev) => ({
        ...prev,
        ownerProfile: {
          ...prev.ownerProfile,
          userKey: prev.ownerProfile?.userKey || activeUserKey,
          displayName: cleanName,
          roleNote: roleNote !== undefined ? roleNote.trim() : prev.ownerProfile?.roleNote,
        },
      }));
    },
    switchUserProfile: async (nextUserKey, nextDisplayName) => {
      const sanitizedKey =
        nextUserKey
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\u0E00-\u0E7Fa-z0-9_-]/g, '')
          .slice(0, 40) || 'owner-ping';
      const label = (nextDisplayName || sanitizedKey).trim();
      try {
        localStorage.setItem(ACTIVE_USER_KEY_STORAGE, sanitizedKey);
      } catch {
        // ignore
      }
      setActiveUserKey(sanitizedKey);
      const localNext = loadLocalUserState(sanitizedKey, label);
      setState(localNext);

      try {
        const headers: Record<string, string> = {};
        if (ownerToken) headers['x-owner-token'] = ownerToken;
        const res = await fetch(
          `/api/supabase/state?userKey=${encodeURIComponent(sanitizedKey)}`,
          { headers }
        );
        if (res.ok) {
          const json = (await res.json()) as { data?: Partial<AppDataState> | null };
          if (json.data && typeof json.data === 'object') {
            setState((prev) => ({
              ...prev,
              ...json.data,
              ownerProfile: json.data?.ownerProfile || prev.ownerProfile,
            }));
          }
        }
      } catch {
        // ignore
      }
    },
    supabaseConfigured: supabaseReady,
    serviceRoleActive,
    passcodeRequired,
    ownerToken,
    ownerUnlocked: !passcodeRequired || Boolean(ownerToken),
    verifyOwnerPasscode: async (passcode) => {
      try {
        const res = await fetch('/api/admin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode }),
        });
        const data = (await res.json()) as { ok?: boolean; token?: string; error?: string };
        if (!res.ok || !data.ok || !data.token) {
          return { ok: false, error: data.error || 'รหัสผ่านไม่ถูกต้อง' };
        }
        setOwnerToken(data.token);
        try {
          sessionStorage.setItem('pinging_owner_token_v1', data.token);
        } catch {
          // ignore
        }
        return { ok: true };
      } catch {
        return { ok: false, error: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้' };
      }
    },
    lockOwnerSession: () => {
      setOwnerToken(null);
      try {
        sessionStorage.removeItem('pinging_owner_token_v1');
      } catch {
        // ignore
      }
    },
    syncNowToSupabase: async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (ownerToken) headers['x-owner-token'] = ownerToken;
        const res = await fetch('/api/supabase/state', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ userKey: activeUserKey, state }),
        });
        const data = await res.json();
        if (!data.configured) {
          return {
            ok: false,
            message: 'บันทึกบนเซิร์ฟเวอร์แล้ว (หากต้องการซิงก์ Supabase ด้วย กรุณาตั้งค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน Secrets)',
          };
        }
        if (!res.ok || !data.saved) {
          return { ok: false, message: data.error || 'ซิงก์ไม่สำเร็จ' };
        }
        return { ok: true, message: 'ซิงก์ข้อมูลทั้งหมดขึ้น Supabase เรียบร้อยแล้ว' };
      } catch {
        return { ok: false, message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' };
      }
    },
    addReminder: (item) =>
      setState((prev) => ({
        ...prev,
        reminders: [...prev.reminders, { ...item, id: generateId() }],
      })),
    toggleReminder: (id) =>
      setState((prev) => ({
        ...prev,
        reminders: prev.reminders.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
      })),
    deleteReminder: (id) =>
      setState((prev) => ({
        ...prev,
        reminders: prev.reminders.filter((r) => r.id !== id),
      })),
    markAllNotificationsRead: () =>
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, read: true })),
      })),
    clearNotifications: () =>
      setState((prev) => ({ ...prev, notifications: [] })),
    toggleTheme: () =>
      setState((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' })),
    toggleSound: () =>
      setState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled })),
    exportBackup: () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pinging-your-day-backup-${getTodayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    importBackup: (jsonString) => {
      try {
        const parsed = JSON.parse(jsonString) as Partial<AppDataState>;
        if (!parsed || typeof parsed !== 'object') return false;
        setState((prev) => ({ ...prev, ...parsed }));
        return true;
      } catch {
        return false;
      }
    },
    resetAllData: () => {
      const fresh = createInitialState();
      setState(fresh);
    },
  };

  return React.createElement(AppContext.Provider, { value }, children);
};

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used inside AppProvider');
  return ctx;
}
