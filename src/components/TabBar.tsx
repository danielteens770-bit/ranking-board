'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, PenTool } from 'lucide-react';

export const TabBar: React.FC = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-45 bg-stone-50/95 dark:bg-stone-900/95 border-t border-stone-200/50 dark:border-stone-850/50 px-6 py-3 flex items-center justify-around md:hidden backdrop-blur-md transition-colors pb-safe">
      <Link
        href="/dashboard"
        className={`flex flex-col items-center gap-1 flex-1 text-center py-1 transition-all ${
          isActive('/dashboard')
            ? 'text-amber-600 dark:text-amber-400 font-bold scale-105'
            : 'text-stone-500 dark:text-stone-400 font-medium'
        }`}
        aria-label="대시보드 페이지로 이동"
      >
        <Trophy className="w-5 h-5" />
        <span className="text-2xs">대시보드</span>
      </Link>
      <Link
        href="/admin"
        className={`flex flex-col items-center gap-1 flex-1 text-center py-1 transition-all ${
          isActive('/admin')
            ? 'text-amber-600 dark:text-amber-400 font-bold scale-105'
            : 'text-stone-500 dark:text-stone-400 font-medium'
        }`}
        aria-label="데이터 입력 페이지로 이동"
      >
        <PenTool className="w-5 h-5" />
        <span className="text-2xs">데이터 입력</span>
      </Link>
    </div>
  );
};
