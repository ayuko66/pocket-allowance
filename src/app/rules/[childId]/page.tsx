'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Badge, Card, EmptyState, Field, PrimaryButton, SectionTitle, TextInput } from '@/components/UI';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Database } from '@/lib/database.types';
import { formatMonth, getMonthKey, ruleStatusLabel } from '@/lib/utils';

type AppUser = Database['public']['Tables']['app_user']['Row'];
type Rule = Database['public']['Tables']['rule_snapshot']['Row'];
type RuleApproval = Database['public']['Tables']['rule_approval']['Row'];
type Summary = Database['public']['Tables']['month_summary']['Row'];

export default function RulesPage() {
  const params = useParams<{ childId: string }>();
  const { loading, profile } = useAuth();
  const supabase = supabaseBrowser();
  const initialMonth = useMemo(() => getMonthKey(), []);

  const [targetMonth, setTargetMonth] = useState(initialMonth);
  const [child, setChild] = useState<AppUser | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [approvals, setApprovals] = useState<RuleApproval[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    if (!params.childId || !profile) {
      return;
    }

    void loadPage();
  }, [params.childId, profile, targetMonth]);

  const loadPage = async () => {
    setPageLoading(true);
    const [{ data: childData }, { data: ruleData }, { data: summaryData }] = await Promise.all([
      supabase.from('app_user').select('*').eq('id', params.childId).maybeSingle(),
      supabase
        .from('rule_snapshot')
        .select('*')
        .eq('child_id', params.childId)
        .eq('target_month', targetMonth)
        .order('created_at', { ascending: false }),
      supabase.from('month_summary').select('*').eq('child_id', params.childId).eq('target_month', targetMonth).maybeSingle(),
    ]);

    setChild(childData ?? null);
    setRules(ruleData ?? []);
    setSummary(summaryData ?? null);

    const ruleIds = (ruleData ?? []).map((item) => item.id);
    if (ruleIds.length > 0) {
      const { data: approvalData } = await supabase
        .from('rule_approval')
        .select('*')
        .in('rule_snapshot_id', ruleIds)
        .order('created_at', { ascending: true });
      setApprovals(approvalData ?? []);
    } else {
      setApprovals([]);
    }

    setPageLoading(false);
  };

  const handleCreateRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: params.childId,
        targetMonth,
        label: formData.get('label'),
        pointValue: Number(formData.get('pointValue')),
      }),
    });
    const result = await response.json();
    setActionMessage(response.ok ? 'ルールを登録しました。' : result.error ?? 'ルール登録に失敗しました。');
    if (response.ok) {
      event.currentTarget.reset();
      await loadPage();
    }
  };

  const handleDecision = async (ruleId: string, decision: 'approved' | 'rejected') => {
    const response = await fetch(`/api/rules/${ruleId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
    const result = await response.json();
    setActionMessage(response.ok ? '承認状態を更新しました。' : result.error ?? '更新に失敗しました。');
    if (response.ok) {
      await loadPage();
    }
  };

  if (loading || pageLoading) {
    return <Card className="p-10 text-center text-sm text-stone-500">ルール画面を読み込み中です...</Card>;
  }

  const isParent = profile?.role === 'parent';
  const isChildOwner = profile?.role === 'child' && profile.id === params.childId;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            title={`${child?.display_name ?? '対象ユーザー'} のルール管理`}
            description={`${formatMonth(targetMonth)} のルールを管理します。`}
          />
          <div className="space-y-2">
            <Field label="対象月">
              <TextInput type="month" value={targetMonth} onChange={(event) => setTargetMonth(event.target.value)} />
            </Field>
            {summary ? (
              <Badge tone={summary.status === 'closed' ? 'warning' : 'default'}>
                {summary.status === 'closed' ? 'この月は締め済みです。ルールは閲覧専用にしています。' : 'この月は集計中です。'}
              </Badge>
            ) : null}
          </div>
        </div>
      </Card>

      {isParent && summary?.status !== 'closed' ? (
        <Card className="p-6">
          <SectionTitle title="新しいルールを追加" description="月ごとに最大 20 件まで登録できます。" />
          <form className="mt-6 grid gap-4 md:grid-cols-[1fr_180px_auto]" onSubmit={handleCreateRule}>
            <Field label="ルール名">
              <TextInput name="label" placeholder="例: 洗濯物をたたむ" required />
            </Field>
            <Field label="ポイント値">
              <TextInput name="pointValue" type="number" min={-999} max={999} required defaultValue={1} />
            </Field>
            <div className="flex items-end">
              <PrimaryButton type="submit" className="w-full">
                ルール登録
              </PrimaryButton>
            </div>
          </form>
        </Card>
      ) : null}

      {actionMessage ? <p className="text-sm text-stone-600">{actionMessage}</p> : null}

      {rules.length === 0 ? (
        <EmptyState title="この月のルールはまだありません" description="親がルールを登録すると、ここに承認待ちと承認済みの状態が表示されます。" />
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => {
            const ruleApprovals = approvals.filter((item) => item.rule_snapshot_id === rule.id);
            const childApproved = ruleApprovals.some((item) => item.approver_role === 'child' && item.decision === 'approved');
            const parentApproved = ruleApprovals.some((item) => item.approver_role === 'parent' && item.decision === 'approved');
            const canChildApprove = isChildOwner && rule.status === 'pending_child_approval';
            const canParentApprove = isParent && rule.status === 'pending_parent_approval' && summary?.status !== 'closed';
            const canParentReject = isParent && ['pending_child_approval', 'pending_parent_approval'].includes(rule.status) && summary?.status !== 'closed';

            return (
              <Card key={rule.id} className="space-y-4 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-stone-950">{rule.label}</p>
                      <Badge
                        tone={
                          rule.status === 'active'
                            ? 'success'
                            : rule.status === 'rejected'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {ruleStatusLabel[rule.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-stone-500">
                      {rule.point_value > 0 ? '+' : ''}
                      {rule.point_value}pt / 作成日 {new Date(rule.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canChildApprove ? (
                      <PrimaryButton type="button" onClick={() => handleDecision(rule.id, 'approved')}>
                        子として承認
                      </PrimaryButton>
                    ) : null}
                    {canParentApprove ? (
                      <PrimaryButton type="button" className="bg-amber-700 hover:bg-amber-600" onClick={() => handleDecision(rule.id, 'approved')}>
                        親として承認
                      </PrimaryButton>
                    ) : null}
                    {canParentReject ? (
                      <PrimaryButton type="button" className="bg-rose-700 hover:bg-rose-600" onClick={() => handleDecision(rule.id, 'rejected')}>
                        却下
                      </PrimaryButton>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[24px] bg-stone-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">子の承認</p>
                    <p className="mt-2 text-sm font-medium text-stone-900">{childApproved ? '承認済み' : '未承認'}</p>
                  </div>
                  <div className="rounded-[24px] bg-stone-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">親の承認</p>
                    <p className="mt-2 text-sm font-medium text-stone-900">{parentApproved ? '承認済み' : '未承認'}</p>
                  </div>
                </div>

                {ruleApprovals.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-stone-700">承認履歴</p>
                    {ruleApprovals.map((approval) => (
                      <div key={approval.id} className="rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-600">
                        {approval.approver_role === 'parent' ? '親' : '子'}が
                        {approval.decision === 'approved' ? '承認' : '却下'} /
                        {new Date(approval.created_at).toLocaleString('ja-JP')}
                        {approval.comment ? ` / ${approval.comment}` : ''}
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
