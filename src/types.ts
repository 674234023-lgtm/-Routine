export type MainCategory = 'overview' | 'daily' | 'health' | 'study' | 'care';

export type DailySubTab = 'todos' | 'weekly' | 'calendar-clock';
export type HealthSubTab = 'sleep' | 'calories' | 'workout' | 'cycle';
export type StudySubTab = 'classes' | 'tasks' | 'skills';
export type CareSubTab = 'notes' | 'support' | 'notifications';

export type PriorityLevel = 'high' | 'medium' | 'low';

export interface TodoItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  timeSlot?: string; // HH:MM
  priority: PriorityLevel;
  category: string;
  completed: boolean;
  createdAt: string;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sun, 1 = Mon ... 6 = Sat

export interface WeeklyRoutineItem {
  id: string;
  title: string;
  days: DayOfWeek[];
  time?: string;
  category: string;
  completedWeekKeys: Record<string, boolean>; // key: `${weekKey}_${day}`
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  category: string;
  note?: string;
}

export interface SleepEntry {
  id: string;
  date: string; // YYYY-MM-DD (wake up date)
  bedTime: string; // HH:MM
  wakeTime: string; // HH:MM
  durationMinutes: number;
  quality: 'deep' | 'good' | 'light' | 'poor';
  note?: string;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealEntry {
  id: string;
  date: string; // YYYY-MM-DD
  slot: MealSlot;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WorkoutEntry {
  id: string;
  dayOfWeek: DayOfWeek;
  date: string; // YYYY-MM-DD
  type: 'strength' | 'cardio' | 'mobility' | 'rest';
  exercise: string;
  sets?: number;
  reps?: number;
  weightKg?: number;
  durationMinutes: number;
  caloriesBurned: number;
  completed: boolean;
  note?: string;
}

export interface CycleEntry {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  flow: 'light' | 'medium' | 'heavy';
  symptoms: string[];
  selfCareDone: string[];
  note?: string;
}

export interface ClassItem {
  id: string;
  code: string;
  name: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  room: string;
  instructor: string;
  note?: string;
}

export type WorkStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface WorkTaskItem {
  id: string;
  title: string;
  projectOrCourse: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  priority: PriorityLevel;
  status: WorkStatus;
  note?: string;
}

export interface SkillItem {
  id: string;
  name: string;
  platform: string;
  resourceUrl?: string;
  targetHours: number;
  loggedHours: number;
  status: 'learning' | 'paused' | 'completed';
  notes: string;
}

export type NoteType = 'diary' | 'general' | 'link';

export interface NoteItem {
  id: string;
  type: NoteType;
  title: string;
  content: string;
  url?: string;
  mood?: string;
  pinned: boolean;
  updatedAt: string;
}

export interface VentEntry {
  id: string;
  text: string;
  mood: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: string;
}

export type ReminderCategory =
  | 'water'
  | 'sleep'
  | 'meal'
  | 'study'
  | 'work'
  | 'workout'
  | 'general';

export interface ReminderRule {
  id: string;
  title: string;
  category: ReminderCategory;
  time: string; // HH:MM
  repeat: 'daily' | 'weekdays' | 'once';
  onceDate?: string; // YYYY-MM-DD
  enabled: boolean;
  lastTriggeredDate?: string; // YYYY-MM-DD
}

export interface TriggeredNotification {
  id: string;
  title: string;
  category: ReminderCategory;
  triggeredAt: string; // ISO
  read: boolean;
}

export interface OwnerProfile {
  userKey: string;
  displayName: string;
  roleNote?: string;
}

export interface SavedWebQuote {
  id: string;
  quote: string;
  sourceName: string;
  sourceUrl?: string;
  topic?: string;
  note?: string;
  ownerKey?: string;
  ownerName?: string;
  createdAt: string;
}

export interface PingShareLink {
  id: string;
  slug: string; // URL path after /ปิ้ง/
  friendName: string;
  senderName: string;
  message: string;
  quoteText: string;
  quoteSource?: string;
  ownerKey?: string;
  ownerName?: string;
  createdAt: string;
}

export interface AppDataState {
  ownerProfile: OwnerProfile;
  todos: TodoItem[];
  weeklyRoutines: WeeklyRoutineItem[];
  calendarEvents: CalendarEvent[];
  sleepEntries: SleepEntry[];
  mealEntries: MealEntry[];
  dailyCalorieGoal: number;
  waterIntakeByDate: Record<string, number>; // ml
  workouts: WorkoutEntry[];
  cycleEntries: CycleEntry[];
  averageCycleLength: number;
  classes: ClassItem[];
  workTasks: WorkTaskItem[];
  skills: SkillItem[];
  notes: NoteItem[];
  vents: VentEntry[];
  chatMessages: ChatMessage[];
  savedQuotes: SavedWebQuote[];
  pingLinks: PingShareLink[];
  reminders: ReminderRule[];
  notifications: TriggeredNotification[];
  soundEnabled: boolean;
  theme: 'light' | 'dark';
}
