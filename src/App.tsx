/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import {
  auth,
  db,
  testConnection,
  signInWithPopup,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { ReflectionNote } from './types';
import { Header } from './components/Header';
import { ReflectionForm } from './components/ReflectionForm';
import { ReflectionList } from './components/ReflectionList';
import { StatisticsView } from './components/StatisticsView';
import { ActionListTab } from './components/ActionListTab';
import {
  BookOpen,
  Sparkles,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  LogIn,
  ArrowRight,
  HeartHandshake,
} from 'lucide-react';

// Sample demonstration reflections for preview mode
const DEMO_REFLECTIONS: ReflectionNote[] = [
  {
    id: 'demo-1',
    userId: 'demo',
    userEmail: 'teacher@school.net',
    date: '2026-10-21',
    subject: '국어',
    wellDone:
      '인물의 마음을 짐작하는 차시에서 감정 낱말 카드를 활용하니 학생들이 적극적으로 짝과 의견을 나누며 발표에 몰입했다. 칭찬 스티커 대신 구체적인 발문을 칭찬하니 자존감이 높아 보였다.',
    improvement:
      '활동 시간이 길어져서 마지막 학습 정리 및 일기 연계 과제 안내가 2분 만에 서둘러 끝났다. 다음엔 타이머를 적극적으로 써야겠다.',
    studentReaction:
      '학생들이 "주인공 마음이 너무 안타까워요!"라며 공감대를 형성하고 서로 다른 감정 표현을 찾아보려 경쟁적으로 사전을 뒤졌다.',
    aiActionSuggestion:
      '내일은 활동 시작 전 모둠 대표에게 7분 모래시계를 주고 시간 관리를 학생 주도로 맡겨보세요.',
    aiFeedback:
      '학생들의 감정 어휘력을 풍부하게 이끌어낸 훌륭한 수업이었습니다. 짝 활동의 배움이 돋보입니다.',
    positiveKeywords: ['발표', '경청', '감정낱말', '몰입'],
    isActionCompleted: true,
  },
  {
    id: 'demo-2',
    userId: 'demo',
    userEmail: 'teacher@school.net',
    date: '2026-10-20',
    subject: '수학',
    wellDone:
      '분수의 크기 비교를 원형 조각 교구로 직접 맞춰보게 하니 개념 이해 속도가 빨랐다. 모둠 안에서 서로 가르쳐주는 또래 교수 활동이 자연스럽게 일어났다.',
    improvement:
      '수학 익힘책 개별 해결 단계에서 오답이 많은 학생 3명을 동시에 봐주느라 다른 학생들의 심화 문제를 제때 피드백하지 못했다.',
    studentReaction:
      '평소 수학 시간에 엎드리던 학생도 교구를 만지면서 "아, 분모가 커지면 조각이 더 작아지는 거구나!" 하고 스스로 깨달음.',
    aiActionSuggestion:
      '내일은 익힘책 풀이 시 또래 도우미(미리 푼 학생) 2명을 지정해 1차 점검을 돕도록 해보세요.',
    aiFeedback:
      '구체물을 통한 조작적 이해는 분수 학습의 최고의 접근입니다. 학생의 자기 주도적 발견을 멋지게 끌어내셨습니다.',
    positiveKeywords: ['교구활용', '이해', '또래교수', '성취감'],
    isActionCompleted: false,
  },
  {
    id: 'demo-3',
    userId: 'demo',
    userEmail: 'teacher@school.net',
    date: '2026-10-17',
    subject: '사회',
    wellDone:
      '우리 고장의 문화유산 조사 발표 수업에서 퀴즈 형식의 골든벨을 접목하니 전원 집중도가 최고조였다. 질문과 경청 분위기가 훌륭했다.',
    improvement:
      '특정 모둠이 발표할 때 음향 마이크 연결이 고장나서 5분간 흐름이 끊겼다. 기자재 사전 점검이 필요하다.',
    studentReaction:
      '친구들의 퀴즈에 맞추려고 교과서와 조사 노트를 열심히 넘기며 환호하고 박수 치는 분위기였음.',
    aiActionSuggestion:
      '내일 아침 조회 직후 수업에 쓸 멀티미디어 기자재를 1분간 미리 켜서 테스트해 두세요.',
    aiFeedback:
      '교실 전체의 활기와 참여를 이끌어낸 아이디어가 빛났습니다. 아이들이 사회를 재미있게 기억할 것입니다.',
    positiveKeywords: ['집중', '경청', '질문', '퀴즈', '협동'],
    isActionCompleted: true,
  },
  {
    id: 'demo-4',
    userId: 'demo',
    userEmail: 'teacher@school.net',
    date: '2026-10-15',
    subject: '과학',
    wellDone:
      '물질의 상태 변화 실험에서 안전 수칙을 먼저 챈트로 함께 외우고 시작했더니 한 명의 부주의 없이 안전하고 차분하게 관찰을 마쳤다.',
    improvement:
      '실험 보고서 작성 시간이 다소 빠듯해 결과를 문장으로 정리하는 깊이가 얕았다.',
    studentReaction:
      '기포가 보글보글 올라오는 모습을 돋보기로 관찰하며 신기해하고 서로 스마트패드로 사진을 찍어 기록함.',
    aiActionSuggestion:
      '내일은 관찰 보고서 양식에 긴 줄글 대신 핵심 관찰 단어 3개만 적는 체크박스를 마련해 보세요.',
    aiFeedback:
      '안전을 최우선으로 챙기면서도 탐구의 기쁨을 선사한 수업입니다.',
    positiveKeywords: ['실험', '안전', '호기심', '관찰'],
    isActionCompleted: false,
  },
  {
    id: 'demo-5',
    userId: 'demo',
    userEmail: 'teacher@school.net',
    date: '2026-10-12',
    subject: '미술',
    wellDone:
      '전통 문양 협동화 그리기에서 각자 맡은 조각을 모아 대형 벽화로 완성했을 때 감동이 컸다. 서로의 작품을 칭찬하는 갤러리 워크가 평화로웠다.',
    improvement:
      '아크릴 물감 정리 과정에서 개수대에 물감이 묻어 뒤정리 시간이 많이 소요되었다.',
    studentReaction:
      '벽에 다 붙여진 완성작을 보고 감탄사를 연발하며 부모님께 사진을 보여드리고 싶다고 자랑함.',
    aiActionSuggestion:
      '내일 미술 시간에는 종료 10분 전 "물티슈 1장 정리 챌린지" 타이머를 걸어 게임처럼 치워보세요.',
    aiFeedback:
      '협동을 통해 더 큰 성취감을 경험하게 해주신 멋진 기획이었습니다.',
    positiveKeywords: ['협동', '칭찬', '성취감', '자신감'],
    isActionCompleted: true,
  },
  {
    id: 'demo-6',
    userId: 'demo',
    userEmail: 'teacher@school.net',
    date: '2026-10-08',
    subject: '도덕',
    wellDone:
      '갈등 해결 상황극 활동에서 학생들이 솔직한 감정을 털어놓고 상대방의 입장에서 생각해보는 질문에 깊이 있는 답변을 내놓았다.',
    improvement:
      '감정이 격해져서 장난으로 치부하려는 일부 학생들의 태도를 초반에 바로잡아주지 못했다.',
    studentReaction:
      '"선생님, 저도 저런 상황에서 억울했을 것 같아요"라며 진지하게 공감하는 학생이 많았음.',
    aiActionSuggestion:
      '내일 아침 모임에서 "오늘 하루 친구의 말에 공감 한 번 해주기" 미션을 학급 규칙으로 가볍게 제시해 보세요.',
    aiFeedback:
      '아이들의 마음을 보듬고 공동체성을 기르는 뜻깊은 성찰 수업이었습니다.',
    positiveKeywords: ['공감', '경청', '질문', '배려'],
    isActionCompleted: true,
  },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<'write' | 'journal' | 'stats' | 'actions'>('write');
  const [reflections, setReflections] = useState<ReflectionNote[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Filters passed to journal tab
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | null>(null);
  const [selectedWordFilter, setSelectedWordFilter] = useState<string | null>(null);

  // 1. Validate connection on boot as required by Firebase skill
  useEffect(() => {
    testConnection();
  }, []);

  // 2. Auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (currentUser) {
        setIsDemoMode(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Attach onSnapshot listener when user is authenticated
  useEffect(() => {
    if (!user) {
      if (isDemoMode) {
        setReflections(DEMO_REFLECTIONS);
      } else {
        setReflections([]);
      }
      return;
    }

    const q = query(
      collection(db, 'reflections'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: ReflectionNote[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<ReflectionNote, 'id'>;
          loaded.push({
            ...data,
            id: docSnap.id,
          });
        });

        // Sort descending by date, then createdAt
        loaded.sort((a, b) => {
          if (b.date !== a.date) {
            return b.date.localeCompare(a.date);
          }
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });

        setReflections(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reflections');
      }
    );

    return () => unsubscribe();
  }, [user, isDemoMode]);

  const handleSavedNote = (savedNote: ReflectionNote) => {
    // If not using real DB in demo mode
    if (!user && isDemoMode) {
      setReflections((prev) => [savedNote, ...prev]);
    }
    setActiveTab('journal');
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Sign-in error:', err);
    }
  };

  const handleSelectSubjectFromStats = (subject: string) => {
    setSelectedSubjectFilter(subject);
    setActiveTab('journal');
  };

  const handleSelectWordFromStats = (word: string) => {
    setSelectedWordFilter(word);
    setActiveTab('journal');
  };

  const activeReflections = reflections;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-amber-200">
      {/* Global Header */}
      <Header
        user={user}
        loadingAuth={loadingAuth}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalCount={activeReflections.length}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Welcome & Auth prompt banner if not logged in */}
        {!user && !loadingAuth && (
          <div className="mb-6 bg-linear-to-r from-amber-500 via-amber-600 to-amber-700 text-white rounded-2xl p-5 sm:p-7 shadow-md relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" /> 선생님의 따뜻한 수업 기록 공간
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                매일 수업을 짧게 남기면,
                <br />
                AI가 '내일 해 볼 작은 실천 1가지'를 찾아드립니다.
              </h2>
              <p className="text-amber-100 text-xs sm:text-sm mt-2 leading-relaxed">
                구글 로그인 시 본인만의 성찰 기록이 클라우드 데이터베이스에 안전하게 보관되며,
                과목별 통계와 최근 4주간 '잘된 점'에 자주 나타난 수업 강점 낱말을 한눈에 확인할 수 있습니다.
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button
                  onClick={handleSignIn}
                  className="px-5 py-2.5 rounded-xl bg-white text-stone-950 text-xs sm:text-sm font-bold hover:bg-stone-100 transition-all shadow-sm flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-amber-600" />
                  구글 계정으로 로그인하여 시작하기
                </button>

                {!isDemoMode && (
                  <button
                    onClick={() => {
                      setIsDemoMode(true);
                      setReflections(DEMO_REFLECTIONS);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-800/60 hover:bg-amber-800 text-white text-xs sm:text-sm font-medium border border-amber-400/40 transition-colors"
                  >
                    체험용 예시 데이터 둘러보기
                  </button>
                )}
              </div>
            </div>

            {/* Decorative background icons */}
            <div className="absolute -right-6 -bottom-8 opacity-10 text-white pointer-events-none">
              <BookOpen className="w-64 h-64" />
            </div>
          </div>
        )}

        {/* Demo Mode Notice Banner */}
        {isDemoMode && !user && (
          <div className="mb-5 bg-stone-100 border border-stone-300 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-stone-700">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <strong>체험 모드:</strong> 실제 수업 성찰 예시 데이터 6건을 불러왔습니다. 통계, 낱말 분석, 실천 보관함을 자유롭게 확인해 보세요.
            </span>
            <button
              onClick={handleSignIn}
              className="font-bold text-amber-800 hover:underline flex items-center gap-1"
            >
              내 기록 저장하려면 로그인 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Write Reflection */}
        {activeTab === 'write' && (
          <div className="animate-in fade-in duration-200">
            <ReflectionForm
              user={user}
              onSaved={handleSavedNote}
              onRequireAuth={handleSignIn}
            />
          </div>
        )}

        {/* Tab 2: Journal & Feed */}
        {activeTab === 'journal' && (
          <div className="animate-in fade-in duration-200">
            <ReflectionList
              reflections={activeReflections}
              selectedSubjectFilter={selectedSubjectFilter}
              onClearSubjectFilter={() => setSelectedSubjectFilter(null)}
              selectedWordFilter={selectedWordFilter}
              onClearWordFilter={() => setSelectedWordFilter(null)}
              onOpenCreate={() => setActiveTab('write')}
            />
          </div>
        )}

        {/* Tab 3: Statistics (Subject counts & 4-week well-done words) */}
        {activeTab === 'stats' && (
          <div className="animate-in fade-in duration-200">
            <StatisticsView
              reflections={activeReflections}
              onSelectSubject={handleSelectSubjectFromStats}
              onSelectWord={handleSelectWordFromStats}
            />
          </div>
        )}

        {/* Tab 4: Tomorrow's Actions Checklist */}
        {activeTab === 'actions' && (
          <div className="animate-in fade-in duration-200">
            <ActionListTab
              reflections={activeReflections}
              onOpenCreate={() => setActiveTab('write')}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-stone-500 font-medium">
            <BookOpen className="w-4 h-4 text-amber-600" />
            수업 성찰 노트 — 교사의 작은 실천이 교실을 바꿉니다.
          </p>
          <p className="text-[11px] text-stone-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            학생 개인정보 보호 준수 & Firebase 보안 규칙 적용
          </p>
        </div>
      </footer>
    </div>
  );
}
