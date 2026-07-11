'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, LayoutDashboard, Database } from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="sticky top-0 z-45 bg-white/85 dark:bg-stone-900/85 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800/60 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo / Title */}
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="p-2 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 rounded-xl group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <span className="font-black text-base md:text-lg tracking-tight text-stone-900 dark:text-stone-100">
            다니엘틴즈 칭찬왕 대시보드
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isActive('/dashboard')
                ? 'bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            대시보드
          </Link>
          <Link
            href="/list"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isActive('/list')
                ? 'bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
          >
            <Database className="w-4 h-4" />
            칭찬 data
          </Link>
        </nav>
      </div>
    </header>
  );
};
