import React from 'react';
import { User } from 'firebase/auth';
import { signInWithPopup, signOut, googleProvider, auth } from '../firebase';
import { BookOpen, LogIn, LogOut, Sparkles, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  loadingAuth: boolean;
  activeTab: 'write' | 'journal' | 'stats' | 'actions';
  setActiveTab: (tab: 'write' | 'journal' | 'stats' | 'actions') => void;
  totalCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  loadingAuth,
  activeTab,
  setActiveTab,
  totalCount,
}) => {
  const [authError, setAuthError] = React.useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Sign-in failed:', err);
      setAuthError('구글 로그인에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center border border-amber-500/20 shadow-xs">
              <BookOpen className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-stone-900">
                  수업 성찰 노트
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> AI 코치
                </span>
              </div>
              <p className="text-xs text-stone-500">
                매일 3분의 기록, AI가 제안하는 내일의 작은 실천
              </p>
            </div>
          </div>

          {/* User Auth Info & Controls */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            {loadingAuth ? (
              <div className="text-xs text-stone-400 animate-pulse px-3 py-1.5">
                인증 확인 중...
              </div>
            ) : user ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 pl-2 pr-3 py-1 bg-stone-50 rounded-full border border-stone-200">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || '선생님'}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-stone-300"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-stone-600">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-xs font-semibold text-stone-800 leading-none">
                      {user.displayName || '선생님'}
                    </p>
                    <p className="text-[10px] text-stone-500 leading-tight">
                      기록 {totalCount}건
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  title="로그아웃"
                  className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors border border-transparent hover:border-stone-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors shadow-xs"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                구글 로그인으로 시작하기
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 mt-3 pt-2 border-t border-stone-100 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('write')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'write'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <span>✍️</span> 오늘의 성찰 쓰기
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'journal'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <span>📖</span> 성찰 일지
            {totalCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'journal' ? 'bg-amber-700 text-amber-100' : 'bg-stone-200 text-stone-700'
              }`}>
                {totalCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'stats'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <span>📊</span> 성찰 통계
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'actions'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <span>🎯</span> 내일의 작은 실천
          </button>
        </div>
      </div>
      {authError && (
        <div className="bg-rose-50 text-rose-700 border-b border-rose-200 text-xs py-1.5 px-4 text-center">
          {authError}
        </div>
      )}
    </header>
  );
};
