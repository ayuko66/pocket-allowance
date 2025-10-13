import './globals.css';
import AppShell from '@/components/AppShell';

export const metadata = { title: 'Pocket Allowance MVP' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja"><body><AppShell>{children}</AppShell></body></html>
  );
}
