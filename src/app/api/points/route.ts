import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createRouteSupabase, getMonthSummary, jsonError, logOperation, recalculateMonthSummary, requireParentChildLink, requireProfile } from '@/lib/server-api';
import { getMonthKeyFromDate } from '@/lib/utils';

const schema = z.object({
  childId: z.string().uuid(),
  occurredOn: z.string().date(),
  ruleSnapshotId: z.string().uuid().nullable().optional(),
  pointDelta: z.number().int().min(-999).max(999),
  note: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  const supabase = createRouteSupabase();

  try {
    const { profile } = await requireProfile(supabase);
    if (profile.role !== 'parent') {
      return jsonError('親アカウントのみポイントを登録できます。', 403);
    }

    const input = schema.parse(await request.json());
    await requireParentChildLink(supabase, profile.id, input.childId);

    const targetMonth = getMonthKeyFromDate(input.occurredOn);
    const summary = await getMonthSummary(supabase, input.childId, targetMonth);

    let pointDelta = input.pointDelta;
    let note = input.note?.trim() ?? '';

    if (input.ruleSnapshotId) {
      const { data: rule, error: ruleError } = await supabase
        .from('rule_snapshot')
        .select('id, label, point_value, status, child_id, target_month')
        .eq('id', input.ruleSnapshotId)
        .maybeSingle();

      if (ruleError || !rule || rule.child_id !== input.childId || rule.target_month !== targetMonth || rule.status !== 'active') {
        return jsonError('利用できないルールです。');
      }

      pointDelta = rule.point_value;
      note = note || rule.label;
    }

    const { data, error } = await supabase
      .from('point_log')
      .insert({
        household_id: profile.household_id,
        child_id: input.childId,
        rule_snapshot_id: input.ruleSnapshotId ?? null,
        target_month: targetMonth,
        occurred_on: input.occurredOn,
        point_delta: pointDelta,
        note: note || null,
        created_by: profile.id,
      })
      .select('*')
      .single();

    if (error || !data) {
      return jsonError(error?.message ?? 'ポイント登録に失敗しました。');
    }

    if (summary?.status === 'closed') {
      await logOperation(supabase, {
        householdId: profile.household_id,
        actorId: profile.id,
        actionType: 'point_log.create_after_close',
        targetTable: 'point_log',
        targetId: data.id,
        summary: '締め済み月にポイントを追加しました。',
        metadata: {
          child_id: input.childId,
          target_month: targetMonth,
          point_delta: pointDelta,
          note,
        },
      });
    }

    await recalculateMonthSummary(supabase, {
      householdId: profile.household_id,
      childId: input.childId,
      targetMonth,
      actorId: profile.id,
      keepClosedState: true,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? '入力値が不正です。');
    }

    return jsonError(error instanceof Error ? error.message : 'ポイント登録に失敗しました。', 500);
  }
}
