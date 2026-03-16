import type { Metadata } from 'next';
import '@/app/globals.css';
import AppShell from '@/components/AppShell';
import AuthProvider from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Pocket Allowance MVP',
  description: '親子で使うポイント制お小遣い管理アプリ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
