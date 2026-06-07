'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User, UserRole } from '@/types';
import { useToast } from '@/context/ToastContext';
import {
  Plus,
  Trash2,
  Save,
  UserPlus,
  Users,
  GraduationCap,
  Users2,
  Trash,
  HelpCircle,
} from 'lucide-react';

interface PraiseInputRow {
  id: string;
  giverRole: UserRole;
  giverId: string;
  receiverId: string;
  message: string;
}

export default function AdminPage() {
  const { showToast } = useToast();

  // Database states
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);

  // Form states (Praise Input)
  const [rows, setRows] = useState<PraiseInputRow[]>([
    { id: Math.random().toString(36).substring(2, 9), giverRole: 'student', giverId: '', receiverId: '', message: '' },
  ]);
  const [savingPraises, setSavingPraises] = useState<boolean>(false);

  // Form states (New User)
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('student');
  const [registeringUser, setRegisteringUser] = useState<boolean>(false);

  const currentMonth = '2026-06'; // System static context

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err.message);
      showToast('사용자 목록을 불러오는 데 실패했습니다.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();

    // Real-time subscribe to users table to sync dropdowns
    const usersSub = supabase
      .channel('admin-users-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usersSub);
    };
  }, [fetchUsers]);

  // Handle row changes
  const updateRow = (id: string, field: keyof PraiseInputRow, value: any) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          // If giverRole changes, reset the giverId since it might belong to another role
          if (field === 'giverRole') {
            updated.giverId = '';
          }
          // Self-praise check: if giverId becomes same as receiverId, reset receiverId
          if (field === 'giverId' && value === row.receiverId) {
            updated.receiverId = '';
            showToast('자기 자신은 칭찬할 수 없습니다.', 'error');
          }
          if (field === 'receiverId' && value === row.giverId) {
            updated.receiverId = '';
            showToast('자기 자신은 칭찬할 수 없습니다.', 'error');
          }
          return updated;
        }
        return row;
      })
    );
  };

  // Add new row
  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        giverRole: 'student',
        giverId: '',
        receiverId: '',
        message: '',
      },
    ]);
  };

  // Delete row
  const deleteRow = (id: string) => {
    if (rows.length === 1) {
      showToast('최소 한 개의 입력 행이 필요합니다.', 'error');
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  // Save all praises
  const saveAllPraises = async () => {
    // Validation
    const invalidRows = rows.filter(
      (row) => !row.giverId || !row.receiverId || !row.message.trim()
    );

    if (invalidRows.length > 0) {
      showToast('모든 필드(이름, 대상자, 칭찬 내용)를 입력해 주세요.', 'error');
      return;
    }

    setSavingPraises(true);
    try {
      const payload = rows.map((row) => ({
        giver_id: row.giverId,
        giver_role: row.giverRole,
        receiver_id: row.receiverId,
        message: row.message.trim(),
        month: currentMonth,
      }));

      const { error } = await supabase.from('praises').insert(payload);

      if (error) throw error;

      showToast('칭찬 내역이 성공적으로 저장되었습니다!', 'success');
      // Reset rows to single empty row
      setRows([
        {
          id: Math.random().toString(36).substring(2, 9),
          giverRole: 'student',
          giverId: '',
          receiverId: '',
          message: '',
        },
      ]);
    } catch (err: any) {
      console.error('Error inserting praises:', err.message);
      showToast('저장 중 오류가 발생했습니다: ' + err.message, 'error');
    } finally {
      setSavingPraises(false);
    }
  };

  // Register user
  const registerUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      showToast('이름을 입력해 주세요.', 'error');
      return;
    }

    // Check duplicate name
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

      showToast(`${newUserName}님이 성공적으로 등록되었습니다.`, 'success');
      setNewUserName('');
    } catch (err: any) {
      console.error('Error registering user:', err.message);
      showToast('사용자 등록에 실패했습니다.', 'error');
    } finally {
      setRegisteringUser(false);
    }
  };

  // Delete user
  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`${userName}님을 삭제하시겠습니까?\n삭제 시 해당 사용자의 모든 칭찬 내역도 함께 삭제됩니다.`)) {
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

  const getFilteredGivers = (role: UserRole) => {
    return users.filter((u) => u.role === role);
  };

  const getFilteredReceivers = (giverId: string) => {
    return users.filter((u) => u.id !== giverId);
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Page Header */}
      <div className="bg-white dark:bg-stone-900/60 p-6 rounded-3xl border border-stone-250/20 dark:border-stone-850/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-50 tracking-tight">
            데이터 관리자 패널
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            칭찬 데이터를 대량 등록하고, 학교 구성원(학생/선생님) 명단을 관리할 수 있습니다.
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 px-4 py-2.5 rounded-2xl self-start md:self-center">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            적용 대상 월: {currentMonth.split('-')[0]}년 {parseInt(currentMonth.split('-')[1], 10)}월
          </span>
        </div>
      </div>

      {/* PRAISE INPUT SECTION */}
      <div className="bg-white dark:bg-stone-900/60 rounded-3xl border border-stone-250/20 dark:border-stone-850/40 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500 text-white rounded-lg">
              <Save className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50">
              칭찬 내역 일괄 입력
            </h2>
          </div>
          <span className="text-xs text-stone-400">여러 행을 한 번에 추가해 저장할 수 있습니다.</span>
        </div>

        {/* Dual Layout: Table on PC/Tablet, Cards on Mobile */}
        <div className="p-6 space-y-6">
          {loadingUsers ? (
            <div className="py-8 text-center text-stone-500 skeleton rounded-2xl h-40" />
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-stone-500">
              선택할 수 있는 사용자가 없습니다. 하단에서 먼저 사용자를 등록해 주세요!
            </div>
          ) : (
            <>
              {/* 1. Desktop & Tablet View (>= 768px) */}
              <div className="hidden md:block overflow-x-auto border border-stone-200/50 dark:border-stone-850/50 rounded-2xl">
                <table className="w-full border-collapse text-left min-w-[700px]">
                  <thead>
                    <tr className="bg-stone-100/60 dark:bg-stone-850/40 border-b border-stone-200/50 dark:border-stone-800/50 text-xs font-bold text-stone-550 dark:text-stone-350">
                      <th className="px-4 py-3.5 w-32">칭찬 주체 (구분)</th>
                      <th className="px-4 py-3.5 w-48">이름</th>
                      <th className="px-4 py-3.5 w-48">칭찬 대상자</th>
                      <th className="px-4 py-3.5">칭찬 내용</th>
                      <th className="px-4 py-3.5 w-16 text-center">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-250/20 dark:divide-stone-800/50 bg-white/30 dark:bg-transparent">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-stone-50/30 dark:hover:bg-stone-850/10">
                        {/* Giver Role */}
                        <td className="px-4 py-3">
                          <select
                            value={row.giverRole}
                            onChange={(e) => updateRow(row.id, 'giverRole', e.target.value as UserRole)}
                            className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 font-semibold"
                            aria-label="칭찬 주체 구분"
                          >
                            <option value="student">학생</option>
                            <option value="teacher">선생님</option>
                          </select>
                        </td>

                        {/* Giver Name Dropdown */}
                        <td className="px-4 py-3">
                          <select
                            value={row.giverId}
                            onChange={(e) => updateRow(row.id, 'giverId', e.target.value)}
                            className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                            aria-label="칭찬하는 사람 선택"
                          >
                            <option value="">-- 선택 --</option>
                            {getFilteredGivers(row.giverRole).map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Receiver Name Dropdown */}
                        <td className="px-4 py-3">
                          <select
                            value={row.receiverId}
                            disabled={!row.giverId}
                            onChange={(e) => updateRow(row.id, 'receiverId', e.target.value)}
                            className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-850 disabled:opacity-50 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                            aria-label="칭찬받는 사람 선택"
                          >
                            <option value="">-- 선택 --</option>
                            {getFilteredReceivers(row.giverId).map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.role === 'student' ? '학생' : '선생님'})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Message Content */}
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row.message}
                            onChange={(e) => updateRow(row.id, 'message', e.target.value)}
                            placeholder="예: 항상 밝은 모습으로 인사를 잘해요."
                            className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                            aria-label="칭찬 내용 입력"
                          />
                        </td>

                        {/* Action Delete */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => deleteRow(row.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors"
                            aria-label="행 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 2. Mobile View (< 768px Cards) */}
              <div className="md:hidden space-y-4">
                {rows.map((row, index) => (
                  <div
                    key={row.id}
                    className="p-5 bg-stone-50 dark:bg-stone-850/40 border border-stone-200/60 dark:border-stone-800/60 rounded-2xl relative space-y-4 shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b border-stone-200/50 dark:border-stone-850/50 pb-2">
                      <span className="text-xs font-extrabold text-stone-400">
                        칭찬 행 #{index + 1}
                      </span>
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors absolute top-2 right-2"
                        aria-label="행 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Giver Role Selection */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-stone-500">구분</label>
                        <select
                          value={row.giverRole}
                          onChange={(e) => updateRow(row.id, 'giverRole', e.target.value as UserRole)}
                          className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm"
                        >
                          <option value="student">학생</option>
                          <option value="teacher">선생님</option>
                        </select>
                      </div>

                      {/* Giver Selection */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-stone-500">이름</label>
                        <select
                          value={row.giverId}
                          onChange={(e) => updateRow(row.id, 'giverId', e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm"
                        >
                          <option value="">-- 선택 --</option>
                          {getFilteredGivers(row.giverRole).map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Receiver Selection */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-stone-500">칭찬 대상자</label>
                      <select
                        value={row.receiverId}
                        disabled={!row.giverId}
                        onChange={(e) => updateRow(row.id, 'receiverId', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-stone-900 disabled:opacity-50 border border-stone-200 dark:border-stone-800 rounded-xl text-sm"
                      >
                        <option value="">-- 선택 --</option>
                        {getFilteredReceivers(row.giverId).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role === 'student' ? '학생' : '선생님'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Message Content */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-stone-500">칭찬 내용</label>
                      <textarea
                        value={row.message}
                        onChange={(e) => updateRow(row.id, 'message', e.target.value)}
                        placeholder="칭찬 메시지를 상세히 적어주세요."
                        rows={2}
                        className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm resize-none focus:outline-hidden"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-4 border-t border-stone-200/50 dark:border-stone-800/50">
                <button
                  onClick={addRow}
                  className="w-full sm:w-auto px-5 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 focus:outline-hidden"
                >
                  <Plus className="w-4 h-4" />
                  행 추가
                </button>

                <button
                  onClick={saveAllPraises}
                  disabled={savingPraises || users.length === 0}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5 focus:outline-hidden active:scale-98"
                >
                  {savingPraises ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  전체 저장
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <hr className="border-stone-200 dark:border-stone-800" />

      {/* USER MANAGEMENT SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* User Register Form */}
        <div className="lg:col-span-5 bg-white dark:bg-stone-900/60 rounded-3xl border border-stone-250/20 dark:border-stone-850/40 p-6 shadow-xs h-fit">
          <div className="flex items-center gap-2 mb-4 border-b border-stone-200/50 dark:border-stone-850/40 pb-3">
            <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
              <UserPlus className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50">사용자 등록</h2>
          </div>

          <form onSubmit={registerUser} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-500 dark:text-stone-400">구분 선택</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewUserRole('student')}
                  className={`py-3 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2 transition-all ${
                    newUserRole === 'student'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-indigo-400'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-850/40'
                  }`}
                >
                  <Users2 className="w-4 h-4" />
                  학생
                </button>
                <button
                  type="button"
                  onClick={() => setNewUserRole('teacher')}
                  className={`py-3 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2 transition-all ${
                    newUserRole === 'teacher'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400'
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
                className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            <button
              type="submit"
              disabled={registeringUser}
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 dark:bg-stone-50 dark:hover:bg-stone-200 text-stone-50 dark:text-stone-900 font-bold rounded-2xl text-sm transition-colors flex items-center justify-center gap-2"
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

        {/* User List Table */}
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
            {loadingUsers ? (
              <div className="p-6 skeleton h-full rounded-2xl" />
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-stone-400 text-sm">
                등록된 사용자가 없습니다. 이름을 먼저 등록해 주세요.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-55 border-b border-stone-200/60 dark:bg-stone-850/50 dark:border-stone-800/65 text-xs font-bold text-stone-500">
                    <th className="px-4 py-3">이름</th>
                    <th className="px-4 py-3 w-28 text-center">구분</th>
                    <th className="px-4 py-3 w-16 text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/50 dark:divide-stone-800/50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-stone-50/40 dark:hover:bg-stone-855/20 text-sm">
                      <td className="px-4 py-2.5 font-semibold text-stone-900 dark:text-stone-100">{u.name}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-2xs font-semibold ${
                            u.role === 'student'
                              ? 'bg-indigo-55/10 text-indigo-700 dark:text-indigo-400'
                              : 'bg-emerald-55/10 text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {u.role === 'student' ? '학생' : '선생님'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => deleteUser(u.id, u.name)}
                          className="p-1 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          aria-label={`${u.name} 사용자 삭제`}
                        >
                          <Trash className="w-4 h-4" />
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
    </div>
  );
}
