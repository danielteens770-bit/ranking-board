'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Praise, PraiseWithDetails, RankingItem, UserRole } from '@/types';
import { PraiseModal } from '@/components/PraiseModal';
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

export default function DashboardPage() {
  const { showToast } = useToast();
  
  // State variables
  const [users, setUsers] = useState<User[]>([]);
  const [praises, setPraises] = useState<Praise[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-06'); // Current local time is June 2026
  const [loading, setLoading] = useState<boolean>(true);
  const [rankingTab, setRankingTab] = useState<'received' | 'given'>('received');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalData, setModalData] = useState<{
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

  // Generated months list (last 12 months from 2026-06)
  const availableMonths = [
    '2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01',
    '2025-12', '2025-11', '2025-10', '2025-09', '2025-08', '2025-07'
  ];

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
          showToast('칭찬 데이터가 실시간으로 반영되었습니다.', 'success');
        }
      )
      .subscribe();

    // Subscribe to users changes
    const usersSubscription = supabase
      .channel('realtime-users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(praisesSubscription);
      supabase.removeChannel(usersSubscription);
    };
  }, [fetchData, showToast]);

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

  // Get Top 1s
  const topReceived = receivedRankings[0] || null;
  const topStudentGiver = studentGivenRankings[0] || null;
  const topTeacherGiver = teacherGivenRankings[0] || null;

  // Trigger confetti for the top receiver if ranking loaded and has count
  useEffect(() => {
    if (!loading && topReceived && topReceived.count > 0) {
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
  }, [loading, selectedMonth, praises.length]); // fire on month change or praises count change

  // Handle open modal
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

    setModalData({
      mode,
      targetName: userName,
      targetRole: userRole,
      items,
      count,
    });
    setModalOpen(true);
  };

  const getFullMonthName = (monthStr: string) => {
    const [year, m] = monthStr.split('-');
    return `${year}년 ${parseInt(m, 10)}월`;
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Top Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-stone-900/60 p-6 rounded-3xl border border-stone-250/20 dark:border-stone-850/40 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/40 mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            실시간 랭킹 시스템 작동 중
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-50 tracking-tight">
            {getFullMonthName(selectedMonth)} 칭찬 랭킹
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            학교 구성원들이 전한 따뜻한 이야기를 실시간 랭킹으로 확인해 보세요.
          </p>
        </div>

        {/* Dropdown & Admin Navigation */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setLoading(true);
                setSelectedMonth(e.target.value);
              }}
              className="appearance-none pl-10 pr-10 py-3 bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-850 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold rounded-2xl text-sm transition-all border border-transparent hover:border-stone-250/30 cursor-pointer focus:outline-hidden"
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

          <a
            href="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/20 active:scale-98"
            aria-label="데이터 입력 페이지로 이동"
          >
            데이터 입력
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {loading ? (
        /* Loading Skeleton Slices */
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-3xl skeleton" />
            ))}
          </div>
          <div className="h-96 rounded-3xl skeleton" />
        </div>
      ) : (
        <>
          {/* Top 3 Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1등: 이달의 칭찬왕 (가장 많이 받은 사람) */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-orange-400/5 to-transparent dark:from-amber-950/20 dark:via-orange-950/10 dark:to-transparent border border-amber-300/40 dark:border-amber-900/30 rounded-3xl p-6 flex flex-col justify-between group hover:scale-[1.01] transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
                    🏆 이달의 칭찬왕
                  </span>
                  <Trophy className="w-6 h-6 text-amber-500 fill-amber-500/20" />
                </div>
                {topReceived ? (
                  <button
                    onClick={() => openDetailModal(topReceived.id, topReceived.name, topReceived.role, 'received')}
                    className="text-2xl font-black text-stone-900 dark:text-stone-50 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-left focus:outline-hidden"
                  >
                    {topReceived.name}
                    <span className="text-xs font-normal text-stone-500 dark:text-stone-400 ml-1.5">
                      ({topReceived.role === 'student' ? '학생' : '선생님'})
                    </span>
                  </button>
                ) : (
                  <span className="text-lg font-medium text-stone-400">-</span>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs text-stone-500 dark:text-stone-400">가장 많이 칭찬받음</span>
                <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                  {topReceived ? `${topReceived.count}회 받음` : '0회'}
                </span>
              </div>
            </div>

            {/* 2등: 학생 칭찬왕 */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-transparent border border-indigo-300/35 dark:border-indigo-900/30 rounded-3xl p-6 flex flex-col justify-between group hover:scale-[1.01] transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-bl-full pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500 text-white shadow-xs">
                    🌟 칭찬 많이 한 학생 1등
                  </span>
                  <UserCheck className="w-6 h-6 text-indigo-500" />
                </div>
                {topStudentGiver ? (
                  <button
                    onClick={() => openDetailModal(topStudentGiver.id, topStudentGiver.name, topStudentGiver.role, 'given')}
                    className="text-2xl font-black text-stone-900 dark:text-stone-50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left focus:outline-hidden"
                  >
                    {topStudentGiver.name}
                    <span className="text-xs font-normal text-stone-500 dark:text-stone-400 ml-1.5">(학생)</span>
                  </button>
                ) : (
                  <span className="text-lg font-medium text-stone-400">-</span>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs text-stone-500 dark:text-stone-400">학생 중 가장 많이 칭찬함</span>
                <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                  {topStudentGiver ? `${topStudentGiver.count}회 함` : '0회'}
                </span>
              </div>
            </div>

            {/* 3등: 선생님 칭찬왕 */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-transparent border border-emerald-300/35 dark:border-emerald-900/30 rounded-3xl p-6 flex flex-col justify-between group hover:scale-[1.01] transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-xs">
                    👩‍🏫 칭찬 많이 한 선생님 1등
                  </span>
                  <GraduationCap className="w-6 h-6 text-emerald-500" />
                </div>
                {topTeacherGiver ? (
                  <button
                    onClick={() => openDetailModal(topTeacherGiver.id, topTeacherGiver.name, topTeacherGiver.role, 'given')}
                    className="text-2xl font-black text-stone-900 dark:text-stone-50 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left focus:outline-hidden"
                  >
                    {topTeacherGiver.name}
                    <span className="text-xs font-normal text-stone-500 dark:text-stone-400 ml-1.5">(선생님)</span>
                  </button>
                ) : (
                  <span className="text-lg font-medium text-stone-400">-</span>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs text-stone-500 dark:text-stone-400">선생님 중 가장 많이 칭찬함</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {topTeacherGiver ? `${topTeacherGiver.count}회 함` : '0회'}
                </span>
              </div>
            </div>
          </div>

          {/* Empty Data Banner */}
          {praises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-stone-900/40 rounded-3xl border border-stone-200/50 dark:border-stone-850/40 text-center p-6">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-full text-amber-500 mb-4 scale-110">
                <MessageSquareHeart className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                아직 이번 달 칭찬 데이터가 없습니다
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-xs">
                첫 번째 따뜻한 마음의 주인공이 되어 보세요! 우측 상단이나 하단 탭의 '데이터 입력' 페이지에서 칭찬을 등록할 수 있습니다.
              </p>
              <a
                href="/admin"
                className="mt-5 px-5 py-2.5 bg-stone-900 dark:bg-stone-100 hover:bg-stone-850 dark:hover:bg-stone-200 text-stone-50 dark:text-stone-900 text-sm font-semibold rounded-xl transition-all"
              >
                칭찬 작성하러 가기
              </a>
            </div>
          ) : (
            /* Ranking Table Section */
            <div className="bg-white dark:bg-stone-900/60 rounded-3xl border border-stone-250/20 dark:border-stone-850/40 shadow-xs overflow-hidden">
              {/* Tab Header */}
              <div className="flex border-b border-stone-200/60 dark:border-stone-800/60 p-2 gap-2 bg-stone-50/50 dark:bg-stone-950/10">
                <button
                  onClick={() => setRankingTab('received')}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all focus:outline-hidden ${
                    rankingTab === 'received'
                      ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-sm border border-stone-200/30'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/30 dark:hover:bg-stone-850/30'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  칭찬 많이 받은 순
                </button>
                <button
                  onClick={() => setRankingTab('given')}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all focus:outline-hidden ${
                    rankingTab === 'given'
                      ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-sm border border-stone-200/30'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/30 dark:hover:bg-stone-850/30'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  칭찬 많이 한 순
                </button>
              </div>

              {/* Table List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-100/50 dark:bg-stone-850/30 border-b border-stone-200/60 dark:border-stone-800/60">
                      <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider w-20 text-center">순위</th>
                      <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">이름</th>
                      <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider w-32 text-center">구분</th>
                      <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider w-40 text-right">칭찬 횟수</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/50 dark:divide-stone-800/50">
                    {(rankingTab === 'received' ? receivedRankings : [
                      ...studentGivenRankings,
                      ...teacherGivenRankings
                    ].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))).map((item, idx, arr) => {
                      // Custom ranking mapping (handling duplicates)
                      let rank = idx + 1;
                      if (idx > 0 && arr[idx - 1].count === item.count) {
                        // find matching rank
                        let firstMatch = arr.findIndex(x => x.count === item.count);
                        rank = firstMatch + 1;
                      }

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-stone-50/40 dark:hover:bg-stone-850/10 transition-colors"
                        >
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                rank === 1
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                                  : rank === 2
                                  ? 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-300'
                                  : rank === 3
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400'
                                  : 'text-stone-500 dark:text-stone-400'
                              }`}
                            >
                              {rank}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold">
                            <button
                              onClick={() => openDetailModal(item.id, item.name, item.role, rankingTab)}
                              className="text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-all text-left focus:outline-hidden"
                            >
                              {item.name}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                item.role === 'student'
                                  ? 'bg-indigo-55/10 text-indigo-700 dark:text-indigo-400'
                                  : 'bg-emerald-55/10 text-emerald-700 dark:text-emerald-400'
                              }`}
                            >
                              {item.role === 'student' ? '학생' : '선생님'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-stone-900 dark:text-stone-100">
                            {item.count}회
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Praise Detail Modal */}
      <PraiseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalData.mode}
        targetName={modalData.targetName}
        targetRole={modalData.targetRole}
        month={selectedMonth}
        items={modalData.items}
        count={modalData.count}
      />
    </div>
  );
}
