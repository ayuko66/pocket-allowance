import { NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabase';

export async function POST(req: Request) {
  const sb = supabaseServer();
  const body = await req.json();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: snap } = await sb.from('rule_snapshot').select('id, child_id, month, status').eq('id', body.snapshot_id).single();
  if (!snap || snap.status !== 'active') return NextResponse.json({ error: 'rule not active' }, { status: 400 });

  const { data: sum } = await sb.from('monthly_summary').select('status').eq('child_id', snap.child_id).eq('month', snap.month).maybeSingle();
  if (sum?.status === 'finalized') return NextResponse.json({ error: 'month finalized' }, { status: 400 });

  const ins = await sb.from('point_entry').insert({
    child_id: snap.child_id,
    snapshot_id: snap.id,
    occurs_on: body.occurs_on,
    delta_points: body.delta_points,
    note: body.note,
    created_by: user.id
  });
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
