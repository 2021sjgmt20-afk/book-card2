import { ReflectionNote, SubjectStat, WordFrequency } from '../types';

// Color palette for subjects
const SUBJECT_COLORS: Record<string, string> = {
  '국어': 'bg-rose-500 text-rose-50 border-rose-200',
  '수학': 'bg-blue-500 text-blue-50 border-blue-200',
  '사회': 'bg-amber-500 text-amber-50 border-amber-200',
  '과학': 'bg-emerald-500 text-emerald-50 border-emerald-200',
  '영어': 'bg-indigo-500 text-indigo-50 border-indigo-200',
  '도덕': 'bg-teal-500 text-teal-50 border-teal-200',
  '음악': 'bg-purple-500 text-purple-50 border-purple-200',
  '미술': 'bg-pink-500 text-pink-50 border-pink-200',
  '체육': 'bg-orange-500 text-orange-50 border-orange-200',
  '실과': 'bg-lime-600 text-lime-50 border-lime-200',
  '창체': 'bg-cyan-500 text-cyan-50 border-cyan-200',
  '통합': 'bg-violet-500 text-violet-50 border-violet-200',
  '기타': 'bg-stone-500 text-stone-50 border-stone-200',
};

const COLOR_BARS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
];

export function getSubjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] || 'bg-stone-600 text-stone-50 border-stone-200';
}

/**
 * Calculates subject distribution statistics
 */
export function calculateSubjectStats(reflections: ReflectionNote[]): SubjectStat[] {
  if (reflections.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const ref of reflections) {
    const s = ref.subject.trim() || '기타';
    counts[s] = (counts[s] || 0) + 1;
  }

  const total = reflections.length;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return sorted.map(([subject, count], index) => ({
    subject,
    count,
    percentage: Math.round((count / total) * 100),
    color: COLOR_BARS[index % COLOR_BARS.length],
  }));
}

// Common Korean particles and endings to strip
const PARTICLES = [
  '에서는', '에서', '에게', '으로', '부터', '까지', '이나', '에도',
  '이가', '에서', '과의', '와의', '로는', '보다', '처럼',
  '은', '는', '이', '가', '을', '를', '에', '의', '로', '도', '과', '와',
  '하고', '며', '고', '면', '서', '게', '듯', '지',
];

// Meaningless or generic stop words in lesson reflection context
const STOP_WORDS = new Set([
  '수업', '오늘', '학생', '학생들', '아이들', '아이', '것', '수', '때',
  '등', '더', '잘', '많이', '아주', '매우', '정말', '너무', '조금',
  '좀', '대한', '통해', '위해', '모두', '내용', '시간', '생각', '가지',
  '경우', '이번', '계속', '정도', '부분', '여러', '우리', '그', '이',
  '저', '함께', '직접', '다시', '다음', '먼저', '다양한', '같은', '있었음',
  '했음', '됨', '좋았음', '잘됨', '모습', '활동을', '수업을', '학생들이',
]);

/**
 * Extracts and stem cleans a Korean word
 */
function cleanKoreanWord(rawWord: string): string {
  let cleaned = rawWord.replace(/[^가-힣a-zA-Z0-9]/g, '').trim();
  if (cleaned.length <= 1) return '';

  // Try stripping particles from longest to shortest
  for (const p of PARTICLES) {
    if (cleaned.length > p.length + 1 && cleaned.endsWith(p)) {
      cleaned = cleaned.slice(0, -p.length);
      break;
    }
  }

  // Common ending normalizations
  if (cleaned.endsWith('적인')) cleaned = cleaned.slice(0, -2) + '적';
  if (cleaned.endsWith('하고')) cleaned = cleaned.slice(0, -2);
  if (cleaned.endsWith('하는')) cleaned = cleaned.slice(0, -2);
  if (cleaned.endsWith('하여')) cleaned = cleaned.slice(0, -2);

  return cleaned;
}

/**
 * Filters reflections within the last 4 weeks (28 days)
 */
export function getRecent4WeeksReflections(reflections: ReflectionNote[]): {
  filtered: ReflectionNote[];
  startDateStr: string;
  endDateStr: string;
} {
  const now = new Date();
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(now.getDate() - 28);

  const startIso = fourWeeksAgo.toISOString().split('T')[0];
  const endIso = now.toISOString().split('T')[0];

  const filtered = reflections.filter((r) => {
    if (!r.date) return false;
    return r.date >= startIso && r.date <= endIso;
  });

  return {
    filtered,
    startDateStr: startIso,
    endDateStr: endIso,
  };
}

/**
 * Analyzes word frequencies in the "wellDone" (잘된 점) field in the last 4 weeks
 */
export function analyzeWellDoneWords(reflections: ReflectionNote[], maxWords = 20): WordFrequency[] {
  const { filtered } = getRecent4WeeksReflections(reflections);
  const targetReflections = filtered.length > 0 ? filtered : reflections;

  const frequencyMap: Record<string, { count: number; snippets: string[] }> = {};

  for (const ref of targetReflections) {
    // 1. Also incorporate AI-extracted positive keywords if present
    if (ref.positiveKeywords && Array.isArray(ref.positiveKeywords)) {
      for (const kw of ref.positiveKeywords) {
        const cleanKw = kw.replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim();
        if (cleanKw && cleanKw.length >= 2 && !STOP_WORDS.has(cleanKw)) {
          if (!frequencyMap[cleanKw]) {
            frequencyMap[cleanKw] = { count: 0, snippets: [] };
          }
          frequencyMap[cleanKw].count += 2; // Extra weight for AI identified pedagogical strengths
          if (frequencyMap[cleanKw].snippets.length < 3 && ref.wellDone) {
            frequencyMap[cleanKw].snippets.push(ref.wellDone.slice(0, 70));
          }
        }
      }
    }

    // 2. Tokenize wellDone field
    const text = ref.wellDone || '';
    const words = text.split(/[\s,./!?;:"'~()]+/).filter(Boolean);

    for (const rawWord of words) {
      const cleaned = cleanKoreanWord(rawWord);
      if (cleaned.length >= 2 && !STOP_WORDS.has(cleaned)) {
        if (!frequencyMap[cleaned]) {
          frequencyMap[cleaned] = { count: 0, snippets: [] };
        }
        frequencyMap[cleaned].count += 1;
        if (frequencyMap[cleaned].snippets.length < 3) {
          frequencyMap[cleaned].snippets.push(text.slice(0, 70));
        }
      }
    }
  }

  const sorted = Object.entries(frequencyMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxWords);

  return sorted.map(([word, data]) => ({
    word,
    count: data.count,
    sampleSnippets: data.snippets,
  }));
}
