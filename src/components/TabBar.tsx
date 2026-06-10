'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Database } from 'lucide-react';

export const TabBar: React.FC = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-45 bg-white/95 dark:bg-stone-900/95 border-t border-stone-200/60 dark:border-stone-800/60 px-6 py-3 flex items-center justify-around md:hidden backdrop-blur-md transition-colors pb-safe">
      <Link
        href="/dashboard"
        className={`flex flex-col items-center gap-1 flex-1 text-center py-1 transition-all ${
          isActive('/dashboard')
            ? 'text-stone-900 dark:text-stone-100 font-black scale-105'
            : 'text-stone-500 dark:text-stone-400 font-medium'
        }`}
        aria-label="대시보드 페이지로 이동"
      >
        <Trophy className="w-5 h-5" />
        <span className="text-2xs">대시보드</span>
      </Link>
      <Link
        href="/list"
        className={`flex flex-col items-center gap-1 flex-1 text-center py-1 transition-all ${
          isActive('/list')
            ? 'text-stone-900 dark:text-stone-100 font-black scale-105'
            : 'text-stone-500 dark:text-stone-400 font-medium'
        }`}
        aria-label="칭찬 data 페이지로 이동"
      >
        <Database className="w-5 h-5" />
        <span className="text-2xs">칭찬 data</span>
      </Link>
    </div>
  );
};
