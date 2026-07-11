'use client';

import React, { useEffect } from 'react';
import { X, Award, CheckCircle2 } from 'lucide-react';
import { UserRole } from '@/types';

interface PraiseTarget {
  id: string;
  name: string;
  role: UserRole;
}

interface PraiseDetailItem {
  id: string;
  targetId: string;
  name: string;
  role: UserRole;
  message: string;
}

interface PraiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'received' | 'given';
  targets: PraiseTarget[];
  month: string;
  items: PraiseDetailItem[];
  count: number;
}

export const PraiseModal: React.FC<PraiseModalProps> = ({
  isOpen,
  onClose,
  mode,
  targets,
  month,
  items,
  count,
}) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const [yearStr, monthStr] = month.split('-');
  const formattedMonth = `${yearStr}년 ${parseInt(monthStr, 10)}월`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 md:items-center md:p-4 transition-opacity duration-300">
      {/* Background Dim - Close on click */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet Container */}
      <div
        className="relative w-full max-h-[85vh] md:max-h-[75vh] bg-stone-50 dark:bg-stone-900 rounded-t-[2.5rem] md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up md:animate-fade-in md:max-w-2xl border border-stone-200/50 dark:border-stone-800/50 transform transition-all duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Mobile Drag Indicator */}
        <div className="flex justify-center py-3 md:hidden">
          <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-6 pb-4 pt-2 md:py-6 border-b border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 id="modal-title" className="text-lg md:text-xl font-bold text-stone-950 dark:text-stone-50">
                {targets.length === 1 ? (
                  <>
                    {targets[0].name}
                    <span className="text-xs md:text-sm font-normal text-stone-500 dark:text-stone-400 ml-1">
                      ({targets[0].role === 'student' ? '학생' : '선생님'})
                    </span>
                  </>
                ) : (
                  <span>{targets.map((t) => t.name).join(', ')}</span>
                )}
                {mode === 'received' ? ' 님이 받은 칭찬' : ' 님이 한 칭찬'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {formattedMonth} 기준
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-850 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
            aria-label="모달 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Summary Box */}
          <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 rounded-2xl border border-amber-100/60 dark:border-amber-900/20 flex items-center justify-between">
            <span className="text-sm font-medium text-stone-600 dark:text-stone-300">
              {mode === 'received' ? '총 받은 칭찬' : '총 작성한 칭찬'}
            </span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {count}회
            </span>
          </div>

          {/* List Table / Cards */}
          <div className="space-y-5">
            <h3 className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              {mode === 'received' ? '보낸 사람 목록' : '받은 사람 목록'}
            </h3>

            {targets.map((target) => {
              const targetItems = items.filter((item) => item.targetId === target.id);
              return (
                <div key={target.id} className="space-y-2">
                  {targets.length > 1 && (
                    <h4 className="text-xs md:text-sm font-bold text-stone-800 dark:text-stone-250 bg-stone-100 dark:bg-stone-850 px-3 py-1.5 rounded-xl border border-stone-200/50 dark:border-stone-800/40">
                      {target.name} ({target.role === 'student' ? '학생' : '선생님'})
                    </h4>
                  )}

                  {targetItems.length === 0 ? (
                    <div className="text-center py-8 text-stone-500 dark:text-stone-450 text-sm">
                      칭찬 데이터가 없습니다.
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-stone-200/50 dark:border-stone-800/50 rounded-2xl">
                      {/* Desktop Table Header */}
                      <div className="hidden md:grid grid-cols-6 bg-stone-100 dark:bg-stone-850/50 px-4 py-3 text-xs font-semibold text-stone-650 dark:text-stone-350 border-b border-stone-200/50 dark:border-stone-800/50">
                        <div className="col-span-1">이름</div>
                        <div className="col-span-1 text-center">구분</div>
                        <div className="col-span-4 pl-4">칭찬 내용</div>
                      </div>

                      {/* List Items */}
                      <div className="divide-y divide-stone-200/50 dark:divide-stone-800/50">
                        {targetItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-4 md:px-4 md:py-3.5 bg-white dark:bg-stone-900/40 md:grid md:grid-cols-6 items-center flex flex-col md:flex-row align-start text-sm hover:bg-stone-50/40 dark:hover:bg-stone-850/20 transition-colors"
                          >
                            {/* Mobile Badge + Name Row */}
                            <div className="flex md:contents w-full items-center justify-between mb-2 md:mb-0">
                              <div className="col-span-1 font-semibold text-stone-900 dark:text-stone-100">
                                {item.name}
                              </div>
                              <div className="col-span-1 text-center">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${item.role === 'student'
                                    ? 'bg-indigo-55/10 text-indigo-700 dark:text-indigo-400'
                                    : 'bg-emerald-55/10 text-emerald-700 dark:text-emerald-400'
                                    }`}
                                >
                                  {item.role === 'student' ? '학생' : '선생님'}
                                </span>
                              </div>
                            </div>

                            {/* Message (PC + Mobile full) */}
                            <div className="col-span-4 pl-0 md:pl-4 text-stone-600 dark:text-stone-300 w-full text-left bg-stone-50 dark:bg-stone-955/20 md:bg-transparent md:dark:bg-transparent p-3 md:p-0 rounded-xl md:rounded-none leading-relaxed border border-stone-100 md:border-none">
                              "{item.message}"
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 border-t border-stone-200/60 dark:border-stone-800/60 bg-stone-100/30 dark:bg-stone-950/10 flex justify-end">
          <button
            onClick={onClose}
            className="w-full md:w-auto px-5 py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-50 dark:hover:bg-stone-200 text-stone-50 dark:text-stone-900 font-semibold rounded-xl text-sm transition-colors shadow-xs"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
