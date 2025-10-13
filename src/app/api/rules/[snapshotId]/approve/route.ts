import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(_: Request, { params }: { params: { snapshotId: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: me, error: e1 } = await sb.from('app_user').select('id, role').eq('id', user.id).single();
  if (e1 || !me) return NextResponse.json({ error: 'profile missing' }, { status: 403 });

  const ins = await sb.from('rule_approval').insert({ snapshot_id: params.snapshotId, approver_id: user.id, role: me.role, decision: 'approved' });
  if (ins.error && ins.error.code !== '23505') return NextResponse.json({ error: ins.error.message }, { status: 400 });

  const approvals = await sb.from('rule_approval').select('role,decision').eq('snapshot_id', params.snapshotId);
  const ok = approvals.data?.some(a => a.role==='parent' && a.decision==='approved') &&
             approvals.data?.some(a => a.role==='child' && a.decision==='approved');
  if (ok) await sb.from('rule_snapshot').update({ status: 'active' }).eq('id', params.snapshotId);

  return NextResponse.json({ ok: true });
}
