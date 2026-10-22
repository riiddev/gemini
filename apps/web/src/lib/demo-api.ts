import { DEMO_PACKAGES, DEMO_TOPICS } from "./demo-data";

const HISTORY_KEY = "latveria.demo.history.v1";
const RESULTS_KEY = "latveria.demo.results.v1";

export const DEMO_USER = {
  id: "demo-0042",
  name: "Peserta Demo",
  email: "peserta-demo@latveria.local",
  role: "user",
  image: null,
};

export const DEMO_PROFILE = {
  name: "Peserta Demo",
  codename: "EXPERIMENT-01",
  title: "Penjelajah Latveria",
  institution: "Mode eksperimen",
  targetUniversity: "",
  secondaryTarget: "",
  bio: "Mencoba fitur Latveria sebelum siap digunakan di proyek utama.",
  motto: "Pahami prosesnya, bukan hanya jawabannya.",
  image: null,
};

function readArray(key: string): any[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function readDemoHistory() {
  return readArray(HISTORY_KEY);
}

export function saveDemoResult(result: any, historyItem: any) {
  if (typeof window === "undefined") return;
  const history = readDemoHistory();
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify([historyItem, ...history].slice(0, 100)));
  const results = readArray(RESULTS_KEY).filter((item) => item?.attemptId !== result?.attemptId);
  window.localStorage.setItem(RESULTS_KEY, JSON.stringify([{ ...result, historyItem }, ...results].slice(0, 100)));
}

function makeSummary() {
  const history = readDemoHistory();
  const answered = history.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const correct = history.reduce((sum, item) => sum + Number(item.correct || 0), 0);
  const totalXP = history.reduce((sum, item) => sum + Number(item.earnedXP || 0), 0);
  const level = Math.floor(totalXP / 300) + 1;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const activeDays = new Set(
    history.map((item) => {
      const time = item.submittedAt ? new Date(item.submittedAt) : new Date();
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(time);
    }),
  );
  const questionsByDay = new Map<string, { questions: number; xp: number; correct: number }>();
  for (const item of history) {
    const time = item.submittedAt ? new Date(item.submittedAt) : new Date();
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(time);
    const row = questionsByDay.get(day) ?? { questions: 0, xp: 0, correct: 0 };
    row.questions += Number(item.total || 0);
    row.xp += Number(item.earnedXP || 0);
    row.correct += Number(item.correct || 0);
    questionsByDay.set(day, row);
  }
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const weeklyChartData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(date);
    const row = questionsByDay.get(key) ?? { questions: 0, xp: 0, correct: 0 };
    return {
      day: days[date.getDay()],
      fullDay: date.toLocaleDateString("id-ID", { weekday: "long", timeZone: "Asia/Jakarta" }),
      questions: row.questions,
      xp: row.xp,
      accuracy: row.questions ? Math.round((row.correct / row.questions) * 100) : 0,
    };
  });
  const weekly = history.filter((item) => {
    if (!item.submittedAt) return false;
    return Date.now() - new Date(item.submittedAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
  });
  const weeklyQuestions = weekly.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const weeklyCorrect = weekly.reduce((sum, item) => sum + Number(item.correct || 0), 0);
  return {
    totalXP,
    level,
    currentXP: totalXP % 300,
    nextLevelXP: level * 300,
    streakDays: activeDays.size,
    practicedToday: activeDays.has(today),
    answered,
    attempts: history.length,
    correct,
    weeklyChartData,
    weeklyXP: weekly.reduce((sum, item) => sum + Number(item.earnedXP || 0), 0),
    weeklyAccuracy: weeklyQuestions ? Math.round((weeklyCorrect / weeklyQuestions) * 100) : 0,
  };
}

export async function demoApi<T>(path: string, init?: RequestInit): Promise<T> {
  const pathname = path.split("?")[0].replace(/\/$/, "") || "/";
  const method = (init?.method || "GET").toUpperCase();

  if (pathname === "/me") return DEMO_USER as T;
  if (pathname === "/learner/profile") return DEMO_PROFILE as T;
  if (pathname === "/learner/topics") return DEMO_TOPICS as T;
  if (pathname === "/learner/packages") return DEMO_PACKAGES as T;
  if (pathname === "/learner/summary") return makeSummary() as T;
  if (pathname === "/learner/history") return readDemoHistory() as T;
  if (pathname === "/learner/tryouts/history") return [] as T;
  if (pathname === "/learner/vocabulary") return [] as T;
  if (pathname === "/learner/config") return {} as T;
  if (pathname === "/learner/affirmations") {
    return [
      { affirmation: "Memahami satu alasan jauh lebih berharga daripada menebak sepuluh jawaban.", author: "Latveria" },
      { affirmation: "Progres kecil yang konsisten tetaplah progres.", author: "Latveria" },
      { affirmation: "Salah hari ini adalah petunjuk untuk memahami lebih dalam.", author: "Latveria" },
    ] as T;
  }

  const topicPackages = pathname.match(/^\/learner\/topics\/([^/]+)\/packages$/);
  if (topicPackages) return DEMO_PACKAGES.filter((item) => item.topicSlug === topicPackages[1]) as T;

  const resultId = pathname.match(/^\/learner\/results\/([^/]+)$/);
  if (resultId) {
    const result = readArray(RESULTS_KEY).find((item) => item?.attemptId === resultId[1]);
    if (result) return result as T;
    throw new Error("Hasil latihan demo tidak ditemukan di browser ini.");
  }

  if (method !== "GET" && method !== "HEAD") return { id: `demo-${Date.now()}` } as T;
  return [] as T;
}