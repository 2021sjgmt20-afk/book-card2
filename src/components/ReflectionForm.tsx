import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ReflectionNote, AiSuggestionResult } from '../types';
import {
  Sparkles,
  Calendar,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
  Save,
  BookOpen,
} from 'lucide-react';

interface ReflectionFormProps {
  user: User | null;
  onSaved: (savedNote: ReflectionNote) => void;
  onRequireAuth: () => void;
}

const COMMON_SUBJECTS = [
  '국어',
  '수학',
  '사회',
  '과학',
  '영어',
  '도덕',
  '음악',
  '미술',
  '체육',
  '실과',
  '창체',
  '통합',
];

const SAMPLE_REFLECTION = {
  subject: '수학',
  wellDone:
    '분수의 덧셈 개념을 피자 교구로 시각화해 설명하니 평소 어려워하던 학생들도 눈을 반짝이며 직접 맞춰보았다. 짝 활동으로 서로 설명하게 한 것이 유효했다.',
  improvement:
    '도입부 개념 설명이 길어져서 후반부 개별 문제 풀이 시간이 5분밖에 남지 않았다. 풀이 속도가 느린 학생들의 오답을 다 확인해 주지 못해 아쉬웠다.',
  studentReaction:
    '짝과 교구를 만지작거리며 "아, 이게 이렇게 더해지는 거구나!" 하고 감탄하는 소리가 여기저기서 들림. 다만 연습문제 시간에는 시간이 부족하다고 아우성침.',
};

export const ReflectionForm: React.FC<ReflectionFormProps> = ({
  user,
  onSaved,
  onRequireAuth,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);
  const [selectedSubject, setSelectedSubject] = useState('국어');
  const [customSubject, setCustomSubject] = useState('');
  const [wellDone, setWellDone] = useState('');
  const [improvement, setImprovement] = useState('');
  const [studentReaction, setStudentReaction] = useState('');

  // AI & Saving states
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState<AiSuggestionResult | null>(null);
  const [editedAction, setEditedAction] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const activeSubject = selectedSubject === '직접입력' ? customSubject.trim() : selectedSubject;

  // Real-time name detection heuristic for student privacy protection
  const detectedPossibleNames = React.useMemo(() => {
    const fullText = `${wellDone} ${improvement} ${studentReaction}`;
    // Simple regex looking for Korean name patterns followed by honorifics or particles (e.g., 민수 학생, 지우가, 하은이는)
    const matches = fullText.match(/[가-힣]{2,3}(이|가|는|은|에게|학생)/g) || [];
    const sampleWords = matches.filter((w) => !['학생이', '학생은', '선생님', '오늘이', '수업은', '시간이', '활동이', '모둠이'].includes(w));
    return sampleWords.slice(0, 3);
  }, [wellDone, improvement, studentReaction]);

  const loadSample = () => {
    setSelectedSubject(SAMPLE_REFLECTION.subject);
    setWellDone(SAMPLE_REFLECTION.wellDone);
    setImprovement(SAMPLE_REFLECTION.improvement);
    setStudentReaction(SAMPLE_REFLECTION.studentReaction);
    setFormError(null);
  };

  const handleGenerateAi = async () => {
    if (!activeSubject) {
      setFormError('과목을 선택하거나 입력해 주세요.');
      return;
    }
    if (!wellDone.trim()) {
      setFormError('오늘 수업에서 잘된 점을 한 줄 이상 적어주세요.');
      return;
    }
    if (!improvement.trim()) {
      setFormError('오늘 수업에서 아쉬웠던 점을 적어주세요.');
      return;
    }

    setFormError(null);
    setIsGeneratingAi(true);

    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          subject: activeSubject,
          wellDone,
          improvement,
          studentReaction,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'AI 제안 생성 중 문제가 발생했습니다.');
      }

      const data: AiSuggestionResult = await response.json();
      setAiResult(data);
      setEditedAction(data.actionSuggestion);
    } catch (err) {
      console.error('Failed to generate AI suggestion:', err);
      // Fallback proposal
      const fallback: AiSuggestionResult = {
        actionSuggestion: '내일 수업 도입 3분 동안 학생들이 짝과 함께 오늘 배운 핵심 개념을 다시 말해보도록 해보세요.',
        feedback: '선생님의 세심한 수업 성찰과 배려가 돋보입니다. 작은 보완으로도 훨씬 편안한 수업이 될 것입니다.',
        positiveKeywords: ['수업 몰입', '짝 상호작용', '개념 이해'],
      };
      setAiResult(fallback);
      setEditedAction(fallback.actionSuggestion);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSave = async (overrideAction?: string) => {
    if (!user) {
      onRequireAuth();
      return;
    }

    if (!activeSubject) {
      setFormError('과목을 지정해 주세요.');
      return;
    }
    if (!wellDone.trim()) {
      setFormError('잘된 점을 작성해 주세요.');
      return;
    }
    if (!improvement.trim()) {
      setFormError('아쉬운 점을 작성해 주세요.');
      return;
    }

    let finalAction = (overrideAction || editedAction || aiResult?.actionSuggestion || '').trim();

    // If AI wasn't triggered yet, trigger it or provide default action
    if (!finalAction) {
      setIsGeneratingAi(true);
      try {
        const res = await fetch('/api/ai/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            subject: activeSubject,
            wellDone,
            improvement,
            studentReaction,
          }),
        });
        const data: AiSuggestionResult = await res.json();
        finalAction = data.actionSuggestion;
        setAiResult(data);
        setEditedAction(data.actionSuggestion);
      } catch (err) {
        console.error('AI quick generate fallback:', err);
        finalAction = '내일 수업 시작 시 핵심 질문을 칠판에 적어두고 학생들의 생각을 1분간 들어보세요.';
      } finally {
        setIsGeneratingAi(false);
      }
    }

    setIsSaving(true);
    setFormError(null);

    const docId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const notePayload: ReflectionNote = {
      id: docId,
      userId: user.uid,
      userEmail: user.email || '',
      date,
      subject: activeSubject,
      wellDone: wellDone.trim(),
      improvement: improvement.trim(),
      studentReaction: studentReaction.trim() || '특이사항 없음',
      aiActionSuggestion: finalAction,
      aiFeedback: aiResult?.feedback || '오늘의 성찰이 내일의 멋진 수업을 만들어갑니다.',
      positiveKeywords: aiResult?.positiveKeywords || [activeSubject, '수업 성찰'],
      createdAt: nowIso,
      updatedAt: nowIso,
      isActionCompleted: false,
    };

    try {
      await setDoc(doc(db, 'reflections', docId), notePayload);
      setSaveSuccess(true);
      onSaved(notePayload);

      // Reset form after short delay
      setTimeout(() => {
        setSaveSuccess(false);
        setWellDone('');
        setImprovement('');
        setStudentReaction('');
        setAiResult(null);
        setEditedAction('');
      }, 1500);
    } catch (error) {
      console.error('Failed to save reflection note:', error);
      handleFirestoreError(error, OperationType.WRITE, `reflections/${docId}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 sm:p-7 max-w-3xl mx-auto">
      {/* Header bar of the form */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-stone-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900">
              오늘의 수업 성찰 기록
            </h2>
            <p className="text-xs text-stone-500">
              짧아도 괜찮습니다. 오늘의 수업 느낌을 진솔하게 남겨보세요.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadSample}
          className="text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50/80 hover:bg-amber-100/80 px-2.5 py-1.5 rounded-lg border border-amber-200/60 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          예시 내용 채우기
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleGenerateAi();
        }}
        className="space-y-5"
      >
        {/* Row 1: Date & Subject */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          {/* Date Picker */}
          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              수업 날짜
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
              />
              <button
                type="button"
                onClick={() => setDate(todayStr)}
                className="px-2.5 py-2 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg border border-stone-200 transition-colors whitespace-nowrap"
              >
                오늘
              </button>
            </div>
          </div>

          {/* Subject selection */}
          <div className="sm:col-span-7">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              수업 과목
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SUBJECTS.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubject(sub)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    selectedSubject === sub
                      ? 'bg-amber-600 text-white shadow-2xs font-semibold'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedSubject('직접입력')}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                  selectedSubject === '직접입력'
                    ? 'bg-amber-600 text-white shadow-2xs font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                직접 입력
              </button>
            </div>

            {selectedSubject === '직접입력' && (
              <input
                type="text"
                placeholder="과목명을 입력해 주세요 (예: 자율동아리, 안전한생활)"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="mt-2 w-full text-xs sm:text-sm px-3 py-1.5 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            )}
          </div>
        </div>

        {/* Input 1: 오늘 수업에서 잘된 점 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              오늘 수업에서 잘된 점 <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-stone-400">
              학생 몰입, 발문, 교수 자료, 협동 등
            </span>
          </div>
          <textarea
            rows={3}
            value={wellDone}
            onChange={(e) => setWellDone(e.target.value)}
            placeholder="예: 모둠별로 짝과 토의하며 낱말 카드를 분류할 때 학생들이 주도적으로 참여했다. 질문을 던졌을 때 평소 조용하던 학생들도 손을 들어 의견을 나누었다."
            className="w-full text-xs sm:text-sm p-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none transition-colors"
          />
        </div>

        {/* Input 2: 아쉬운 점 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              아쉬운 점 <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-stone-400">
              시간 배분, 설명 난이도, 주의 집중 등
            </span>
          </div>
          <textarea
            rows={3}
            value={improvement}
            onChange={(e) => setImprovement(e.target.value)}
            placeholder="예: 3단원 개념 설명이 길어져서 마지막 정리 퀴즈를 급하게 마무리했다. 모둠 간 활동 속도 차이를 고려한 보충 과제를 미리 준비하지 못했다."
            className="w-full text-xs sm:text-sm p-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none transition-colors"
          />
        </div>

        {/* Input 3: 학생 반응 (자유롭게) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
              학생 반응 (자유롭게)
            </label>
            <span className="text-[11px] text-stone-400">
              표정, 질문, 흥미도, 예상 밖 반응
            </span>
          </div>
          <textarea
            rows={2}
            value={studentReaction}
            onChange={(e) => setStudentReaction(e.target.value)}
            placeholder="예: 시작 전엔 다소 지쳐 보였으나 실습을 시작하자 눈빛이 달라짐. '선생님 다음 시간에도 이 실험 또 해요!'라는 반응이 있었음."
            className="w-full text-xs sm:text-sm p-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none transition-colors"
          />
        </div>

        {/* CRITICAL REQUIREMENT: 학생 이름은 입력하지 않도록 입력창 아래에 안내 문구 표시 */}
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-semibold text-amber-950 flex items-center gap-1">
              학생 개인정보 보호 안내
            </p>
            <p className="text-amber-800 mt-0.5">
              학생의 인격권과 개인정보 보호를 위해 <span className="font-bold underline decoration-amber-400">학생의 실명(이름, 번호 등)은 일절 입력하지 마세요.</span>{' '}
              필요한 경우 <em>'A 학생'</em>, <em>'앞줄 모둠'</em>, <em>'일부 학생들'</em>처럼 익명으로 표현해 주시기 바랍니다.
            </p>
            {detectedPossibleNames.length > 0 && (
              <p className="mt-1.5 text-[11px] text-rose-700 font-medium bg-white/70 px-2 py-1 rounded-md border border-rose-200 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                혹시 학생 이름이 포함되어 있나요? 확인해 보세요: [{detectedPossibleNames.join(', ')}]
              </p>
            )}
          </div>
        </div>

        {/* Form Error Banner */}
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Action Buttons: AI Analyze & Propose Action */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleGenerateAi}
            disabled={isGeneratingAi}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGeneratingAi ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                AI가 성찰을 분석하고 실천을 찾는 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-200" />
                AI 성찰 분석 및 '내일의 작은 실천' 제안 받기
              </>
            )}
          </button>
        </div>
      </form>

      {/* AI Suggestion Display & Edit Card */}
      {aiResult && (
        <div className="mt-6 pt-6 border-t border-dashed border-stone-200 space-y-4 animate-in fade-in duration-300">
          <div className="bg-linear-to-br from-amber-50/70 via-stone-50 to-emerald-50/50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" /> AI 제안: 내일 해 볼 작은 실천 1가지
              </span>
              <button
                type="button"
                onClick={handleGenerateAi}
                disabled={isGeneratingAi}
                className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-stone-200"
              >
                <RefreshCw className={`w-3 h-3 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                다시 제안받기
              </button>
            </div>

            {/* The One Sentence Action Item */}
            <div className="mb-3.5">
              <label className="block text-xs font-bold text-stone-800 mb-1">
                📌 내일 수업 실천 한 문장 (자유롭게 수정 가능):
              </label>
              <textarea
                rows={2}
                value={editedAction}
                onChange={(e) => setEditedAction(e.target.value)}
                className="w-full text-xs sm:text-sm font-medium text-stone-900 bg-white border border-amber-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            {/* AI warm coaching feedback */}
            {aiResult.feedback && (
              <div className="text-xs text-stone-600 bg-white/60 p-3 rounded-xl border border-stone-200/60 mb-3">
                <span className="font-semibold text-emerald-800">💬 AI 코치 응원: </span>
                {aiResult.feedback}
              </div>
            )}

            {/* Keywords */}
            {aiResult.positiveKeywords && aiResult.positiveKeywords.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-600">
                <span className="text-[11px] text-stone-400 font-medium">수업 강점 낱말:</span>
                {aiResult.positiveKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-100/70 text-emerald-800 border border-emerald-200"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            )}

            {/* Save to Firestore Button */}
            <div className="mt-4 pt-3 border-t border-amber-200/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-stone-500">
                {user ? `저장 위치: Firebase 데이터베이스 (${user.displayName || user.email})` : '저장하려면 구글 로그인이 필요합니다.'}
              </p>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving || saveSuccess}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    저장 완료! 성찰 일지에 등록되었습니다
                  </>
                ) : isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    데이터베이스에 안전하게 기록 중...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-amber-400" />
                    데이터베이스에 성찰 노트 저장하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
