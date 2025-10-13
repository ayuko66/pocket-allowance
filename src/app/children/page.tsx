'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';
import { Card } from '@/components/UI';

export default function ChildrenPage() {
  const sb = supabaseBrowser();
  const [children, setChildren] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const meRes = await sb.auth.getUser();
      const meId = meRes.data.user?.id;
      if (!meId) return;
      const { data: me } = await sb.from('app_user').select('id, role, display_name').eq('id', meId).single();
      if (me?.role !== 'parent') return alert('親アカウントでログインしてください');
      const { data } = await sb
        .from('link_parent_child')
        .select('child_id, child:app_user!link_parent_child_child_id_fkey(display_name)');
      setChildren(data || []);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">子ども一覧</h2>
      <div className="grid gap-3">
        {children.map((c) => (
          <Card key={c.child_id} title={c.child.display_name}>
            <div className="flex gap-3 text-sm">
              <Link className="underline" href={`/rules/${c.child_id}`}>ルール管理</Link>
              <Link className="underline" href={`/points/${c.child_id}`}>ポイント登録</Link>
            </div>
          </Card>
        ))}
        {children.length === 0 && <p className="text-sm text-gray-500">リンクされた子がいません（Supabaseで初期データ追加してください）。</p>}
      </div>
    </div>
  );
}
