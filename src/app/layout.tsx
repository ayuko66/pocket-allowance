import './globals.css';
import AppShell from '@/components/AppShell';
import AuthProvider from '@/components/AuthProvider';

export const metadata = { title: 'Pocket Allowance MVP' };
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
