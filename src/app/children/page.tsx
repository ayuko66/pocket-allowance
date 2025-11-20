'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Card, Button } from '@/components/UI';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';

type Child = {
  id: string;
  display_name: string;
};

export default function ChildrenPage() {
  const { userProfile, loading } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (userProfile?.role === 'parent') {
      fetchChildren();
    }
  }, [userProfile]);

  const fetchChildren = async () => {
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from('link_parent_child')
      .select('child:child_id(id, display_name)');
    
    if (error) {
      console.error('Error fetching children:', error);
    } else if (data) {
      setChildren(data.map((d: any) => d.child));
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    // MVP: We assume the child already exists or we just link by email if we could.
    // But since we link by ID in DB, and we don't have a way to lookup user by email easily without edge function (security),
    // For MVP, let's assume we are "Creating" a placeholder child or we need a way to link.
    // Let's implement a simple "Link by ID" or just "Create Child" if we were doing managed accounts.
    // Given the requirement "Parent and Child accounts", let's assume the child has signed up and gives their ID to the parent?
    // Or better for MVP: Parent enters Child's Email, we look it up? (Not possible with standard RLS on auth.users).
    
    // Alternative MVP flow: Parent sees their "My ID" and gives it to Child. Child enters Parent ID to link.
    // OR: We just implement a "Demo Link" button that links to a hardcoded child for now if we can't easily search.
    
    // Let's try: Parent enters Child's ID (UUID).
    setMessage('機能未実装: 子供のIDを入力してリンクする機能は現在開発中です。');
  };

  if (loading) return <div>Loading...</div>;

  if (userProfile?.role !== 'parent') {
    return (
      <AuthGate>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">子供用ダッシュボード</h2>
          <p>あなたは子供アカウントです。</p>
          <div className="mt-4">
            <Link href={`/rules/${userProfile?.id}`} className="text-blue-600 underline">
              自分のルールを見る
            </Link>
          </div>
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">子供一覧</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          {children.map((child) => (
            <Card key={child.id} title={child.display_name}>
              <div className="flex flex-col gap-2 mt-2">
                <Link href={`/rules/${child.id}`}>
                  <Button className="w-full bg-indigo-600">ルール管理</Button>
                </Link>
                <Link href={`/points/${child.id}`}>
                  <Button className="w-full bg-green-600">ポイント登録</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>

        <Card title="子供を追加（リンク）">
          <form onSubmit={handleInvite} className="flex gap-2">
            <input 
              type="text" 
              placeholder="子供のID (UUID)" 
              className="border rounded px-2 py-1 flex-1"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Button type="submit">追加</Button>
          </form>
          {message && <p className="text-sm text-red-500 mt-2">{message}</p>}
        </Card>
      </div>
    </AuthGate>
  );
}
