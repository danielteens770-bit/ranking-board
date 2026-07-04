'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Praise, RankingItem, UserRole } from '@/types';
import { PraiseModal } from '@/components/PraiseModal';
import { PraiseInputModal } from '@/components/PraiseInputModal';
import { useToast } from '@/context/ToastContext';
import {
  Trophy,
  UserCheck,
  GraduationCap,
  Calendar,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  MessageSquareHeart,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';

// KST Helper Functions
const getCurrentKSTMonth = (): string => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value || '2026';
  const month = parts.find(p => p.type === 'month')?.value || '07';
  return `${year}-${month}`;
};

const getAvailableMonthsList = (startMonth: string): string[] => {
  const months: string[] = [];
  let [year, month] = startMonth.split('-').map(Number);
  for (let i = 0; i < 12; i++) {
    const formattedMonth = String(month).padStart(2, '0');
    months.push(`${year}-${formattedMonth}`);
    month--;
    if (month < 1) {
      month = 12;
      year--;
    }
  }
  return months;
};

export default function DashboardPage() {
  const { showToast } = useToast();
  
  const currentKSTMonth = React.useMemo(() => getCurrentKSTMonth(), []);
  const availableMonths = React.useMemo(() => getAvailableMonthsList(currentKSTMonth), [currentKSTMonth]);

  // State variables
  const [users, setUsers] = useState<User[]>([]);
  const [praises, setPraises] = useState<Praise[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentKSTMonth);
  const [loading, setLoading] = useState<boolean>(true);
  const [rankingTab, setRankingTab] = useState<'received' | 'given'>('received');
  
  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [detailModalData, setDetailModalData] = useState<{
    mode: 'received' | 'given';
    targetName: string;
    targetRole: UserRole;
    items: { id: string; name: string; role: UserRole; message: string }[];
    count: number;
  }>({
    mode: 'received',
    targetName: '',
    targetRole: 'student',
    items: [],
    count: 0,
  });

  // Input Modal State
  const [inputModalOpen, setInputModalOpen] = useState<boolean>(false);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch praises for selected month
      const { data: praisesData, error: praisesError } = await supabase
        .from('praises')
        .select('*')
        .eq('month', selectedMonth);

      if (praisesError) throw praisesError;
      setPraises(praisesData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err.message);
      showToast('데이터를 불러오는 데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, showToast]);

  useEffect(() => {
    fetchData();

    // Subscribe to praises changes
    const praisesSubscription = supabase
      .channel('realtime-praises')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'praises' },
        (payload) => {
          console.log('Realtime change received:', payload);
          fetchData();
        }
      )
      .subscribe();

    // Subscribe to users changes
    const usersSubscription = supabase
      .channel('realtime-users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(praisesSubscription);
      supabase.removeChannel(usersSubscription);
    };
  }, [fetchData]);

  // Compute rankings
  // 1. Praise Received Ranking
  const receivedRankings: RankingItem[] = users
    .map((user) => {
      const count = praises.filter((p) => p.receiver_id === user.id).length;
      return { id: user.id, name: user.name, role: user.role, count };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // 2. Praise Given - Students
  const studentGivenRankings: RankingItem[] = users
    .filter((user) => user.role === 'student')
    .map((user) => {
      const count = praises.filter((p) => p.giver_id === user.id).length;
      return { id: user.id, name: user.name, role: user.role, count };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // 3. Praise Given - Teachers
  const teacherGivenRankings: RankingItem[] = users
    .filter((user) => user.role === 'teacher')
    .map((user) => {
      const count = praises.filter((p) => p.giver_id === user.id).length;
      return { id: user.id, name: user.name, role: user.role, count };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // Get Top 1s (including co-first places)
  const maxReceivedCount = receivedRankings[0]?.count || 0;
  const topReceivers = receivedRankings.filter(r => r.count === maxReceivedCount && maxReceivedCount > 0);

  const maxStudentGivenCount = studentGivenRankings[0]?.count || 0;
  const topStudentGivers = studentGivenRankings.filter(r => r.count === maxStudentGivenCount && maxStudentGivenCount > 0);

  const maxTeacherGivenCount = teacherGivenRankings[0]?.count || 0;
  const topTeacherGivers = teacherGivenRankings.filter(r => r.count === maxTeacherGivenCount && maxTeacherGivenCount > 0);

  // Trigger confetti for the top receiver if ranking loaded and has count
  useEffect(() => {
    if (!loading && topReceivers.length > 0) {
      const duration = 2 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 25, spread: 360, ticks: 50, zIndex: 40 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 30 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [loading, selectedMonth, praises.length, topReceivers.length]); // fire on month change or praises count change or top receivers count change

  // Handle open detail modal
  const openDetailModal = (userId: string, userName: string, userRole: UserRole, mode: 'received' | 'given') => {
    let items: { id: string; name: string; role: UserRole; message: string }[] = [];
    let count = 0;

    if (mode === 'received') {
      const filtered = praises.filter((p) => p.receiver_id === userId);
      count = filtered.length;
      items = filtered.map((p) => {
        const giver = users.find((u) => u.id === p.giver_id);
        return {
          id: p.id,
          name: giver ? giver.name : '알 수 없음',
          role: giver ? giver.role : 'student',
          message: p.message,
        };
      });
    } else {
      const filtered = praises.filter((p) => p.giver_id === userId);
      count = filtered.length;
      items = filtered.map((p) => {
        const receiver = users.find((u) => u.id === p.receiver_id);
        return {
          id: p.id,
          name: receiver ? receiver.name : '알 수 없음',
          role: receiver ? receiver.role : 'student',
          message: p.message,
        };
      });
    }

    setDetailModalData({
      mode,
      targetName: userName,
      targetRole: userRole,
      items,
      count,
    });
    setDetailModalOpen(true);
  };

  const getFullMonthName = (monthStr: string) => {
    const [year, m] = monthStr.split('-');
    return `${year}년 ${parseInt(m, 10)}월`;
  };

  return (
    <div className="space-y-8 pb-10 max-w-5xl mx-auto">
      {/* Top Section (Plain/Border-free layout) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-6 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            다니엘틴즈 칭찬왕 대시보드
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            학교 구성원들이 전한 따뜻한 이야기를 실시간으로 확인해 보세요.
          </p>
        </div>

        {/* Dropdown & Modal trigger button */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setLoading(true);
                setSelectedMonth(e.target.value);
              }}
              className="appearance-none pl-10 pr-10 py-3 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-850 dark:text-stone-100 font-bold rounded-2xl text-sm transition-all cursor-pointer focus:outline-hidden"
              aria-label="조회할 월 선택"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {getFullMonthName(m)}
                </option>
              ))}
            </select>
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
          </div>

          <button
            onClick={() => setInputModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-6 py-3 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-stone-50 dark:text-stone-900 font-extrabold rounded-2xl text-sm transition-all active:scale-98 cursor-pointer shadow-sm"
            aria-label="데이터 입력"
          >
            데이터 입력
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        /* Loading Skeleton */
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 rounded-3xl skeleton" />
            <div className="h-64 rounded-3xl skeleton" />
            <div className="h-64 rounded-3xl skeleton" />
          </div>
        </div>
      ) : (
        <>
          {/* Top 3 Cards — 동일한 크기의 3-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 칭찬왕 */}
            <div
              onClick={() => topReceivers.length > 0 && openDetailModal(topReceivers[0].id, topReceivers[0].name, topReceivers[0].role, 'received')}
              className={`relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-955/20 dark:to-stone-900 border border-amber-200 dark:border-amber-900/40 hover:border-amber-350 dark:hover:border-amber-800 rounded-3xl p-8 flex flex-col justify-between h-72 group ${
                topReceivers.length > 0 ? 'cursor-pointer' : ''
              } hover:scale-[1.02] transition-all duration-300 shadow-sm`}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-amber-900 dark:text-amber-300 text-lg font-black tracking-tight">
                    칭찬왕
                  </span>
                </div>
                {topReceivers.length > 0 ? (
                  <div className="space-y-1">
                    <h2 className="text-4xl md:text-5xl font-black text-amber-950 dark:text-amber-100 tracking-tight transition-colors flex flex-wrap gap-x-2 gap-y-1">
                      {topReceivers.map((item, idx) => (
                        <React.Fragment key={item.id}>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetailModal(item.id, item.name, item.role, 'received');
                            }}
                            className="hover:underline cursor-pointer"
                          >
                            {item.name}
                          </span>
                          {idx < topReceivers.length - 1 && (
                            <span className="text-amber-400/80 dark:text-amber-600/80 font-medium mr-1">,</span>
                          )}
                        </React.Fragment>
                      ))}
                    </h2>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-amber-400 dark:text-amber-600">-</span>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-amber-200/60 dark:border-amber-900/30 pt-4">
                <span className="text-xs font-semibold text-amber-700/80 dark:text-amber-400/80">횟수</span>
                <span className="text-2xl font-black text-amber-950 dark:text-amber-100">
                  {topReceivers.length > 0 ? `${topReceivers[0].count}회` : '0회'}
                </span>
              </div>
            </div>

            {/* 칭마에(학생) */}
            <div
              onClick={() => topStudentGivers.length > 0 && openDetailModal(topStudentGivers[0].id, topStudentGivers[0].name, topStudentGivers[0].role, 'given')}
              className={`relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100/60 dark:from-indigo-955/20 dark:to-stone-900 border border-indigo-200 dark:border-indigo-900/40 hover:border-indigo-350 dark:hover:border-indigo-800 rounded-3xl p-8 flex flex-col justify-between h-72 group ${
                topStudentGivers.length > 0 ? 'cursor-pointer' : ''
              } hover:scale-[1.02] transition-all duration-300 shadow-sm`}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-indigo-900 dark:text-indigo-300 text-lg font-black tracking-tight">
                    칭마에(학생)
                  </span>
                </div>
                {topStudentGivers.length > 0 ? (
                  <div className="space-y-1">
                    <h2 className="text-4xl md:text-5xl font-black text-indigo-950 dark:text-indigo-100 tracking-tight transition-colors flex flex-wrap gap-x-2 gap-y-1">
                      {topStudentGivers.map((item, idx) => (
                        <React.Fragment key={item.id}>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetailModal(item.id, item.name, item.role, 'given');
                            }}
                            className="hover:underline cursor-pointer"
                          >
                            {item.name}
                          </span>
                          {idx < topStudentGivers.length - 1 && (
                            <span className="text-indigo-400/80 dark:text-indigo-600/80 font-medium mr-1">,</span>
                          )}
                        </React.Fragment>
                      ))}
                    </h2>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-indigo-400 dark:text-indigo-600">-</span>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-indigo-200/60 dark:border-indigo-900/30 pt-4">
                <span className="text-xs font-semibold text-indigo-700/80 dark:text-indigo-400/80">횟수</span>
                <span className="text-2xl font-black text-indigo-950 dark:text-indigo-100">
                  {topStudentGivers.length > 0 ? `${topStudentGivers[0].count}회` : '0회'}
                </span>
              </div>
            </div>

            {/* 칭마에(교사) */}
            <div
              onClick={() => topTeacherGivers.length > 0 && openDetailModal(topTeacherGivers[0].id, topTeacherGivers[0].name, topTeacherGivers[0].role, 'given')}
              className={`relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-955/20 dark:to-stone-900 border border-emerald-200 dark:border-emerald-900/40 hover:border-emerald-350 dark:hover:border-emerald-800 rounded-3xl p-8 flex flex-col justify-between h-72 group ${
                topTeacherGivers.length > 0 ? 'cursor-pointer' : ''
              } hover:scale-[1.02] transition-all duration-300 shadow-sm`}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-emerald-900 dark:text-emerald-300 text-lg font-black tracking-tight">
                    칭마에(교사)
                  </span>
                </div>
                {topTeacherGivers.length > 0 ? (
                  <div className="space-y-1">
                    <h2 className="text-4xl md:text-5xl font-black text-emerald-950 dark:text-emerald-100 tracking-tight transition-colors flex flex-wrap gap-x-2 gap-y-1">
                      {topTeacherGivers.map((item, idx) => (
                        <React.Fragment key={item.id}>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetailModal(item.id, item.name, item.role, 'given');
                            }}
                            className="hover:underline cursor-pointer"
                          >
                            {item.name}
                          </span>
                          {idx < topTeacherGivers.length - 1 && (
                            <span className="text-emerald-400/80 dark:text-emerald-600/80 font-medium mr-1">,</span>
                          )}
                        </React.Fragment>
                      ))}
                    </h2>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-emerald-400 dark:text-emerald-600">-</span>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-emerald-200/60 dark:border-emerald-900/30 pt-4">
                <span className="text-xs font-semibold text-emerald-700/80 dark:text-emerald-400/80">횟수</span>
                <span className="text-2xl font-black text-emerald-955 dark:text-emerald-100">
                  {topTeacherGivers.length > 0 ? `${topTeacherGivers[0].count}회` : '0회'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Praise Detail Modal */}
      <PraiseModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        mode={detailModalData.mode}
        targetName={detailModalData.targetName}
        targetRole={detailModalData.targetRole}
        month={selectedMonth}
        items={detailModalData.items}
        count={detailModalData.count}
      />

      {/* New Praise Input Modal */}
      <PraiseInputModal
        isOpen={inputModalOpen}
        onClose={() => setInputModalOpen(false)}
        onSuccess={fetchData}
        currentMonth={selectedMonth}
      />
    </div>
  );
}
