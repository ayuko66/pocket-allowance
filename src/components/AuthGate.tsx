'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Button } from './UI';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const sb = supabaseBrowser();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => { setUser(data.user); setReady(true); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="text-sm text-gray-500">Loading...</div>;
  if (!user) return (
    <div className="space-y-2">
      <p className="text-sm">ログインしてください（メールリンク式が簡単です）。</p>
      <Button onClick={async () => {
        const email = prompt('メールアドレスを入力');
        if (!email) return;
        await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } });
        alert('メールを確認してください。');
      }}>メールでログイン</Button>
    </div>
  );
  return <>{children}</>;
}
