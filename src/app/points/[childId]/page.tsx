'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Button, Card } from '@/components/UI';
import { yymm, fmtJPY } from '@/lib/utils';

export default function PointsPage({ params }: { params: { childId: string } }) {
  const sb = supabaseBrowser();
  const [month, setMonth] = useState<string>(yymm());
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [snapshotId, setSnapshotId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [delta, setDelta] = useState<number>(1);
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const reload = async () => {
    const { data: snaps } = await sb.from('rule_snapshot').select('*').eq('child_id', params.childId).eq('month', month).eq('status','active');
    setSnapshots(snaps || []);
    setSnapshotId(snaps?.[0]?.id || '');
    const { data: pts } = await sb.from('point_entry').select('*').eq('child_id', params.childId).order('created_at', { ascending: false });
    setEntries(pts || []);
    const { data: sum } = await sb.from('monthly_summary').select('*').eq('child_id', params.childId).eq('month', month).maybeSingle();
    setSummary(sum || null);
  };
  useEffect(() => { reload(); }, [month]);

  const add = async () => {
    const res = await fetch('/api/points', { method: 'POST', body: JSON.stringify({ child_id: params.childId, snapshot_id: snapshotId, occurs_on: date, delta_points: delta, note }) });
    if (!res.ok) {
      const js = await res.json().catch(()=>({}));
      return alert(js.error || '登録に失敗しました（承認済みルールか、月が確定していないか確認）');
    }
    setNote(''); await reload();
  };

  const closeMonth = async () => {
    const res = await fetch('/api/close-month', { method: 'POST', body: JSON.stringify({ child_id: params.childId, month }) });
    const js = await res.json();
    if (!res.ok) return alert(js.error || '締めに失敗');
    alert(`確定: ${js.total_points} pt / ${fmtJPY(js.total_yen)}`);
    await reload();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">ポイント登録（{month}）</h2>
      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-sm">対象月</label>
          <input className="border rounded px-2 py-1" value={month} onChange={e=>setMonth(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">日付</label>
          <input type="date" className="border rounded px-2 py-1" value={date} onChange={e=>setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">ルール</label>
          <select className="border rounded px-2 py-1" value={snapshotId} onChange={e=>setSnapshotId(e.target.value)}>
            {snapshots.map(s => <option key={s.id} value={s.id}>{s.label}（{s.points}点）</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">加減点</label>
          <input type="number" className="border rounded px-2 py-1 w-24" value={delta} onChange={e=>setDelta(parseInt(e.target.value||'0'))} />
        </div>
        <div>
          <label className="block text-sm">メモ</label>
          <input className="border rounded px-2 py-1" value={note} onChange={e=>setNote(e.target.value)} />
        </div>
        <Button onClick={add} disabled={!snapshotId || summary?.status==='finalized'}>登録</Button>
        <Button onClick={closeMonth} disabled={summary?.status==='finalized'}>当月を締める</Button>
      </div>

      {summary && (
        <Card title="月次サマリー">
          <p className="text-sm">状態: <b>{summary.status}</b> / 合計: <b>{summary.total_points}</b> pt / 金額: <b>{fmtJPY(summary.total_yen)}</b></p>
        </Card>
      )}

      <Card title="履歴">
        <ul className="text-sm space-y-1">
          {entries.map(e => (
            <li key={e.id} className="flex justify-between border-b py-1">
              <span>{e.occurs_on} / {e.note || '(no note)'} </span>
              <span>{e.delta_points} pt</span>
            </li>
          ))}
          {entries.length===0 && <p className="text-sm text-gray-500">履歴なし</p>}
        </ul>
      </Card>
    </div>
  );
}
