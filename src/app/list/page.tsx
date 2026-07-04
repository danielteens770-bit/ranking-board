'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Praise, UserRole } from '@/types';
import { useToast } from '@/context/ToastContext';
import {
  Search,
  Filter,
  Users,
  Trophy,
  Award,
  Trash,
  UserPlus,
  BarChart3,
  List,
  GraduationCap,
  Users2,
  Trash2,
  Calendar,
} from 'lucide-react';

export default function PraiseListPage() {
  const { showToast } = useToast();

  // Active Tab: 'list' | 'stats' | 'users'
  const [activeTab, setActiveTab] = useState<'list' | 'stats' | 'users'>('list');

  // Database states
  const [users, setUsers] = useState<User[]>([]);
  const [praises, setPraises] = useState<Praise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters for Praise List
  const [filterReceiverId, setFilterReceiverId] = useState<string>('');
  const [filterGiverId, setFilterGiverId] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // User Register Form states
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('student');
  const [registeringUser, setRegisteringUser] = useState<boolean>(false);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch all praises
      const { data: praisesData, error: praisesError } = await supabase
        .from('praises')
        .select('*')
        .order('created_at', { ascending: false });

      if (praisesError) throw praisesError;
      setPraises(praisesData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err.message);
      showToast('데이터를 불러오는 데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();

    // Subscribe to praises & users real-time updates
    const praisesSub = supabase
      .channel('list-praises-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'praises' }, () => fetchData())
      .subscribe();

    const usersSub = supabase
      .channel('list-users-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(praisesSub);
      supabase.removeChannel(usersSub);
    };
  }, [fetchData]);

  // Register user
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      showToast('이름을 입력해 주세요.', 'error');
      return;
    }

    const isDuplicate = users.some(
      (u) => u.name.toLowerCase() === newUserName.trim().toLowerCase() && u.role === newUserRole
    );
    if (isDuplicate) {
      showToast('이미 등록된 동일한 이름과 역할의 사용자가 존재합니다.', 'error');
      return;
    }

    setRegisteringUser(true);
    try {
      const { error } = await supabase
        .from('users')
        .insert([{ name: newUserName.trim(), role: newUserRole }]);

      if (error) throw error;

      showToast(`${newUserName}님이 등록되었습니다.`, 'success');
      setNewUserName('');
    } catch (err: any) {
      console.error('Error registering user:', err.message);
      showToast('사용자 등록에 실패했습니다.', 'error');
    } finally {
      setRegisteringUser(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`${userName}님을 삭제하시겠습니까?\n삭제 시 해당 사용자의 모든 칭찬 데이터가 함께 삭제됩니다.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
      showToast(`${userName}님이 삭제되었습니다.`, 'success');
    } catch (err: any) {
      console.error('Error deleting user:', err.message);
      showToast('사용자 삭제에 실패했습니다.', 'error');
    }
  };

  // 1-Year Aggregated Statistics (Last 12 Months)
  // Current month context is '2026-06'
  const stats1Year = useMemo(() => {
    const limitDate = new Date('2026-06-01');
    limitDate.setFullYear(limitDate.getFullYear() - 1); // 1 year ago: 2025-06-01

    // Filter praises in the last 12 months
    const filtered1YearPraises = praises.filter((p) => {
      const pDate = new Date(`${p.month}-01`);
      return pDate >= limitDate;
    });

    const userStats = users.map((user) => {
      const received = filtered1YearPraises.filter((p) => p.receiver_id === user.id).length;
      const given = filtered1YearPraises.filter((p) => p.giver_id === user.id).length;
      return {
        id: user.id,
        name: user.name,
        role: user.role,
        received,
        given,
        total: received + given,
      };
    });

    const totalPraises = filtered1YearPraises.length;

    // Leaderboards
    const sortedByReceived = [...userStats].sort((a, b) => b.received - a.received || a.name.localeCompare(b.name));
    const sortedByGiven = [...userStats].sort((a, b) => b.given - a.given || a.name.localeCompare(b.name));

    return {
      totalPraises,
      leaderboard: userStats.sort((a, b) => b.received - a.received || b.given - a.given || a.name.localeCompare(b.name)),
      topReceiver: sortedByReceived[0]?.received > 0 ? sortedByReceived[0] : null,
      topGiver: sortedByGiven[0]?.given > 0 ? sortedByGiven[0] : null,
    };
  }, [praises, users]);

  // Filtered Praises for the list tab
  const filteredPraisesList = useMemo(() => {
    return praises.filter((p) => {
      const matchReceiver = filterReceiverId ? p.receiver_id === filterReceiverId : true;
      const matchGiver = filterGiverId ? p.giver_id === filterGiverId : true;

      const receiverObj = users.find((u) => u.id === p.receiver_id);
      const giverObj = users.find((u) => u.id === p.giver_id);
      const keyword = searchKeyword.toLowerCase().trim();
      const matchKeyword = keyword
        ? p.message.toLowerCase().includes(keyword) ||
        (receiverObj && receiverObj.name.toLowerCase().includes(keyword)) ||
        (giverObj && giverObj.name.toLowerCase().includes(keyword))
        : true;

      return matchReceiver && matchGiver && matchKeyword;
    });
  }, [praises, filterReceiverId, filterGiverId, searchKeyword, users]);

  // Get user name helper
  const getUserLabel = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? `${user.name} (${user.role === 'student' ? '학생' : '선생님'})` : '알 수 없음';
  };

  const getFullMonthName = (monthStr: string) => {
    const [year, m] = monthStr.split('-');
    return `${year}년 ${parseInt(m, 10)}월`;
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="bg-gradient-to-br from-stone-100/90 to-stone-50/50 dark:from-stone-850/60 dark:to-stone-900/40 p-6 rounded-3xl border border-stone-250/60 dark:border-stone-800/60 shadow-xs">
        <h1 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-50 tracking-tight">
          칭찬 데이터 상세 및 관리
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
          지금까지 기록된 모든 칭찬 내역을 조회하고 1년간의 누적 통계를 확인할 수 있습니다.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 p-1 bg-stone-100 dark:bg-stone-900 rounded-2xl w-full sm:w-fit gap-1">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'list'
              ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/40'
            }`}
        >
          <List className="w-4 h-4" />
          칭찬 전체 리스트
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'stats'
              ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/40'
            }`}
        >
          <BarChart3 className="w-4 h-4" />
          1년 누적 통계
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'users'
              ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/40'
            }`}
        >
          <Users className="w-4 h-4" />
          사용자 관리
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <span className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-stone-500 dark:text-stone-400">데이터를 불러오는 중입니다...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: PRAISE LIST VIEW */}
          {activeTab === 'list' && (
            <div className="space-y-6">
              {/* Filters Block */}
              <div className="bg-white dark:bg-stone-900/60 rounded-3xl border border-stone-250/20 dark:border-stone-850/40 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold border-b border-stone-100 dark:border-stone-800/60 pb-3">
                  <Filter className="w-4 h-4 text-amber-500" />
                  검색 필터
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Filter Receiver (칭찬왕) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-stone-500 dark:text-stone-400">칭찬왕 (받은 사람)</label>
                    <select
                      value={filterReceiverId}
                      onChange={(e) => setFilterReceiverId(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-stone-900 dark:text-stone-100"
                    >
                      <option value="">-- 전체 --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === 'student' ? '학생' : '선생님'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Giver (칭마에) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-stone-500 dark:text-stone-400">칭마에 (보낸 사람)</label>
                    <select
                      value={filterGiverId}
                      onChange={(e) => setFilterGiverId(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-stone-900 dark:text-stone-100"
                    >
                      <option value="">-- 전체 --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === 'student' ? '학생' : '선생님'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search Text */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-stone-500 dark:text-stone-400">내용 검색</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="이름이나 칭찬 내용 입력"
                        className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-stone-900 dark:text-stone-100"
                      />
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                {/* Reset Filters */}
                {(filterReceiverId || filterGiverId || searchKeyword) && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setFilterReceiverId('');
                        setFilterGiverId('');
                        setSearchKeyword('');
                      }}
                      className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
                    >
                      필터 초기화
                    </button>
                  </div>
                )}
              </div>

              {/* Praise List Table */}
              <div className="bg-white dark:bg-stone-900/60 rounded-3xl border border-stone-250/20 dark:border-stone-850/40 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800/60 flex justify-between items-center bg-stone-50/20 dark:bg-transparent">
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    조회 결과 <span className="text-amber-600 dark:text-amber-400">{filteredPraisesList.length}건</span>
                  </span>
                </div>

                {filteredPraisesList.length === 0 ? (
                  <div className="py-16 text-center text-stone-400 dark:text-stone-500 text-sm">
                    조건에 일치하는 칭찬 데이터가 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm min-w-[700px]">
                      <thead>
                        <tr className="bg-stone-50 dark:bg-stone-850/50 border-b border-stone-200/50 dark:border-stone-800/60 text-xs font-bold text-stone-500">
                          <th className="px-6 py-3.5 w-32">기준 연월</th>
                          <th className="px-6 py-3.5 w-44">칭찬왕 (받는 사람)</th>
                          <th className="px-6 py-3.5 w-44">칭마에 (보낸 사람)</th>
                          <th className="px-6 py-3.5">칭찬 내용</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200/50 dark:divide-stone-800/50">
                        {filteredPraisesList.map((p) => {
                          const receiverObj = users.find((u) => u.id === p.receiver_id);
                          const giverObj = users.find((u) => u.id === p.giver_id);
                          return (
                            <tr key={p.id} className="hover:bg-stone-50/30 dark:hover:bg-stone-850/10 transition-colors">
                              <td className="px-6 py-4 text-xs font-medium text-stone-500 dark:text-stone-400">
                                {getFullMonthName(p.month)}
                              </td>
                              <td className="px-6 py-4 font-semibold text-stone-900 dark:text-stone-100">
                                {receiverObj ? receiverObj.name : '알 수 없음'}
                                <span className="text-2xs font-normal text-stone-400 dark:text-stone-500 ml-1">
                                  ({receiverObj?.role === 'student' ? '학생' : '교사'})
                                </span>
                              </td>
                              <td className="px-6 py-4 text-stone-700 dark:text-stone-300">
                                {giverObj ? giverObj.name : '알 수 없음'}
                                <span className="text-2xs font-normal text-stone-400 dark:text-stone-500 ml-1">
                                  ({giverObj?.role === 'student' ? '학생' : '교사'})
                                </span>
                              </td>
                              <td className="px-6 py-4 text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
                                "{p.message}"
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: 1-YEAR CUMULATIVE STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cumulative praises */}
                <div className="bg-white dark:bg-stone-900/60 p-6 rounded-3xl border border-stone-250/20 dark:border-stone-850/40 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400">1년 누적 칭찬 등록</span>
                    <span className="text-3xl font-black text-stone-900 dark:text-stone-50 block">
                      {stats1Year.totalPraises}건
                    </span>
                  </div>
                  <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>

                {/* Top cumulative receiver */}
                <div className="bg-white dark:bg-stone-900/60 p-6 rounded-3xl border border-stone-250/20 dark:border-stone-850/40 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400">1년 최다 칭찬왕</span>
                    <span className="text-2xl font-black text-stone-900 dark:text-stone-50 block truncate max-w-[180px]">
                      {stats1Year.topReceiver ? `${stats1Year.topReceiver.name}` : '-'}
                      {stats1Year.topReceiver && (
                        <span className="text-xs font-medium text-stone-500 ml-1.5">
                          ({stats1Year.topReceiver.received}회)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl">
                    <Trophy className="w-6 h-6" />
                  </div>
                </div>

                {/* Top cumulative giver */}
                <div className="bg-white dark:bg-stone-900/60 p-6 rounded-3xl border border-stone-250/20 dark:border-stone-850/40 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400">1년 최다 칭마에</span>
                    <span className="text-2xl font-black text-stone-900 dark:text-stone-50 block truncate max-w-[180px]">
                      {stats1Year.topGiver ? `${stats1Year.topGiver.name}` : '-'}
                      {stats1Year.topGiver && (
                        <span className="text-xs font-medium text-stone-500 ml-1.5">
                          ({stats1Year.topGiver.given}회)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                    <Award className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* 1-Year Cumulative Stats Leaderboard */}
              <div className="bg-white dark:bg-stone-900/60 rounded-3xl border border-stone-250/20 dark:border-stone-850/40 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800/60 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">1년 누적 종합 랭킹 (2025년 6월 ~ 2026년 6월)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-stone-100/50 dark:bg-stone-850/30 border-b border-stone-200/60 dark:border-stone-800/60">
                        <th className="px-6 py-4 text-xs font-semibold text-stone-500 w-20 text-center">순위</th>
                        <th className="px-6 py-4 text-xs font-semibold text-stone-500">이름</th>
                        <th className="px-6 py-4 text-xs font-semibold text-stone-500 w-32 text-center">구분</th>
                        <th className="px-6 py-4 text-xs font-semibold text-stone-500 text-center">받은 칭찬 수</th>
                        <th className="px-6 py-4 text-xs font-semibold text-stone-500 text-center">보낸 칭찬 수 (칭마에)</th>
                        <th className="px-6 py-4 text-xs font-semibold text-stone-500 text-right w-36">종합 점수</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/50 dark:divide-stone-800/50">
                      {stats1Year.leaderboard.map((item, idx, arr) => {
                        let rank = idx + 1;
                        if (idx > 0 && arr[idx - 1].received === item.received && arr[idx - 1].given === item.given) {
                          let firstMatch = arr.findIndex(x => x.received === item.received && x.given === item.given);
                          rank = firstMatch + 1;
                        }

                        return (
                          <tr key={item.id} className="hover:bg-stone-50/40 dark:hover:bg-stone-850/10 transition-colors">
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${rank === 1
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
                            <td className="px-6 py-4 font-semibold text-stone-900 dark:text-stone-100">
                              {item.name}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.role === 'student'
                                    ? 'bg-indigo-55/10 text-indigo-700 dark:text-indigo-400'
                                    : 'bg-emerald-55/10 text-emerald-700 dark:text-emerald-400'
                                  }`}
                              >
                                {item.role === 'student' ? '학생' : '선생님'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center text-stone-800 dark:text-stone-200">
                              {item.received}회
                            </td>
                            <td className="px-6 py-4 text-center text-stone-850 dark:text-stone-250">
                              {item.given}회
                            </td>
                            <td className="px-6 py-4 text-right font-black text-stone-900 dark:text-stone-50">
                              {item.total}점
                            </td>
                          </tr>
                        );
                      })}
                      {stats1Year.leaderboard.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-stone-400">
                            1년간의 칭찬 집계 데이터가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Add User form */}
              <div className="lg:col-span-5 bg-white dark:bg-stone-900/60 rounded-3xl border border-stone-250/20 dark:border-stone-850/40 p-6 shadow-xs h-fit">
                <div className="flex items-center gap-2 mb-4 border-b border-stone-200/50 dark:border-stone-850/40 pb-3">
                  <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50">사용자 등록</h2>
                </div>

                <form onSubmit={handleRegisterUser} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-stone-500 dark:text-stone-400">구분 선택</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewUserRole('student')}
                        className={`py-3 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer ${newUserRole === 'student'
                            ? 'bg-indigo-55/10 border-indigo-350 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-indigo-400'
                            : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-850/40'
                          }`}
                      >
                        <Users2 className="w-4 h-4" />
                        학생
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewUserRole('teacher')}
                        className={`py-3 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer ${newUserRole === 'teacher'
                            ? 'bg-emerald-55/10 border-emerald-350 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400'
                            : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-850/40'
                          }`}
                      >
                        <GraduationCap className="w-4 h-4" />
                        선생님
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="user-name" className="text-xs font-bold text-stone-500 dark:text-stone-400">이름</label>
                    <input
                      id="user-name"
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="등록할 이름을 입력하세요 (예: 홍길동)"
                      className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={registeringUser}
                    className="w-full py-3 bg-stone-900 hover:bg-stone-850 dark:bg-stone-50 dark:hover:bg-stone-200 text-stone-50 dark:text-stone-900 font-bold rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {registeringUser ? (
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    등록하기
                  </button>
                </form>
              </div>

              {/* Registered Users List */}
              <div className="lg:col-span-7 bg-white dark:bg-stone-900/60 rounded-3xl border border-stone-250/20 dark:border-stone-850/40 p-6 shadow-xs flex flex-col max-h-[500px]">
                <div className="flex items-center justify-between mb-4 border-b border-stone-200/50 dark:border-stone-850/40 pb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                      <Users className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50">등록된 사용자 목록</h2>
                  </div>
                  <span className="text-xs text-stone-400 font-medium">총 {users.length}명</span>
                </div>

                <div className="flex-1 overflow-y-auto border border-stone-200/60 dark:border-stone-800/60 rounded-2xl">
                  {users.length === 0 ? (
                    <div className="p-12 text-center text-stone-400 text-sm">
                      등록된 사용자가 없습니다. 이름을 먼저 등록해 주세요.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200/60 dark:bg-stone-850/50 dark:border-stone-800/65 text-xs font-bold text-stone-500">
                          <th className="px-4 py-3">이름</th>
                          <th className="px-4 py-3 w-28 text-center">구분</th>
                          <th className="px-4 py-3 w-16 text-center">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200/50 dark:divide-stone-800/50">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-stone-50/40 dark:hover:bg-stone-850/20">
                            <td className="px-4 py-2.5 font-semibold text-stone-900 dark:text-stone-100">{u.name}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-2xs font-semibold ${u.role === 'student'
                                    ? 'bg-indigo-55/10 text-indigo-700 dark:text-indigo-400'
                                    : 'bg-emerald-55/10 text-emerald-700 dark:text-emerald-400'
                                  }`}
                              >
                                {u.role === 'student' ? '학생' : '선생님'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-1 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                                aria-label={`${u.name} 사용자 삭제`}
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
