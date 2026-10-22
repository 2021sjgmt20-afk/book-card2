import React, { useState } from 'react';
import { ReflectionNote } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { getSubjectColor } from '../utils/analysis';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  Calendar,
  Check,
  Target,
  ArrowRight,
} from 'lucide-react';

interface ActionListTabProps {
  reflections: ReflectionNote[];
  onOpenCreate: () => void;
}

export const ActionListTab: React.FC<ActionListTabProps> = ({
  reflections,
  onOpenCreate,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const notesWithActions = reflections.filter((r) => Boolean(r.aiActionSuggestion));

  const filtered = notesWithActions.filter((r) => {
    if (filter === 'pending') return !r.isActionCompleted;
    if (filter === 'completed') return r.isActionCompleted;
    return true;
  });

  const completedCount = notesWithActions.filter((r) => r.isActionCompleted).length;
  const pendingCount = notesWithActions.length - completedCount;
  const completionRate =
    notesWithActions.length > 0
      ? Math.round((completedCount / notesWithActions.length) * 100)
      : 0;

  const toggleAction = async (note: ReflectionNote) => {
    const newStatus = !note.isActionCompleted;
    try {
      await updateDoc(doc(db, 'reflections', note.id), {
        isActionCompleted: newStatus,
        updatedAt: new Date().toISOString(),
      });
      note.isActionCompleted = newStatus;
    } catch (err) {
      console.error('Failed to update action status:', err);
      handleFirestoreError(err, OperationType.UPDATE, `reflections/${note.id}`);
    }
  };

  if (notesWithActions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-700 mb-4 border border-amber-100">
          <Target className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-1.5">
          아직 AI가 제안한 실천 항목이 없습니다
        </h3>
        <p className="text-xs sm:text-sm text-stone-500 mb-6">
          오늘의 수업 성찰을 작성하면 AI가 내일 수업에서 바로 해 볼 수 있는 1가지 작은 실천을 추천해 드립니다.
        </p>
        <button
          onClick={onOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-amber-200" />
          수업 성찰 작성하고 실천 받기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Overview Banner */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-50 rounded-lg text-amber-700">
              <Target className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-stone-900">
              내일의 작은 실천 보관함
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            큰 변화 대신 내일 1가지 작은 시도가 수업을 바꿉니다.
          </p>
        </div>

        {/* Progress Rate */}
        <div className="flex items-center gap-4 bg-stone-50 px-4 py-2.5 rounded-xl border border-stone-200">
          <div className="text-right">
            <div className="text-xs text-stone-500">실천 달성률</div>
            <div className="text-lg font-extrabold text-stone-900">
              {completionRate}%
            </div>
          </div>
          <div className="text-xs text-stone-500 border-l border-stone-200 pl-3">
            <div>완료 <strong className="text-emerald-700">{completedCount}</strong>건</div>
            <div>예정 <strong className="text-amber-700">{pendingCount}</strong>건</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-stone-900 text-white font-semibold'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          전체 보기 ({notesWithActions.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-amber-600 text-white font-semibold'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          실천 예정 ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          실천 완료 ({completedCount})
        </button>
      </div>

      {/* Action Items List */}
      <div className="space-y-3">
        {filtered.map((note) => (
          <div
            key={note.id}
            onClick={() => toggleAction(note)}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
              note.isActionCompleted
                ? 'bg-emerald-50/40 border-emerald-200 opacity-80'
                : 'bg-white border-stone-200 hover:border-amber-400 shadow-xs'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {note.isActionCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <Circle className="w-5 h-5 text-stone-300 hover:text-amber-500 transition-colors" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getSubjectColor(
                    note.subject
                  )}`}
                >
                  {note.subject}
                </span>
                <span className="text-[11px] text-stone-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {note.date} 성찰
                </span>
                {note.isActionCompleted && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                    실천 완료
                  </span>
                )}
              </div>

              <p
                className={`text-xs sm:text-sm font-semibold leading-relaxed ${
                  note.isActionCompleted
                    ? 'line-through text-stone-500'
                    : 'text-stone-900'
                }`}
              >
                {note.aiActionSuggestion}
              </p>

              {note.aiFeedback && (
                <p className="text-[11px] text-stone-500 mt-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                  {note.aiFeedback}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
