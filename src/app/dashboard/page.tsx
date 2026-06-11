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

export default function DashboardPage() {
  const { showToast } = useToast();
  
  // State variables
  const [users, setUsers] = useState<User[]>([]);
  const [praises, setPraises] = useState<Praise[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-06'); // Current local time is June 2026
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
              onClick={() => topReceived && openDetailModal(topReceived.id, topReceived.name, topReceived.role, 'received')}
              className={`relative overflow-hidden bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 rounded-3xl p-8 flex flex-col justify-between h-72 group ${
                topReceived ? 'cursor-pointer' : ''
              } hover:scale-[1.02] transition-all duration-300 shadow-sm`}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-stone-900 dark:text-stone-100 text-lg font-black tracking-tight">
                    칭찬왕
                  </span>
                </div>
                {topReceived ? (
                  <div className="space-y-1">
                    <h2 className="text-4xl md:text-5xl font-black text-stone-900 dark:text-stone-50 tracking-tight transition-colors">
                      {topReceived.name}
                    </h2>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-stone-400 dark:text-stone-600">-</span>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-stone-200 dark:border-stone-800 pt-4">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">횟수</span>
                <span className="text-2xl font-black text-stone-900 dark:text-stone-50">
                  {topReceived ? `${topReceived.count}회` : '0회'}
                </span>
              </div>
            </div>

            {/* 칭마에(학생) */}
            <div
              onClick={() => topStudentGiver && openDetailModal(topStudentGiver.id, topStudentGiver.name, topStudentGiver.role, 'given')}
              className={`relative overflow-hidden bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 rounded-3xl p-8 flex flex-col justify-between h-72 group ${
                topStudentGiver ? 'cursor-pointer' : ''
              } hover:scale-[1.02] transition-all duration-300 shadow-sm`}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-stone-900 dark:text-stone-100 text-lg font-black tracking-tight">
                    칭마에(학생)
                  </span>
                </div>
                {topStudentGiver ? (
                  <div className="space-y-1">
                    <h2 className="text-4xl md:text-5xl font-black text-stone-900 dark:text-stone-50 tracking-tight transition-colors">
                      {topStudentGiver.name}
                    </h2>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-stone-400 dark:text-stone-600">-</span>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-stone-200 dark:border-stone-800 pt-4">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">횟수</span>
                <span className="text-2xl font-black text-stone-900 dark:text-stone-50">
                  {topStudentGiver ? `${topStudentGiver.count}회` : '0회'}
                </span>
              </div>
            </div>

            {/* 칭마에(교사) */}
            <div
              onClick={() => topTeacherGiver && openDetailModal(topTeacherGiver.id, topTeacherGiver.name, topTeacherGiver.role, 'given')}
              className={`relative overflow-hidden bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 rounded-3xl p-8 flex flex-col justify-between h-72 group ${
                topTeacherGiver ? 'cursor-pointer' : ''
              } hover:scale-[1.02] transition-all duration-300 shadow-sm`}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-stone-900 dark:text-stone-100 text-lg font-black tracking-tight">
                    칭마에(교사)
                  </span>
                </div>
                {topTeacherGiver ? (
                  <div className="space-y-1">
                    <h2 className="text-4xl md:text-5xl font-black text-stone-900 dark:text-stone-50 tracking-tight transition-colors">
                      {topTeacherGiver.name}
                    </h2>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-stone-400 dark:text-stone-600">-</span>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-stone-200 dark:border-stone-800 pt-4">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">횟수</span>
                <span className="text-2xl font-black text-stone-900 dark:text-stone-50">
                  {topTeacherGiver ? `${topTeacherGiver.count}회` : '0회'}
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
