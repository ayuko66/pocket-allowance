import Link from 'next/link';
import { ReactNode } from 'react';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Pocket Allowance MVP</h1>
        <nav className="flex gap-3 text-sm">
          <Link href="/">Home</Link>
          <Link href="/children">Children</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
