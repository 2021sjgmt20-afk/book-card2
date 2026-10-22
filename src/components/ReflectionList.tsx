import React, { useState, useMemo } from 'react';
import { ReflectionNote } from '../types';
import { getSubjectColor } from '../utils/analysis';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Search,
  Calendar,
  Sparkles,
  Trash2,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  BookOpen,
  Filter,
} from 'lucide-react';

interface ReflectionListProps {
  reflections: ReflectionNote[];
  selectedSubjectFilter?: string | null;
  onClearSubjectFilter?: () => void;
  selectedWordFilter?: string | null;
  onClearWordFilter?: () => void;
  onOpenCreate: () => void;
}

export const ReflectionList: React.FC<ReflectionListProps> = ({
  reflections,
  selectedSubjectFilter,
  onClearSubjectFilter,
  selectedWordFilter,
  onClearWordFilter,
  onOpenCreate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubject, setActiveSubject] = useState<string>(selectedSubjectFilter || 'all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  React.useEffect(() => {
    if (selectedSubjectFilter) {
      setActiveSubject(selectedSubjectFilter);
    }
  }, [selectedSubjectFilter]);

  // Unique subjects
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    reflections.forEach((r) => {
      if (r.subject) set.add(r.subject);
    });
    return Array.from(set);
  }, [reflections]);

  // Filtered reflections
  const filteredList = useMemo(() => {
    return reflections.filter((item) => {
      // Subject filter
      if (activeSubject !== 'all' && item.subject !== activeSubject) {
        return false;
      }

      // Word filter from statistics
      if (selectedWordFilter) {
        const fullContent = `${item.wellDone} ${item.improvement} ${item.studentReaction} ${item.positiveKeywords?.join(' ')}`;
        if (!fullContent.includes(selectedWordFilter)) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const match =
          item.subject.toLowerCase().includes(query) ||
          item.wellDone.toLowerCase().includes(query) ||
          item.improvement.toLowerCase().includes(query) ||
          item.studentReaction.toLowerCase().includes(query) ||
          item.aiActionSuggestion.toLowerCase().includes(query) ||
          item.date.includes(query);
        if (!match) return false;
      }

      return true;
    });
  }, [reflections, activeSubject, selectedWordFilter, searchTerm]);

  const toggleActionComplete = async (note: ReflectionNote) => {
    const newStatus = !note.isActionCompleted;
    try {
      await updateDoc(doc(db, 'reflections', note.id), {
        isActionCompleted: newStatus,
        updatedAt: new Date().toISOString(),
      });
      note.isActionCompleted = newStatus;
    } catch (err) {
      console.error('Failed to toggle action status:', err);
      handleFirestoreError(err, OperationType.UPDATE, `reflections/${note.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 성찰 기록을 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'reflections', id));
    } catch (err) {
      console.error('Failed to delete note:', err);
      handleFirestoreError(err, OperationType.DELETE, `reflections/${id}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = (note: ReflectionNote) => {
    const text = `[수업 성찰 노트]
📅 날짜: ${note.date}
📚 과목: ${note.subject}
✨ 잘된 점: ${note.wellDone}
💧 아쉬운 점: ${note.improvement}
💬 학생 반응: ${note.studentReaction}
🎯 내일의 작은 실천 (AI 제안): ${note.aiActionSuggestion}`;

    navigator.clipboard.writeText(text);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (reflections.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-700 mb-4 border border-amber-100">
          <BookOpen className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-1.5">
          작성된 성찰 기록이 없습니다
        </h3>
        <p className="text-xs sm:text-sm text-stone-500 mb-6">
          오늘 있었던 수업에 대해 짧게 남겨보세요. 선생님의 교실 기록이 차곡차곡 모입니다.
        </p>
        <button
          onClick={onOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs inline-flex items-center gap-2"
        >
          ✍️ 첫 성찰 기록 작성하기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="과목, 내용, 내일의 실천 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500 self-end sm:self-auto">
            <span>총 {filteredList.length}건</span>
          </div>
        </div>

        {/* Subject Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <span className="text-[11px] font-semibold text-stone-400 shrink-0 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> 과목:
          </span>
          <button
            onClick={() => {
              setActiveSubject('all');
              onClearSubjectFilter?.();
            }}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors shrink-0 ${
              activeSubject === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            전체
          </button>
          {availableSubjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setActiveSubject(sub)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors shrink-0 ${
                activeSubject === sub
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Active Word Filter Indicator */}
        {selectedWordFilter && (
          <div className="flex items-center justify-between bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs text-emerald-800">
            <span>
              💡 낱말 <strong>#{selectedWordFilter}</strong> 가 포함된 성찰만 보고 있습니다.
            </span>
            <button
              onClick={onClearWordFilter}
              className="text-xs text-emerald-700 hover:underline font-semibold"
            >
              필터 해제
            </button>
          </div>
        )}
      </div>

      {/* Reflection Cards Feed */}
      <div className="space-y-4">
        {filteredList.map((note) => (
          <article
            key={note.id}
            className="bg-white rounded-2xl border border-stone-200 shadow-xs hover:border-amber-300 transition-colors p-4 sm:p-5 relative"
          >
            {/* Top row: Date, Subject & Action Buttons */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${getSubjectColor(
                    note.subject
                  )}`}
                >
                  {note.subject}
                </span>
                <span className="text-xs text-stone-500 flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  {note.date}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCopy(note)}
                  title="성찰 내용 텍스트 복사"
                  className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  {copiedId === note.id ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  disabled={deletingId === note.id}
                  title="삭제"
                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Core Reflection Sections: 잘된 점, 아쉬운 점, 학생 반응 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-xs sm:text-[13px]">
              {/* Well Done */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  잘된 점
                </div>
                <p className="text-stone-800 leading-relaxed whitespace-pre-wrap">
                  {note.wellDone}
                </p>
              </div>

              {/* Improvement */}
              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  아쉬운 점
                </div>
                <p className="text-stone-800 leading-relaxed whitespace-pre-wrap">
                  {note.improvement}
                </p>
              </div>

              {/* Student Reaction */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  학생 반응
                </div>
                <p className="text-stone-800 leading-relaxed whitespace-pre-wrap">
                  {note.studentReaction}
                </p>
              </div>
            </div>

            {/* CRITICAL FEATURE: AI 정리 '내일 해 볼 작은 실천' 1가지 */}
            <div className="bg-linear-to-r from-amber-50/90 via-stone-50 to-amber-50/50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-500 text-white rounded-lg shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1 mb-0.5">
                    내일 해 볼 작은 실천 1가지 (AI 제안)
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-stone-900 leading-snug">
                    {note.aiActionSuggestion}
                  </p>
                  {note.aiFeedback && (
                    <p className="text-[11px] text-stone-500 mt-1">
                      💬 {note.aiFeedback}
                    </p>
                  )}
                </div>
              </div>

              {/* Action completion tracker */}
              <button
                type="button"
                onClick={() => toggleActionComplete(note)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 shrink-0 self-end sm:self-auto ${
                  note.isActionCompleted
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                    : 'bg-white hover:bg-amber-50 text-stone-700 border-stone-300'
                }`}
              >
                {note.isActionCompleted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                    실천 완료
                  </>
                ) : (
                  <>
                    <Circle className="w-3.5 h-3.5 text-stone-400" />
                    실천해보기
                  </>
                )}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
