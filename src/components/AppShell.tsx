'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { PrimaryButton } from '@/components/UI';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'ホーム' },
  { href: '/children', label: '子ども一覧' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, session, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.28),_transparent_26%),linear-gradient(180deg,#fdfaf4_0%,#f5efe3_42%,#f8f5ef_100%)] text-stone-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[32px] border border-white/60 bg-white/70 px-5 py-4 shadow-[0_24px_60px_-48px_rgba(120,53,15,0.45)] backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-700">Pocket Allowance</p>
              <h1 className="text-2xl font-semibold text-stone-950">親子で運用するポイント制お小遣い</h1>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <nav className="flex flex-wrap gap-2">
                {navItems.map((item) => {
                  const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-medium transition',
                        active ? 'bg-stone-900 text-stone-50' : 'bg-white text-stone-700 hover:bg-stone-100',
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {session ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-stone-900">{profile?.display_name ?? session.user.email}</p>
                    <p className="text-xs text-stone-500">{profile?.role === 'parent' ? '親アカウント' : profile?.role === 'child' ? '子アカウント' : '初期登録待ち'}</p>
                  </div>
                  <PrimaryButton type="button" onClick={signOut} className="bg-amber-700 hover:bg-amber-600">
                    ログアウト
                  </PrimaryButton>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="flex-1 py-6">{children}</main>
      </div>
    </div>
  );
}
