import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createRouteSupabase, getMonthSummary, jsonError, logOperation, recalculateMonthSummary, requireParentChildLink, requireProfile } from '@/lib/server-api';

const schema = z.object({
  pointDelta: z.number().int().min(-999).max(999),
  note: z.string().trim().max(200),
});

export async function PATCH(
  request: Request,
  context: { params: { pointId: string } },
) {
  const supabase = createRouteSupabase();

  try {
    const { profile } = await requireProfile(supabase);
    if (profile.role !== 'parent') {
      return jsonError('親アカウントのみ編集できます。', 403);
    }

    const input = schema.parse(await request.json());
    const { data: pointLog, error: pointError } = await supabase
      .from('point_log')
      .select('*')
      .eq('id', context.params.pointId)
      .maybeSingle();

    if (pointError || !pointLog) {
      return jsonError('対象ポイントが見つかりません。', 404);
    }

    await requireParentChildLink(supabase, profile.id, pointLog.child_id);
    const summary = await getMonthSummary(supabase, pointLog.child_id, pointLog.target_month);

    const before = {
      point_delta: pointLog.point_delta,
      note: pointLog.note,
    };

    const { error: updateError } = await supabase
      .from('point_log')
      .update({
        point_delta: input.pointDelta,
        note: input.note || null,
      })
      .eq('id', pointLog.id);

    if (updateError) {
      return jsonError(updateError.message);
    }

    if (summary?.status === 'closed') {
      await logOperation(supabase, {
        householdId: profile.household_id,
        actorId: profile.id,
        actionType: 'point_log.update_after_close',
        targetTable: 'point_log',
        targetId: pointLog.id,
        summary: '締め済み月のポイントを修正しました。',
        metadata: {
          before,
          after: {
            point_delta: input.pointDelta,
            note: input.note,
          },
          child_id: pointLog.child_id,
          target_month: pointLog.target_month,
        },
      });
    }

    await recalculateMonthSummary(supabase, {
      householdId: profile.household_id,
      childId: pointLog.child_id,
      targetMonth: pointLog.target_month,
      actorId: profile.id,
      keepClosedState: true,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? '入力値が不正です。');
    }

    return jsonError(error instanceof Error ? error.message : 'ポイント更新に失敗しました。', 500);
  }
}
