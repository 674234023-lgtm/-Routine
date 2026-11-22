import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb' }));

const SERVER_EPHEMERAL_SALT = crypto.randomBytes(16).toString('hex');

function getConfiguredOwnerPasscode(): string | null {
  const raw = process.env.OWNER_PASSCODE;
  if (!raw || raw === 'MY_OWNER_PASSCODE') return null;
  return raw.trim();
}

function getEffectivePasscode(): string {
  return getConfiguredOwnerPasscode() || '1234';
}

function signOwnerToken(): string {
  const secret = `${getEffectivePasscode()}:${process.env.SUPABASE_SERVICE_ROLE_KEY || SERVER_EPHEMERAL_SALT}`;
  const issuedAt = String(Date.now());
  const sig = crypto.createHmac('sha256', secret).update(issuedAt).digest('hex');
  return `${issuedAt}.${sig}`;
}

function verifyOwnerToken(token: string | undefined): boolean {
  if (!token || !token.includes('.')) return false;
  const [issuedAt, providedSig] = token.split('.');
  if (!issuedAt || !providedSig) return false;
  const ageMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 7 * 24 * 60 * 60 * 1000) {
    return false;
  }
  const secret = `${getEffectivePasscode()}:${process.env.SUPABASE_SERVICE_ROLE_KEY || SERVER_EPHEMERAL_SALT}`;
  const expectedSig = crypto.createHmac('sha256', secret).update(issuedAt).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getOpenAIConfig(): { apiKey: string; model: string } | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'MY_OPENAI_API_KEY') {
    return null;
  }
  return {
    apiKey: apiKey.trim(),
    model: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
  };
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key || url === 'MY_SUPABASE_URL' || key === 'MY_SUPABASE_ANON_KEY') {
    return null;
  }
  return createClient(url, key);
}

function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('172.')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const QUOTE_SOURCES: Record<string, { label: string; siteQuery: string }> = {
  wongnai: { label: 'Wongnai Beauty', siteQuery: 'site:wongnai.com' },
  linetoday: { label: 'LINE TODAY', siteQuery: 'site:today.line.me' },
  asianparent: { label: 'theAsianparent Thailand', siteQuery: 'site:th.theasianparent.com' },
  salehere: { label: 'Sale Here', siteQuery: 'site:salehere.co.th' },
  shopee: { label: 'Shopee Blog', siteQuery: 'site:shopee.co.th/blog' },
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/auth/status', (_req, res) => {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseConfigured = Boolean(
    url &&
      url !== 'MY_SUPABASE_URL' &&
      ((serviceKey && serviceKey !== 'MY_SUPABASE_SERVICE_ROLE_KEY') ||
        (anonKey && anonKey !== 'MY_SUPABASE_ANON_KEY'))
  );
  const serviceRoleActive = Boolean(
    serviceKey && serviceKey !== 'MY_SUPABASE_SERVICE_ROLE_KEY'
  );
  const passcodeRequired = Boolean(getConfiguredOwnerPasscode());
  const openaiConfigured = Boolean(getOpenAIConfig());
  res.json({
    supabaseConfigured,
    serviceRoleActive,
    passcodeRequired,
    openaiConfigured,
  });
});

app.post('/api/admin/verify', (req, res) => {
  const { passcode } = req.body as { passcode?: string };
  const expected = getEffectivePasscode();
  if (!passcode || passcode.trim() !== expected) {
    return res.status(401).json({
      ok: false,
      error: getConfiguredOwnerPasscode()
        ? 'รหัสผ่านเจ้าของระบบไม่ถูกต้อง'
        : 'รหัสผ่านไม่ถูกต้อง (รหัสเริ่มต้นคือ 1234)',
    });
  }
  const token = signOwnerToken();
  return res.json({ ok: true, token });
});

// --- Server-side Persistent Store (Multi-Person Organized + Share Links) ---
interface StoredPingLink {
  slug: string;
  friend_name: string;
  sender_name: string;
  message: string;
  quote_text: string;
  quote_source?: string | null;
  owner_key: string;
  owner_name: string;
  created_at: string;
}

interface StoredUserStateRecord {
  userKey: string;
  updatedAt: string;
  state: Record<string, unknown>;
}

const LOCAL_PING_LINKS_FILE = path.join(os.tmpdir(), 'pinging-your-day-share-links.json');
const LOCAL_USER_STATES_FILE = path.join(os.tmpdir(), 'pinging-your-day-user-states.json');
const localPingLinksMap = new Map<string, StoredPingLink>();
const localUserStatesMap = new Map<string, StoredUserStateRecord>();

function loadLocalStores() {
  try {
    if (fs.existsSync(LOCAL_PING_LINKS_FILE)) {
      const raw = fs.readFileSync(LOCAL_PING_LINKS_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, StoredPingLink>;
      for (const [k, v] of Object.entries(parsed)) {
        if (v && v.slug) {
          localPingLinksMap.set(k, {
            ...v,
            owner_key: v.owner_key || 'owner-ping',
            owner_name: v.owner_name || 'คุณปิ้ง',
          });
        }
      }
    }
  } catch {
    // ignore corrupt temp cache
  }
  if (!localPingLinksMap.has('ปิ้ง-กำลังใจ')) {
    localPingLinksMap.set('ปิ้ง-กำลังใจ', {
      slug: 'ปิ้ง-กำลังใจ',
      friend_name: 'เพื่อนคนเก่ง',
      sender_name: 'คุณปิ้ง',
      message: 'แวะมาปิ้งกำลังใจให้วันนี้ผ่านไปอย่างน่ารักและใจดีกับตัวเองเยอะๆ นะ',
      quote_text: 'ไม่ต้องรีบเติบโตให้ทันใคร แค่ค่อยๆ เป็นตัวเองในเวอร์ชันที่ใจดีขึ้นทุกวันก็พอ',
      quote_source: 'Wongnai Beauty',
      owner_key: 'owner-ping',
      owner_name: 'คุณปิ้ง',
      created_at: new Date().toISOString(),
    });
  }

  try {
    if (fs.existsSync(LOCAL_USER_STATES_FILE)) {
      const raw = fs.readFileSync(LOCAL_USER_STATES_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, StoredUserStateRecord>;
      for (const [k, v] of Object.entries(parsed)) {
        if (v && v.userKey && v.state) {
          localUserStatesMap.set(k, v);
        }
      }
    }
  } catch {
    // ignore corrupt temp cache
  }
}

function persistLocalPingLinks() {
  try {
    const obj: Record<string, StoredPingLink> = {};
    for (const [k, v] of localPingLinksMap.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(LOCAL_PING_LINKS_FILE, JSON.stringify(obj), 'utf8');
  } catch {
    // ignore disk write errors
  }
}

function persistLocalUserStates() {
  try {
    const obj: Record<string, StoredUserStateRecord> = {};
    for (const [k, v] of localUserStatesMap.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(LOCAL_USER_STATES_FILE, JSON.stringify(obj), 'utf8');
  } catch {
    // ignore disk write errors
  }
}

loadLocalStores();

function normalizePingSlug(rawSlug: string): string {
  try {
    return decodeURIComponent(rawSlug).trim().slice(0, 60);
  } catch {
    return rawSlug.trim().slice(0, 60);
  }
}

function buildPersonSummary(
  userKey: string,
  stateJson: Record<string, unknown>,
  updatedAt: string,
  allQuotes: Array<{ id: string; user_key?: string; quote: string; source_name: string; created_at?: string }>,
  allLinks: Array<StoredPingLink>
) {
  const ownerProfile = (stateJson.ownerProfile as Record<string, unknown> | undefined) || {};
  const displayName = String(
    ownerProfile.displayName || (userKey === 'owner-ping' || userKey === 'default-owner' ? 'คุณปิ้ง' : userKey)
  );
  const roleNote = ownerProfile.roleNote ? String(ownerProfile.roleNote) : 'ผู้ใช้งานระบบ';

  const arr = (k: string) => (Array.isArray(stateJson[k]) ? (stateJson[k] as Array<Record<string, unknown>>) : []);
  const todos = arr('todos');
  const weeklyRoutines = arr('weeklyRoutines');
  const calendarEvents = arr('calendarEvents');
  const sleepEntries = arr('sleepEntries');
  const mealEntries = arr('mealEntries');
  const workouts = arr('workouts');
  const cycleEntries = arr('cycleEntries');
  const classes = arr('classes');
  const workTasks = arr('workTasks');
  const skills = arr('skills');
  const notes = arr('notes');
  const vents = arr('vents');
  const stateQuotes = arr('savedQuotes');
  const stateLinks = arr('pingLinks');

  const userQuotes = allQuotes.filter((q) => (q.user_key || 'owner-ping') === userKey);
  const mergedQuotes =
    userQuotes.length > 0
      ? userQuotes
      : stateQuotes.map((q) => ({
          id: String(q.id || ''),
          user_key: userKey,
          quote: String(q.quote || ''),
          source_name: String(q.sourceName || 'Pinging Your Day'),
          created_at: q.createdAt ? String(q.createdAt) : updatedAt,
        }));

  const userLinks = allLinks.filter((l) => (l.owner_key || 'owner-ping') === userKey);
  const mergedLinks =
    userLinks.length > 0
      ? userLinks
      : stateLinks.map((l) => ({
          slug: String(l.slug || ''),
          friend_name: String(l.friendName || ''),
          sender_name: String(l.senderName || displayName),
          message: String(l.message || ''),
          quote_text: String(l.quoteText || ''),
          quote_source: l.quoteSource ? String(l.quoteSource) : null,
          owner_key: userKey,
          owner_name: displayName,
          created_at: l.createdAt ? String(l.createdAt) : updatedAt,
        }));

  return {
    userKey,
    displayName,
    roleNote,
    updatedAt,
    stats: {
      todosCount: todos.length,
      pendingTodosCount: todos.filter((t) => !t.completed).length,
      routinesCount: weeklyRoutines.length,
      eventsCount: calendarEvents.length,
      sleepCount: sleepEntries.length,
      mealsCount: mealEntries.length,
      workoutsCount: workouts.length,
      cycleCount: cycleEntries.length,
      classesCount: classes.length,
      workTasksCount: workTasks.length,
      skillsCount: skills.length,
      notesCount: notes.length,
      ventsCount: vents.length,
      quotesCount: mergedQuotes.length,
      pingLinksCount: mergedLinks.length,
    },
    recentTodos: todos.slice(0, 5).map((t) => ({
      id: String(t.id || ''),
      title: String(t.title || ''),
      date: String(t.date || ''),
      completed: Boolean(t.completed),
      category: String(t.category || ''),
    })),
    recentNotes: notes.slice(0, 5).map((n) => ({
      id: String(n.id || ''),
      title: String(n.title || ''),
      type: String(n.type || 'general'),
      mood: n.mood ? String(n.mood) : undefined,
      updatedAt: String(n.updatedAt || updatedAt),
    })),
    recentWork: workTasks.slice(0, 5).map((w) => ({
      id: String(w.id || ''),
      title: String(w.title || ''),
      dueDate: String(w.dueDate || ''),
      status: String(w.status || 'todo'),
    })),
    savedQuotes: mergedQuotes.slice(0, 12),
    shareLinks: mergedLinks.slice(0, 12),
  };
}

app.get('/api/admin/db-summary', async (req, res) => {
  const token = req.header('x-owner-token');
  if (!verifyOwnerToken(token)) {
    return res.status(401).json({ error: 'กรุณายืนยันรหัสผ่านผู้ดูแลระบบก่อนดูข้อมูลส่วนตัว' });
  }

  const supabase = getSupabaseClient();
  let stateRows: Array<{ user_key: string; updated_at: string; state_json: Record<string, unknown> }> = [];
  let quoteRows: Array<{ id: string; user_key?: string; quote: string; source_name: string; created_at?: string }> = [];
  let linkRows: Array<StoredPingLink> = [];
  const errors: string[] = [];

  if (supabase) {
    try {
      const [stateRes, quotesRes, linksRes] = await Promise.all([
        supabase
          .from('pinging_app_state')
          .select('user_key, updated_at, state_json')
          .order('updated_at', { ascending: false })
          .limit(50),
        supabase
          .from('pinging_saved_quotes')
          .select('id, user_key, quote, source_name, created_at')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('pinging_share_links')
          .select('slug, friend_name, sender_name, message, quote_text, quote_source, owner_key, owner_name, created_at')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (stateRes.error) errors.push(stateRes.error.message);
      if (quotesRes.error) errors.push(quotesRes.error.message);
      if (linksRes.error) errors.push(linksRes.error.message);

      stateRows = (stateRes.data || []) as typeof stateRows;
      quoteRows = (quotesRes.data || []) as typeof quoteRows;
      linkRows = ((linksRes.data || []) as Array<Partial<StoredPingLink>>).map((l) => ({
        slug: String(l.slug || ''),
        friend_name: String(l.friend_name || ''),
        sender_name: String(l.sender_name || ''),
        message: String(l.message || ''),
        quote_text: String(l.quote_text || ''),
        quote_source: l.quote_source || null,
        owner_key: String(l.owner_key || 'owner-ping'),
        owner_name: String(l.owner_name || 'คุณปิ้ง'),
        created_at: String(l.created_at || new Date().toISOString()),
      }));
    } catch (err: unknown) {
      errors.push(err instanceof Error ? err.message : 'ไม่สามารถอ่านข้อมูลจาก Supabase ได้');
    }
  }

  // Merge local server records when not already present in Supabase
  const seenKeys = new Set(stateRows.map((r) => r.user_key));
  for (const localRec of localUserStatesMap.values()) {
    if (!seenKeys.has(localRec.userKey)) {
      stateRows.push({
        user_key: localRec.userKey,
        updated_at: localRec.updatedAt,
        state_json: localRec.state,
      });
    }
  }

  const seenSlugs = new Set(linkRows.map((l) => l.slug));
  for (const localLink of localPingLinksMap.values()) {
    if (!seenSlugs.has(localLink.slug)) {
      linkRows.push(localLink);
    }
  }

  const people = stateRows.map((row) =>
    buildPersonSummary(
      row.user_key,
      row.state_json || {},
      row.updated_at,
      quoteRows,
      linkRows
    )
  );

  // Include any share-link-only owners who don't yet have an app_state row
  const knownOwnerKeys = new Set(people.map((p) => p.userKey));
  for (const l of linkRows) {
    if (!knownOwnerKeys.has(l.owner_key)) {
      knownOwnerKeys.add(l.owner_key);
      people.push(
        buildPersonSummary(
          l.owner_key,
          { ownerProfile: { userKey: l.owner_key, displayName: l.owner_name, roleNote: 'ผู้ส่งลิงก์ปิ้ง' } },
          l.created_at,
          quoteRows,
          linkRows
        )
      );
    }
  }

  return res.json({
    configured: Boolean(supabase),
    serviceRoleActive: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY !== 'MY_SUPABASE_SERVICE_ROLE_KEY'
    ),
    passcodeRequired: Boolean(getConfiguredOwnerPasscode()),
    errors,
    people,
    appStates: people.map((p) => ({
      userKey: p.userKey,
      displayName: p.displayName,
      updatedAt: p.updatedAt,
      todosCount: p.stats.todosCount,
      notesCount: p.stats.notesCount,
      sleepCount: p.stats.sleepCount,
    })),
    savedQuotes: quoteRows,
    shareLinks: linkRows,
  });
});

app.get('/api/admin/person/:userKey', async (req, res) => {
  const token = req.header('x-owner-token');
  if (!verifyOwnerToken(token)) {
    return res.status(401).json({ error: 'กรุณายืนยันรหัสผ่านผู้ดูแลระบบ' });
  }
  const userKey = normalizePingSlug(String(req.params.userKey || ''));
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('pinging_app_state')
        .select('state_json, updated_at')
        .eq('user_key', userKey)
        .maybeSingle();
      if (data?.state_json) {
        return res.json({ userKey, state: data.state_json, updatedAt: data.updated_at });
      }
    } catch {
      // fall through to local store
    }
  }
  const localRec = localUserStatesMap.get(userKey);
  if (!localRec) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลของผู้ใช้งานรายนี้' });
  }
  return res.json({ userKey, state: localRec.state, updatedAt: localRec.updatedAt });
});

// --- Private User State Sync Endpoints ---
app.get('/api/supabase/state', async (req, res) => {
  if (getConfiguredOwnerPasscode() && !verifyOwnerToken(req.header('x-owner-token'))) {
    return res.status(401).json({
      configured: Boolean(getSupabaseClient()),
      locked: true,
      error: 'ต้องยืนยันรหัสเจ้าของระบบ (OWNER_PASSCODE) เพื่อโหลดข้อมูลส่วนตัว',
      data: null,
    });
  }

  const userKey = String(req.query.userKey || 'owner-ping').slice(0, 120);
  const supabase = getSupabaseClient();
  const localRec = localUserStatesMap.get(userKey);

  if (!supabase) {
    return res.json({
      configured: false,
      data: localRec?.state ?? null,
      updatedAt: localRec?.updatedAt ?? null,
    });
  }

  try {
    const { data, error } = await supabase
      .from('pinging_app_state')
      .select('state_json, updated_at')
      .eq('user_key', userKey)
      .maybeSingle();

    if (error) {
      return res.json({
        configured: true,
        data: localRec?.state ?? null,
        updatedAt: localRec?.updatedAt ?? null,
      });
    }

    return res.json({
      configured: true,
      data: data?.state_json ?? localRec?.state ?? null,
      updatedAt: data?.updated_at ?? localRec?.updatedAt ?? null,
    });
  } catch {
    return res.json({
      configured: true,
      data: localRec?.state ?? null,
      updatedAt: localRec?.updatedAt ?? null,
    });
  }
});

app.put('/api/supabase/state', async (req, res) => {
  if (getConfiguredOwnerPasscode() && !verifyOwnerToken(req.header('x-owner-token'))) {
    return res.status(401).json({
      configured: Boolean(getSupabaseClient()),
      saved: false,
      locked: true,
      error: 'ต้องยืนยันรหัสเจ้าของระบบ (OWNER_PASSCODE) เพื่อบันทึกขึ้นฐานข้อมูล',
    });
  }

  const { userKey = 'owner-ping', state } = req.body as {
    userKey?: string;
    state?: Record<string, unknown>;
  };

  if (!state || typeof state !== 'object') {
    return res.status(400).json({ error: 'Invalid state payload' });
  }

  const safeKey = String(userKey).slice(0, 120);
  const nowISO = new Date().toISOString();

  // Always update server-side per-person store so Admin Backoffice has organized live view
  localUserStatesMap.set(safeKey, {
    userKey: safeKey,
    updatedAt: nowISO,
    state,
  });
  persistLocalUserStates();

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.json({ configured: false, saved: true, updatedAt: nowISO });
  }

  try {
    const { error } = await supabase.from('pinging_app_state').upsert(
      {
        user_key: safeKey,
        state_json: state,
        updated_at: nowISO,
      },
      { onConflict: 'user_key' }
    );

    if (error) {
      return res.status(500).json({ configured: true, saved: false, error: error.message });
    }

    const savedQuotes = Array.isArray(state.savedQuotes) ? state.savedQuotes : [];
    if (savedQuotes.length > 0) {
      const rows = savedQuotes.slice(0, 50).map((q: Record<string, unknown>) => ({
        id: String(q.id || ''),
        user_key: String(q.ownerKey || safeKey),
        quote: String(q.quote || ''),
        source_name: String(q.sourceName || ''),
        source_url: q.sourceUrl ? String(q.sourceUrl) : null,
        topic: q.topic ? String(q.topic) : null,
      }));
      await supabase.from('pinging_saved_quotes').upsert(rows, { onConflict: 'id' });
    }

    return res.json({ configured: true, saved: true, updatedAt: nowISO });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Supabase write failed';
    return res.status(500).json({ configured: true, saved: false, error: msg });
  }
});

// --- Public Shareable /ปิ้ง/:slug Links (STRICTLY NO private data, NO owner keys, NO quote sources) ---
app.get('/api/supabase/ping/:slug', async (req, res) => {
  const slug = normalizePingSlug(String(req.params.slug || ''));
  const localRaw = localPingLinksMap.get(slug) || null;
  const sanitizePublicCard = (card: StoredPingLink | Record<string, unknown> | null) =>
    card
      ? {
          slug: String(card.slug || slug),
          friend_name: String(card.friend_name || 'เพื่อนคนเก่ง'),
          sender_name: String(card.sender_name || 'คนส่งกำลังใจ'),
          message: String(card.message || ''),
          quote_text: String(card.quote_text || ''),
          created_at: String(card.created_at || new Date().toISOString()),
        }
      : null;

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.json({ configured: false, link: sanitizePublicCard(localRaw) });
  }

  try {
    const { data, error } = await supabase
      .from('pinging_share_links')
      .select('slug, friend_name, sender_name, message, quote_text, created_at')
      .eq('slug', slug)
      .maybeSingle();
    if (error) {
      return res.json({ configured: true, link: sanitizePublicCard(localRaw) });
    }
    return res.json({ configured: true, link: sanitizePublicCard(data || localRaw) });
  } catch {
    return res.json({ configured: true, link: sanitizePublicCard(localRaw) });
  }
});

app.post('/api/supabase/ping', async (req, res) => {
  const {
    slug,
    friendName,
    senderName,
    message,
    quoteText,
    quoteSource,
    ownerKey,
    ownerName,
  } = req.body as {
    slug?: string;
    friendName?: string;
    senderName?: string;
    message?: string;
    quoteText?: string;
    quoteSource?: string;
    ownerKey?: string;
    ownerName?: string;
  };
  if (!slug || !quoteText) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อลิงก์และข้อความคำคม' });
  }

  const cleanSlug = normalizePingSlug(String(slug));
  const record: StoredPingLink = {
    slug: cleanSlug,
    friend_name: String(friendName || 'เพื่อนคนเก่ง').slice(0, 80),
    sender_name: String(senderName || 'เพื่อนของคุณ').slice(0, 80),
    message: String(message || '').slice(0, 500),
    quote_text: String(quoteText).slice(0, 500),
    quote_source: quoteSource ? String(quoteSource).slice(0, 120) : null,
    owner_key: String(ownerKey || 'owner-ping').slice(0, 120),
    owner_name: String(ownerName || senderName || 'คุณปิ้ง').slice(0, 80),
    created_at: new Date().toISOString(),
  };

  localPingLinksMap.set(cleanSlug, record);
  persistLocalPingLinks();

  const publicLink = {
    slug: record.slug,
    friend_name: record.friend_name,
    sender_name: record.sender_name,
    message: record.message,
    quote_text: record.quote_text,
    created_at: record.created_at,
  };

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.json({ configured: false, saved: true, link: publicLink });
  }

  try {
    const { error } = await supabase.from('pinging_share_links').upsert(
      record,
      { onConflict: 'slug' }
    );
    if (error) {
      // Fallback upsert without owner columns in case older schema hasn't run ALTER TABLE yet
      await supabase.from('pinging_share_links').upsert(
        {
          slug: record.slug,
          friend_name: record.friend_name,
          sender_name: record.sender_name,
          message: record.message,
          quote_text: record.quote_text,
          quote_source: record.quote_source,
          created_at: record.created_at,
        },
        { onConflict: 'slug' }
      );
    }
    return res.json({ configured: true, saved: true, link: publicLink });
  } catch {
    return res.json({ configured: true, saved: true, link: publicLink });
  }
});

// --- Web Quote Extractor (Wongnai Beauty, LINE TODAY, theAsianparent, Sale Here, Shopee Blog, Custom URL) ---
app.post('/api/quotes/fetch-web', async (req, res) => {
  try {
    const { source, topic, customUrl } = req.body as {
      source?: string;
      topic?: string;
      customUrl?: string;
    };

    const ai = getGeminiClient();

    if (source === 'custom' && customUrl) {
      if (!isSafeHttpUrl(customUrl)) {
        return res.status(400).json({ error: 'กรุณาใส่ลิงก์ URL ที่ขึ้นต้นด้วย https:// หรือ http:// ที่ถูกต้อง' });
      }

      // Attempt direct HTML fetch first to pass clean text or use urlContext
      let fetchedText = '';
      let pageTitle = '';
      try {
        const resp = await fetch(customUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; PingingYourDay/1.0; +https://pingingyourday.app)',
            Accept: 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (resp.ok) {
          const html = await resp.text();
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          pageTitle = titleMatch ? titleMatch[1].trim() : '';
          fetchedText = html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, '\n')
            .replace(/\s+\n/g, '\n')
            .replace(/\n{2,}/g, '\n')
            .trim()
            .slice(0, 12000);
        }
      } catch {
        // Fallback to Gemini urlContext below
      }

      if (!ai) {
        if (!fetchedText) {
          return res.status(503).json({
            error: 'ไม่สามารถเข้าถึงหน้าเว็บนี้โดยตรงได้ และยังไม่ได้ตั้งค่า GEMINI_API_KEY',
          });
        }
        // Simple heuristic extraction from fetched HTML text
        const candidates = fetchedText
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length >= 20 && line.length <= 180)
          .filter((line) => /[“"'.0-9]|ใจ|รัก|สู้|ยิ้ม|ชีวิต|กำลังใจ/.test(line))
          .slice(0, 6);

        return res.json({
          sourceLabel: pageTitle || new URL(customUrl).hostname,
          quotes: candidates.map((q) => ({
            quote: q.replace(/^[0-9]+[.)]\s*/, '').replace(/^["“]|["”]$/g, ''),
            sourceName: pageTitle || new URL(customUrl).hostname,
            sourceUrl: customUrl,
          })),
          sources: [{ title: pageTitle || customUrl, uri: customUrl }],
        });
      }

      const prompt = fetchedText
        ? `ดึงคำคม แคปชั่น หรือข้อความให้กำลังใจจริงๆ จำนวน 5 ข้อความ จากเนื้อหาหน้าเว็บต่อไปนี้ (${customUrl}):
${fetchedText}

ตอบกลับเป็น JSON รูปแบบ:
{"quotes": [{"quote": "ข้อความคำคม", "note": "สรุปบริบทสั้นๆ 1 ประโยค"}]}`
        : `อ่านหน้าเว็บ ${customUrl} แล้วดึงคำคม แคปชั่น หรือข้อความให้กำลังใจจริงๆ จากหน้านั้นจำนวน 5 ข้อความ
ตอบกลับเป็น JSON รูปแบบ:
{"quotes": [{"quote": "ข้อความคำคม", "note": "สรุปบริบทสั้นๆ 1 ประโยค"}]}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: fetchedText ? undefined : { tools: [{ urlContext: {} }] },
      });

      const raw = response.text || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      let parsedQuotes: Array<{ quote: string; note?: string }> = [];
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.quotes)) parsedQuotes = parsed.quotes;
        } catch {
          // ignore parse fail
        }
      }

      const hostname = new URL(customUrl).hostname.replace(/^www\./, '');
      return res.json({
        sourceLabel: pageTitle || hostname,
        quotes: parsedQuotes.map((item) => ({
          quote: item.quote,
          note: item.note,
          sourceName: pageTitle || hostname,
          sourceUrl: customUrl,
        })),
        sources: [{ title: pageTitle || hostname, uri: customUrl }],
      });
    }

    // Named Thai Lifestyle Sources via Gemini + Google Search Grounding
    if (!ai) {
      return res.status(503).json({
        error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Settings > Secrets สำหรับค้นหาคำคมจากเว็บ',
      });
    }

    const srcInfo = QUOTE_SOURCES[source || 'wongnai'] || QUOTE_SOURCES.wongnai;
    const cleanTopic = (topic || 'คำคมฮีลใจ กำลังใจ รักตัวเอง').trim().slice(0, 100);

    const searchPrompt = `ค้นหาบทความภาษาไทยจาก ${srcInfo.label} (${srcInfo.siteQuery}) เกี่ยวกับ "${cleanTopic}" แล้วคัดเลือกคำคมหรือแคปชั่นน่ารักๆ ฮีลใจ ที่ปรากฏจริงในบทความเหล่านั้นมา 5 ข้อความ
ส่งคำตอบเป็น JSON เท่านั้น ในรูปแบบ:
{"quotes": [{"quote": "ข้อความคำคมภาษาไทย", "note": "หมวดหรือความรู้สึกสั้นๆ"}]}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = response.text || '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    let quotesList: Array<{ quote: string; note?: string }> = [];
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.quotes)) {
          quotesList = parsed.quotes;
        }
      } catch {
        // ignore JSON error
      }
    }

    const groundingChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = groundingChunks
      .map((c: { web?: { uri?: string; title?: string } }) => c.web)
      .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
      .slice(0, 5);

    const primaryUrl = webSources[0]?.uri;

    res.json({
      sourceLabel: srcInfo.label,
      quotes: quotesList.map((item, idx) => ({
        quote: item.quote,
        note: item.note,
        sourceName: srcInfo.label,
        sourceUrl: webSources[idx]?.uri || primaryUrl || '',
      })),
      sources: webSources.map((s) => ({
        title: s.title || srcInfo.label,
        uri: s.uri,
      })),
    });
  } catch (error: unknown) {
    console.error('Web quote fetch error:', error);
    const errMsg = error instanceof Error ? error.message : 'ไม่สามารถดึงคำคมจากเว็บได้ในขณะนี้';
    res.status(500).json({ error: errMsg });
  }
});

// --- Care Chat & Quote Endpoints (ChatGPT / AI Companion) ---
app.post('/api/care/chat', async (req, res) => {
  try {
    const { messages, mood, topic, provider = 'auto' } = req.body as {
      messages?: Array<{ role: 'user' | 'model'; text: string }>;
      mood?: string;
      topic?: string;
      provider?: 'auto' | 'chatgpt' | 'gemini';
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'กรุณาส่งข้อความที่ต้องการพูดคุย' });
    }

    const systemInstruction = `คุณคือ "น้องปิ้ง คู่คิดฮีลใจ" เพื่อนรับฟังที่น่ารัก อบอุ่น อ่อนโยน และเข้าใจชีวิตในแอป Pinging Your Day
หน้าที่ของคุณ:
1. รับฟังความรู้สึกของอีกฝ่ายอย่างตั้งใจ ไม่ตัดสิน ไม่สั่งสอนแบบแข็งกระด้าง
2. สะท้อนและยอมรับความรู้สึก (validate feelings) อย่างเป็นธรรมชาติ ด้วยภาษาไทยที่น่ารัก สุภาพ เป็นกันเอง และอบอุ่น
3. ช่วยให้กำลังใจ ฮิลใจ และปรึกษาได้ทุกเรื่อง ไม่ว่าจะเป็นเรื่องเรียน การงาน ความรัก ความสัมพันธ์ ครอบครัว เพื่อน การตัดสินใจ หรือความเครียดสะสม โดยให้มุมมองที่อ่อนโยน เป็นระบบ เข้าใจง่าย และก้าวเล็กๆ ที่ทำได้จริงในวันนี้
4. ตอบกระชับ อ่านสบาย (ประมาณ 2-4 ย่อหน้าสั้นๆ) ไม่ใช้คำศัพท์เทคนิคหรือหัวข้อแบบรายงานแข็งๆ
5. หากผู้ใช้งานแสดงสัญญาณว่ากำลังตกอยู่ในภาวะวิกฤตหรืออยากทำร้ายตัวเอง ให้แสดงความห่วงใยอย่างลึกซึ้งและแนะนำสายด่วนสุขภาพจิต 1323 (ประเทศไทย) ทันที
${topic ? `หัวข้อที่ผู้ใช้ต้องการปรึกษา: ${topic}` : ''}
${mood ? `บริบทอารมณ์ปัจจุบันของผู้ใช้: ${mood}` : ''}`;

    const openaiCfg = getOpenAIConfig();
    const useChatGPT =
      provider === 'chatgpt' || (provider === 'auto' && Boolean(openaiCfg));

    if (useChatGPT) {
      if (!openaiCfg) {
        return res.status(503).json({
          error:
            'ยังไม่ได้ตั้งค่า OPENAI_API_KEY ใน Settings > Secrets (หากต้องการคุยทันที สามารถเลือกโหมด "อัตโนมัติ" ได้เลย)',
        });
      }

      const openaiMessages = [
        { role: 'system', content: systemInstruction },
        ...messages.slice(-16).map((m) => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: String(m.text || '').slice(0, 2000),
        })),
      ];

      const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiCfg.apiKey}`,
        },
        body: JSON.stringify({
          model: openaiCfg.model,
          messages: openaiMessages,
          temperature: 0.75,
          max_tokens: 700,
        }),
      });

      const oaiData = (await oaiRes.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };

      if (!oaiRes.ok) {
        throw new Error(oaiData.error?.message || 'ไม่สามารถเชื่อมต่อ ChatGPT ได้ในขณะนี้');
      }

      const reply = oaiData.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        return res.status(502).json({ error: 'ChatGPT ไม่ได้ส่งข้อความตอบกลับ' });
      }
      return res.json({ reply, providerUsed: 'chatgpt' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'ยังไม่ได้ตั้งค่า OPENAI_API_KEY หรือ API Key ของ AI ใน Settings > Secrets',
      });
    }

    const recentMessages = messages.slice(-16).map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.text || '').slice(0, 2000) }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: recentMessages,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text?.trim();
    if (!reply) {
      return res.status(502).json({ error: 'ไม่สามารถสร้างข้อความตอบกลับได้ในขณะนี้' });
    }

    res.json({ reply, providerUsed: 'ai' });
  } catch (error: unknown) {
    console.error('Care chat error:', error);
    const errMsg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อบอทคู่คิด';
    res.status(500).json({ error: errMsg });
  }
});

app.post('/api/care/quote', async (req, res) => {
  try {
    const { mood, context, provider = 'auto' } = req.body as {
      mood?: string;
      context?: string;
      provider?: 'auto' | 'chatgpt' | 'gemini';
    };

    const prompt = `สร้างข้อความให้กำลังใจ 1 ชุดสำหรับคนที่กำลังใช้งานแอปบันทึกรูทีนชีวิตประจำวันโทนอบอุ่นน่ารัก "Pinging Your Day"
${mood ? `อารมณ์ตอนนี้: ${mood}` : 'อารมณ์ตอนนี้: ต้องการกำลังใจอ่อนโยนสำหรับวันนี้'}
${context ? `สิ่งที่กำลังเจอ: ${context}` : ''}
ขอภาษาไทยที่ละมุน น่ารัก จริงใจ ไม่เลี่ยน และไม่ซ้ำซาก
ตอบเป็น JSON เท่านั้น: {"quote":"...","reflection":"...","gentleAction":"..."}`;

    const openaiCfg = getOpenAIConfig();
    const useChatGPT =
      provider === 'chatgpt' || (provider === 'auto' && Boolean(openaiCfg));

    if (useChatGPT) {
      if (!openaiCfg) {
        return res.status(503).json({
          error: 'ยังไม่ได้ตั้งค่า OPENAI_API_KEY ใน Settings > Secrets',
        });
      }
      const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiCfg.apiKey}`,
        },
        body: JSON.stringify({
          model: openaiCfg.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.8,
        }),
      });
      const oaiData = (await oaiRes.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };
      if (!oaiRes.ok) {
        throw new Error(oaiData.error?.message || 'ChatGPT quote generation failed');
      }
      const parsed = JSON.parse(oaiData.choices?.[0]?.message?.content || '{}');
      return res.json(parsed);
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'ยังไม่ได้ตั้งค่า OPENAI_API_KEY หรือ API Key ของ AI ใน Settings > Secrets',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quote: {
              type: Type.STRING,
              description: 'ประโยคคำคมหรือข้อความให้กำลังใจสั้นๆ 1-2 ประโยค',
            },
            reflection: {
              type: Type.STRING,
              description: 'คำปลอบโยนหรือคำชวนคิดสั้นๆ ที่ช่วยให้ใจเบาลง',
            },
            gentleAction: {
              type: Type.STRING,
              description: 'กิจกรรมเล็กๆ เพื่อดูแลตัวเองภายใน 5 นาที',
            },
          },
          required: ['quote', 'reflection', 'gentleAction'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: unknown) {
    console.error('Care quote error:', error);
    const errMsg = error instanceof Error ? error.message : 'ไม่สามารถสร้างข้อความให้กำลังใจได้';
    res.status(500).json({ error: errMsg });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pinging Your Day server listening on http://localhost:${PORT}`);
  });
}

startServer();
