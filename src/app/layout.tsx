import type { Metadata, Viewport } from 'next';
import { Outfit, Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';
import { Header } from '@/components/Header';
import { TabBar } from '@/components/TabBar';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  variable: '--font-noto-sans-kr',
  weight: ['300', '400', '500', '700', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: '온기 칭찬 랭킹 | 학교 칭찬 디지털 플랫폼',
  description: '서로를 격려하고 칭찬을 나누는 따뜻한 학교 칭찬 랭킹 대시보드입니다. 실시간으로 집계되는 칭찬 현황을 확인해 보세요.',
  keywords: ['칭찬', '학교', '랭킹', '대시보드', '칭찬왕', '실시간'],
  authors: [{ name: 'Antigravity Developer' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${outfit.variable} ${notoSansKR.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-50 transition-colors">
        <ToastProvider>
          <Header />
          <main className="flex-1 animate-fade-in pb-20 md:pb-8 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            {children}
          </main>
          <TabBar />
        </ToastProvider>
      </body>
    </html>
  );
}
