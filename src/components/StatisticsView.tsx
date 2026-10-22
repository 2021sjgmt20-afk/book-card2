import React, { useState } from 'react';
import { ReflectionNote } from '../types';
import {
  calculateSubjectStats,
  analyzeWellDoneWords,
  getRecent4WeeksReflections,
} from '../utils/analysis';
import {
  BarChart3,
  Calendar,
  Sparkles,
  TrendingUp,
  Award,
  Hash,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface StatisticsViewProps {
  reflections: ReflectionNote[];
  onSelectSubject?: (subject: string) => void;
  onSelectWord?: (word: string) => void;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  reflections,
  onSelectSubject,
  onSelectWord,
}) => {
  const [selectedWordSnippet, setSelectedWordSnippet] = useState<{
    word: string;
    snippets: string[];
    count: number;
  } | null>(null);

  const { filtered: recent4WeeksList, startDateStr, endDateStr } =
    getRecent4WeeksReflections(reflections);

  const [useAllTimeForWords, setUseAllTimeForWords] = useState(false);

  const subjectStats = calculateSubjectStats(reflections);
  const targetForWords = useAllTimeForWords ? reflections : recent4WeeksList;
  const wordStats = analyzeWellDoneWords(targetForWords, 25);

  const totalCount = reflections.length;
  const recentCount = recent4WeeksList.length;
  const topSubject = subjectStats[0]?.subject || '-';

  if (totalCount === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 mb-4 border border-amber-100">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-2">
          아직 성찰 기록이 없습니다
        </h3>
        <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto mb-6">
          오늘 수업에 대한 짧은 성찰을 한 편 기록해 보세요. 기록이 쌓이면 과목별 통계와 나의 수업 강점 낱말 분석이 자동으로 생성됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-medium mb-1">
            <Hash className="w-4 h-4 text-amber-600" />
            <span>총 성찰 기록</span>
          </div>
          <div className="text-2xl font-black text-stone-900">
            {totalCount}<span className="text-xs font-normal text-stone-400 ml-1">편</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">지속된 수업 고민의 발자취</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-medium mb-1">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>최근 4주 기록</span>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {recentCount}<span className="text-xs font-normal text-stone-400 ml-1">편</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">{startDateStr} ~ {endDateStr}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-medium mb-1">
            <Award className="w-4 h-4 text-blue-600" />
            <span>가장 많이 성찰한 과목</span>
          </div>
          <div className="text-2xl font-black text-stone-900">
            {topSubject}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            {subjectStats[0] ? `${subjectStats[0].count}회 (${subjectStats[0].percentage}%)` : ''}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-medium mb-1">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span>성찰 교사 뱃지</span>
          </div>
          <div className="text-sm font-bold text-stone-800 flex items-center gap-1 mt-1">
            🌟 {totalCount >= 10 ? '수업 연구 마스터' : totalCount >= 5 ? '열정 성찰가' : '배움의 실천가'}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">매일 한 걸음씩 성장하는 수업</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* REQUIREMENT 1: 과목별 기록 수 */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-900">
                    과목별 기록 수
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    과목별 성찰 빈도와 비중
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                총 {subjectStats.length}개 과목
              </span>
            </div>

            {/* Subject Bars */}
            <div className="space-y-3.5">
              {subjectStats.map((stat) => (
                <div
                  key={stat.subject}
                  onClick={() => onSelectSubject?.(stat.subject)}
                  className="group cursor-pointer hover:bg-stone-50 p-1.5 rounded-xl transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: stat.color }}
                      ></span>
                      {stat.subject}
                    </span>
                    <div className="text-stone-500 text-[11px] flex items-center gap-1.5">
                      <span className="font-bold text-stone-800">{stat.count}회</span>
                      <span className="text-stone-400">({stat.percentage}%)</span>
                      <ChevronRight className="w-3 h-3 text-stone-300 group-hover:text-stone-600 transition-colors" />
                    </div>
                  </div>
                  {/* Progress track */}
                  <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${stat.percentage}%`,
                        backgroundColor: stat.color,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-stone-400 mt-4 pt-3 border-t border-stone-100">
            💡 과목을 클릭하면 성찰 일지에서 해당 과목만 모아볼 수 있습니다.
          </p>
        </div>

        {/* REQUIREMENT 2: 최근 4주간 '잘된 점'에 자주 나온 낱말 */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-stone-100 gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-stone-900">
                  최근 4주간 '잘된 점'에 자주 나온 낱말
                </h3>
                <p className="text-[11px] text-stone-500">
                  선생님의 수업에서 빛난 교육적 강점과 배움의 키워드
                </p>
              </div>
            </div>

            {/* Toggle 4 weeks vs all */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setUseAllTimeForWords(false)}
                className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${
                  !useAllTimeForWords
                    ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                최근 4주
              </button>
              <button
                type="button"
                onClick={() => setUseAllTimeForWords(true)}
                className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${
                  useAllTimeForWords
                    ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                전체 기간
              </button>
            </div>
          </div>

          {/* Date range indicator */}
          <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-600">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>
              기준 기간: {useAllTimeForWords ? '전체 성찰 기록' : `${startDateStr} ~ ${endDateStr} (최근 4주)`}
            </span>
            <span className="font-semibold text-emerald-700 ml-1">
              ({targetForWords.length}편 분석)
            </span>
          </div>

          {wordStats.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              선택한 기간 동안의 '잘된 점' 데이터가 충분하지 않습니다.
            </div>
          ) : (
            <>
              {/* Interactive Word Cloud / Pill Grid */}
              <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200/80 mb-5 flex flex-wrap items-center justify-center gap-2 min-h-36">
                {wordStats.map((item, index) => {
                  // Size scaling based on rank/count
                  const maxCount = wordStats[0]?.count || 1;
                  const ratio = item.count / maxCount;
                  let sizeClass = 'text-xs px-2.5 py-1';
                  let bgClass = 'bg-white text-stone-700 border-stone-200';

                  if (index === 0) {
                    sizeClass = 'text-base font-extrabold px-3.5 py-1.5';
                    bgClass = 'bg-emerald-600 text-white border-emerald-700 shadow-xs';
                  } else if (index < 3) {
                    sizeClass = 'text-sm font-bold px-3 py-1.2';
                    bgClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                  } else if (ratio > 0.4) {
                    sizeClass = 'text-xs font-semibold px-2.5 py-1';
                    bgClass = 'bg-amber-50 text-amber-900 border-amber-200';
                  }

                  return (
                    <button
                      key={item.word}
                      type="button"
                      onClick={() => {
                        setSelectedWordSnippet({
                          word: item.word,
                          snippets: item.sampleSnippets || [],
                          count: item.count,
                        });
                        onSelectWord?.(item.word);
                      }}
                      className={`rounded-full border transition-transform hover:scale-105 active:scale-95 flex items-center gap-1.5 ${sizeClass} ${bgClass}`}
                    >
                      <span>#{item.word}</span>
                      <span className="text-[10px] opacity-75">
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Word Snippet Preview Modal/Banner */}
              {selectedWordSnippet && (
                <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl mb-4 animate-in fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                      '{selectedWordSnippet.word}' 낱말이 쓰인 수업 잘된 점 ({selectedWordSnippet.count}회 등장)
                    </span>
                    <button
                      onClick={() => setSelectedWordSnippet(null)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold"
                    >
                      닫기
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs text-stone-700">
                    {selectedWordSnippet.snippets.map((snip, i) => (
                      <div key={i} className="bg-white/80 p-2 rounded-lg border border-emerald-100 text-[11px] leading-relaxed">
                        “...{snip}...”
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ranked Table of Top 8 Words */}
              <div>
                <h4 className="text-xs font-bold text-stone-700 mb-2.5 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-stone-400" />
                  수업 강점 낱말 빈도 랭킹 (Top 8)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {wordStats.slice(0, 8).map((w, idx) => (
                    <div
                      key={w.word}
                      onClick={() => {
                        setSelectedWordSnippet({
                          word: w.word,
                          snippets: w.sampleSnippets || [],
                          count: w.count,
                        });
                      }}
                      className="p-2.5 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200/70 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-stone-800 flex items-center gap-1">
                          <span className="text-[10px] text-stone-400 font-bold">{idx + 1}.</span>
                          {w.word}
                        </span>
                        <span className="font-bold text-emerald-700 text-[11px]">{w.count}회</span>
                      </div>
                      <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (w.count / (wordStats[0]?.count || 1)) * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <p className="text-[11px] text-stone-400 mt-4 pt-3 border-t border-stone-100">
            💡 낱말을 클릭하면 해당 강점이 기록된 실제 수업 문장을 확인할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};
