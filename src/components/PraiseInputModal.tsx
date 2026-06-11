'use client';

import React, { useState, useEffect } from 'react';
import { X, Award, CheckCircle2, AlertCircle, Save, Loader2 } from 'lucide-react';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

interface PraiseInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentMonth: string;
}

export const PraiseInputModal: React.FC<PraiseInputModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentMonth,
}) => {
  const { showToast } = useToast();

  // Modal display states: 'input' | 'saving' | 'success' | 'error'
  const [status, setStatus] = useState<'input' | 'saving' | 'success' | 'error'>('input');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Form states — all plain text inputs now
  const [receiverName, setReceiverName] = useState<string>('');
  const [giverRole, setGiverRole] = useState<UserRole>('student');
  const [giverName, setGiverName] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStatus('input');
      setReceiverName('');
      setGiverRole('student');
      setGiverName('');
      setMessage('');
      setErrorMessage('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Form submit handler — look up users by name then insert
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receiverName.trim()) {
      showToast('칭찬받을 사람(칭찬왕) 이름을 입력해 주세요.', 'error');
      return;
    }
    if (!giverName.trim()) {
      showToast('칭찬하는 사람(칭마에) 이름을 입력해 주세요.', 'error');
      return;
    }
    if (receiverName.trim().toLowerCase() === giverName.trim().toLowerCase()) {
      showToast('자기 자신은 칭찬할 수 없습니다.', 'error');
      return;
    }
    if (!message.trim()) {
      showToast('칭찬 내용을 입력해 주세요.', 'error');
      return;
    }

    setStatus('saving');

    try {
      // Find or create receiver
      const { data: receiverRows, error: recErr } = await supabase
        .from('users')
        .select('id')
        .ilike('name', receiverName.trim())
        .limit(1);

      if (recErr) throw recErr;

      let receiverId: string;
      if (receiverRows && receiverRows.length > 0) {
        receiverId = receiverRows[0].id;
      } else {
        // Auto-create receiver (default role: student)
        const { data: newRec, error: newRecErr } = await supabase
          .from('users')
          .insert([{ name: receiverName.trim(), role: 'student' }])
          .select('id')
          .single();
        if (newRecErr) throw newRecErr;
        receiverId = newRec.id;
      }

      // Find or create giver
      const { data: giverRows, error: givErr } = await supabase
        .from('users')
        .select('id')
        .ilike('name', giverName.trim())
        .eq('role', giverRole)
        .limit(1);

      if (givErr) throw givErr;

      let giverId: string;
      if (giverRows && giverRows.length > 0) {
        giverId = giverRows[0].id;
      } else {
        // Auto-create giver with selected role
        const { data: newGiv, error: newGivErr } = await supabase
          .from('users')
          .insert([{ name: giverName.trim(), role: giverRole }])
          .select('id')
          .single();
        if (newGivErr) throw newGivErr;
        giverId = newGiv.id;
      }

      if (receiverId === giverId) {
        showToast('자기 자신은 칭찬할 수 없습니다.', 'error');
        setStatus('input');
        return;
      }

      // Insert praise record
      const { error: insertErr } = await supabase.from('praises').insert([
        {
          giver_id: giverId,
          giver_role: giverRole,
          receiver_id: receiverId,
          message: message.trim(),
          month: currentMonth,
        },
      ]);

      if (insertErr) throw insertErr;

      setStatus('success');
      onSuccess(); // Refresh dashboard data
    } catch (err: any) {
      console.error('Error saving praise:', err.message);
      setErrorMessage(err.message || '저장 중 알 수 없는 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  // Reset form for another entry
  const handleResetForNext = () => {
    setStatus('input');
    setReceiverName('');
    setGiverName('');
    setMessage('');
  };

  const formattedMonth = `${currentMonth.split('-')[0]}년 ${parseInt(currentMonth.split('-')[1], 10)}월`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 md:items-center md:p-4 transition-opacity duration-300">
      {/* Backdrop click to close (only if not saving) */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => status !== 'saving' && onClose()}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-h-[90vh] md:max-h-[85vh] bg-stone-50 dark:bg-stone-900 rounded-t-[2.5rem] md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up md:animate-fade-in md:max-w-xl border border-stone-200/50 dark:border-stone-800/50 transform transition-all duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Drag Handle */}
        <div className="flex justify-center py-3 md:hidden">
          <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full" />
        </div>

        {/* Header (hidden in success/error screens) */}
        {status !== 'success' && status !== 'error' && (
          <div className="px-6 pb-4 pt-2 md:py-5 border-b border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-stone-950 dark:text-stone-50">칭찬 등록하기</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {formattedMonth} 기준 칭찬 데이터를 입력합니다.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={status === 'saving'}
              className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-850 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors disabled:opacity-30"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {status === 'input' && (
            <form onSubmit={handleSave} className="space-y-5">

              {/* Field 1: 칭찬 받는 사람 */}
              <div className="space-y-2">
                <label htmlFor="receiver-name" className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  칭찬 받는 사람 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="receiver-name"
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="예: 홍길동"
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-500/20 transition-all text-stone-900 dark:text-stone-100 placeholder-stone-350 dark:placeholder-stone-600"
                />
              </div>

              {/* Field 2: 보낸 사람 구분 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  보낸 사람 구분 <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGiverRole('student')}
                    className={`py-3 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2 transition-all ${
                      giverRole === 'student'
                        ? 'bg-stone-950 border-stone-950 text-white dark:bg-stone-100 dark:border-stone-100 dark:text-stone-950'
                        : 'bg-white dark:bg-stone-850 border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/40'
                    }`}
                  >
                    학생
                  </button>
                  <button
                    type="button"
                    onClick={() => setGiverRole('teacher')}
                    className={`py-3 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2 transition-all ${
                      giverRole === 'teacher'
                        ? 'bg-stone-950 border-stone-950 text-white dark:bg-stone-100 dark:border-stone-100 dark:text-stone-950'
                        : 'bg-white dark:bg-stone-850 border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/40'
                    }`}
                  >
                    선생님
                  </button>
                </div>
              </div>

              {/* Field 3: 칭찬 보낸 사람 */}
              <div className="space-y-2">
                <label htmlFor="giver-name" className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  칭찬 보낸 사람 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="giver-name"
                  type="text"
                  value={giverName}
                  onChange={(e) => setGiverName(e.target.value)}
                  placeholder="예: 김철수"
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-500/20 transition-all text-stone-900 dark:text-stone-100 placeholder-stone-350 dark:placeholder-stone-600"
                />
              </div>

              {/* Field 4: 칭찬 내용 */}
              <div className="space-y-2">
                <label htmlFor="praise-message" className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  칭찬 내용 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="praise-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="따뜻한 칭찬의 한 마디를 작성해 주세요."
                  rows={4}
                  className="w-full px-4 py-3 bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-500/20 transition-all text-stone-900 dark:text-stone-100 resize-none leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-stone-200/60 dark:border-stone-800/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 font-bold rounded-2xl text-sm transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <Save className="w-4 h-4" />
                  저장하기
                </button>
              </div>
            </form>
          )}

          {status === 'saving' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="w-10 h-10 text-stone-500 animate-spin" />
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">칭찬 내역을 저장하는 중...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
              <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-full flex items-center justify-center mb-6 border border-stone-200 dark:border-stone-700">
                <CheckCircle2 className="w-8 h-8 fill-current text-stone-900 dark:text-stone-100" />
              </div>
              <h3 className="text-xl font-black text-stone-900 dark:text-stone-50 mb-2">저장 성공</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs mb-8">
                칭찬 데이터가 정상적으로 저장되었습니다. 따뜻한 말씀 감사합니다!
              </p>
              <div className="w-full flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleResetForNext}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 font-bold rounded-2xl text-sm transition-colors"
                >
                  계속 작성하기
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-bold rounded-2xl text-sm transition-all"
                >
                  완료 및 닫기
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
              <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-full flex items-center justify-center mb-6 border border-stone-200 dark:border-stone-700">
                <AlertCircle className="w-8 h-8 text-stone-900 dark:text-stone-100" />
              </div>
              <h3 className="text-xl font-black text-stone-900 dark:text-stone-50 mb-2">저장 실패</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400 max-w-xs mb-2 font-medium">
                다시 작성해주세요
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 max-w-xs mb-8">
                사유: {errorMessage}
              </p>
              <div className="w-full flex gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('input')}
                  className="flex-1 py-3 bg-stone-900 hover:bg-stone-850 dark:bg-stone-50 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-bold rounded-2xl text-sm transition-all"
                >
                  다시 시도하기
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-stone-100 dark:bg-stone-850 text-stone-750 dark:text-stone-300 font-bold rounded-2xl text-sm transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
