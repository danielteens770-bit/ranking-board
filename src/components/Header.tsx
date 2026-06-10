'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, LayoutDashboard, List } from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="sticky top-0 z-45 bg-stone-50/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200/50 dark:border-stone-850/50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo / Title */}
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="p-2 bg-gradient-to-tr from-amber-500 to-orange-400 text-white rounded-xl shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-stone-900 to-stone-750 dark:from-stone-50 dark:to-stone-200 bg-clip-text">
            온기 칭찬 랭킹
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              isActive('/dashboard')
                ? 'bg-amber-100/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-850'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            대시보드
          </Link>
          <Link
            href="/list"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              isActive('/list')
                ? 'bg-amber-100/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-850'
            }`}
          >
            <List className="w-4 h-4" />
            칭찬 list
          </Link>
        </nav>
      </div>
    </header>
  );
};
