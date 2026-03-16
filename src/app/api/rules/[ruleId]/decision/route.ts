import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createRouteSupabase, getMonthSummary, jsonError, requireParentChildLink, requireProfile } from '@/lib/server-api';

const schema = z.object({
  decision: z.enum(['approved', 'rejected']),
});

export async function POST(
  request: Request,
  context: { params: { ruleId: string } },
) {
  const supabase = createRouteSupabase();

  try {
    const { profile } = await requireProfile(supabase);
    const input = schema.parse(await request.json());

    const { data: rule, error: ruleError } = await supabase
      .from('rule_snapshot')
      .select('*')
      .eq('id', context.params.ruleId)
      .maybeSingle();

    if (ruleError || !rule) {
      return jsonError('対象ルールが見つかりません。', 404);
    }

    const summary = await getMonthSummary(supabase, rule.child_id, rule.target_month);
    if (summary?.status === 'closed') {
      return jsonError('締め済みの月のルールは変更できません。');
    }

    if (profile.role === 'child') {
      if (profile.id !== rule.child_id) {
        return jsonError('自分のルールのみ承認できます。', 403);
      }

      if (input.decision !== 'approved' || rule.status !== 'pending_child_approval') {
        return jsonError('現在の状態ではこの操作はできません。');
      }

      const { error: approvalError } = await supabase.from('rule_approval').insert({
        rule_snapshot_id: rule.id,
        approver_id: profile.id,
        approver_role: 'child',
        decision: 'approved',
      });

      if (approvalError) {
        return jsonError(approvalError.message);
      }

      const { error: updateError } = await supabase
        .from('rule_snapshot')
        .update({ status: 'pending_parent_approval' })
        .eq('id', rule.id);

      if (updateError) {
        return jsonError(updateError.message);
      }

      return NextResponse.json({ ok: true });
    }

    await requireParentChildLink(supabase, profile.id, rule.child_id);

    if (input.decision === 'approved') {
      if (rule.status !== 'pending_parent_approval') {
        return jsonError('子の承認後に親承認できます。');
      }

      const { error: approvalError } = await supabase.from('rule_approval').insert({
        rule_snapshot_id: rule.id,
        approver_id: profile.id,
        approver_role: 'parent',
        decision: 'approved',
      });

      if (approvalError) {
        return jsonError(approvalError.message);
      }

      const { error: updateError } = await supabase.from('rule_snapshot').update({ status: 'active' }).eq('id', rule.id);
      if (updateError) {
        return jsonError(updateError.message);
      }
    } else {
      const { error: approvalError } = await supabase.from('rule_approval').upsert(
        {
          rule_snapshot_id: rule.id,
          approver_id: profile.id,
          approver_role: 'parent',
          decision: 'rejected',
        },
        { onConflict: 'rule_snapshot_id,approver_role' },
      );

      if (approvalError) {
        return jsonError(approvalError.message);
      }

      const { error: updateError } = await supabase.from('rule_snapshot').update({ status: 'rejected' }).eq('id', rule.id);
      if (updateError) {
        return jsonError(updateError.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? '入力値が不正です。');
    }

    return jsonError(error instanceof Error ? error.message : '承認更新に失敗しました。', 500);
  }
}
