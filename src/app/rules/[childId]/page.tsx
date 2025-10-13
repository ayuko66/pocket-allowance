'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Button, Card } from '@/components/UI';
import { yymm } from '@/lib/utils';

export default function RulesPage({ params }: { params: { childId: string } }) {
  const sb = supabaseBrowser();
  const [list, setList] = useState<any[]>([]);
  const [label, setLabel] = useState('');
  const [points, setPoints] = useState<number>(1);
  const [month, setMonth] = useState<string>(yymm());

  const reload = async () => {
    const { data } = await sb.from('rule_snapshot').select('*').eq('child_id', params.childId).eq('month', month).order('created_at', { ascending: true });
    setList(data || []);
  };
  useEffect(() => { reload(); }, [month]);

  const add = async () => {
    const me = (await sb.auth.getUser()).data.user?.id;
    await sb.from('rule_snapshot').insert({ child_id: params.childId, month, label, points, created_by: me, status: 'awaiting_approval' });
    setLabel(''); setPoints(1); await reload();
  };

  const approve = async (id: string) => {
    await fetch(`/api/rules/${id}/approve`, { method: 'POST' });
    await reload();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">ルール（{month}）</h2>
      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-sm">対象月</label>
          <input className="border rounded px-2 py-1" value={month} onChange={e=>setMonth(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">内容</label>
          <input className="border rounded px-2 py-1" value={label} onChange={e=>setLabel(e.target.value)} placeholder="例：7時までに起床" />
        </div>
        <div>
          <label className="block text-sm">ポイント(±)</label>
          <input type="number" className="border rounded px-2 py-1 w-24" value={points} onChange={e=>setPoints(parseInt(e.target.value||'0'))} />
        </div>
        <Button onClick={add}>追加</Button>
      </div>

      <div className="grid gap-3">
        {list.map(r => (
          <Card key={r.id} title={`${r.label}（${r.points}点）`}>
            <div className="flex items-center justify-between text-sm">
              <span>状態: <b>{r.status}</b></span>
              <Button onClick={()=>approve(r.id)} disabled={r.status==='active'}>承認する</Button>
            </div>
          </Card>
        ))}
        {list.length===0 && <p className="text-sm text-gray-500">この月のルールはまだありません。</p>}
      </div>
    </div>
  );
}
