'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Badge, Card, EmptyState, Field, PrimaryButton, SectionTitle, TextArea, TextInput } from '@/components/UI';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Database } from '@/lib/database.types';
import { formatCurrency, formatDateTime, formatMonth, getMonthKey, getMonthKeyFromDate, getTodayString, summaryStatusLabel } from '@/lib/utils';

type AppUser = Database['public']['Tables']['app_user']['Row'];
type Rule = Database['public']['Tables']['rule_snapshot']['Row'];
type PointLog = Database['public']['Tables']['point_log']['Row'];
type Summary = Database['public']['Tables']['month_summary']['Row'];
type Settings = Database['public']['Tables']['child_settings']['Row'];

type EditingState = {
  pointDelta: number;
  note: string;
};

export default function PointsPage() {
  const params = useParams<{ childId: string }>();
  const { loading, profile } = useAuth();
  const supabase = supabaseBrowser();

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [targetMonth, setTargetMonth] = useState(() => getMonthKey());
  const [child, setChild] = useState<AppUser | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<EditingState>({ pointDelta: 0, note: '' });

  useEffect(() => {
    if (!params.childId || !profile) {
      return;
    }

    void loadPage();
  }, [params.childId, profile, targetMonth]);

  const loadPage = async () => {
    setPageLoading(true);
    const [{ data: childData }, { data: activeRules }, { data: allRules }, { data: logData }, { data: summaryData }, { data: settingsData }] = await Promise.all([
      supabase.from('app_user').select('*').eq('id', params.childId).maybeSingle(),
      supabase
        .from('rule_snapshot')
        .select('*')
        .eq('child_id', params.childId)
        .eq('target_month', targetMonth)
        .eq('status', 'active')
        .order('created_at', { ascending: true }),
      supabase
        .from('rule_snapshot')
        .select('*')
        .eq('child_id', params.childId)
        .eq('target_month', targetMonth),
      supabase
        .from('point_log')
        .select('*')
        .eq('child_id', params.childId)
        .eq('target_month', targetMonth)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('month_summary').select('*').eq('child_id', params.childId).eq('target_month', targetMonth).maybeSingle(),
      supabase.from('child_settings').select('*').eq('child_id', params.childId).maybeSingle(),
    ]);

    setChild(childData ?? null);
    setRules(activeRules ?? []);
    setPointLogs(logData ?? []);
    setSummary(summaryData ?? null);
    setSettings(settingsData ?? null);

    const userIds = new Set<string>();
    for (const log of logData ?? []) {
      userIds.add(log.created_by);
    }

    if (userIds.size > 0) {
      const { data: users } = await supabase.from('app_user').select('id, display_name').in('id', [...userIds]);
      setUserMap(Object.fromEntries((users ?? []).map((user) => [user.id, user.display_name] as const)));
    } else {
      setUserMap({});
    }

    setPageLoading(false);
  };

  const handleAddPoint = async (payload: { ruleSnapshotId?: string | null; pointDelta: number; note: string }) => {
    const response = await fetch('/api/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: params.childId,
        occurredOn: selectedDate,
        ruleSnapshotId: payload.ruleSnapshotId ?? null,
        pointDelta: payload.pointDelta,
        note: payload.note,
      }),
    });
    const result = await response.json();
    setMessage(response.ok ? 'ポイントを登録しました。' : result.error ?? 'ポイント登録に失敗しました。');
    if (response.ok) {
      await loadPage();
    }
  };

  const handleCloseMonth = async () => {
    const response = await fetch('/api/months/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: params.childId, targetMonth }),
    });
    const result = await response.json();
    setMessage(response.ok ? '月締めを更新しました。' : result.error ?? '月締めに失敗しました。');
    if (response.ok) {
      await loadPage();
    }
  };

  const handleEditStart = (log: PointLog) => {
    setEditingId(log.id);
    setEditingValue({
      pointDelta: log.point_delta,
      note: log.note ?? '',
    });
  };

  const handleEditSave = async (pointId: string) => {
    const response = await fetch(`/api/points/${pointId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingValue),
    });
    const result = await response.json();
    setMessage(response.ok ? 'ポイント履歴を更新しました。' : result.error ?? '更新に失敗しました。');
    if (response.ok) {
      setEditingId(null);
      await loadPage();
    }
  };

  if (loading || pageLoading) {
    return <Card className="p-10 text-center text-sm text-stone-500">ポイント画面を読み込み中です...</Card>;
  }

  const isParent = profile?.role === 'parent';
  const summaryStatus = summary?.status ?? 'open';
  const canMutate = isParent;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            title={`${child?.display_name ?? '対象ユーザー'} のポイント管理`}
            description={`${formatMonth(targetMonth)} の記録と月締めを扱います。`}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="対象日">
              <TextInput
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedDate(value);
                  setTargetMonth(getMonthKeyFromDate(value));
                }}
              />
            </Field>
            <Field label="対象月">
              <TextInput type="month" value={targetMonth} onChange={(event) => setTargetMonth(event.target.value)} />
            </Field>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4 p-6">
          <SectionTitle title="今月サマリー" description="ポイント合計と円換算の最新値です。" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] bg-stone-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">合計ポイント</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{summary?.total_points ?? 0}pt</p>
            </div>
            <div className="rounded-[24px] bg-stone-950 p-4 text-stone-50">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-300">換算額</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary?.total_yen ?? 0)}</p>
            </div>
            <div className="rounded-[24px] bg-amber-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-amber-700">状態</p>
              <p className="mt-2 text-lg font-semibold text-stone-950">{summaryStatusLabel[summaryStatus]}</p>
              <p className="mt-1 text-xs text-stone-500">最終更新 {formatDateTime(summary?.updated_at ?? null)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={summaryStatus === 'closed' ? 'warning' : 'default'}>
              {summaryStatus === 'closed' ? '締め済み' : '集計中'}
            </Badge>
            <span className="text-sm text-stone-500">1pt = {settings?.yen_per_point ?? 100} 円</span>
          </div>
          {isParent ? (
            <div className="flex flex-wrap items-center gap-3">
              <PrimaryButton type="button" className="bg-amber-700 hover:bg-amber-600" onClick={handleCloseMonth}>
                {summaryStatus === 'closed' ? '再計算して締め状態を更新' : 'この月を締める'}
              </PrimaryButton>
              {summaryStatus === 'closed' ? <span className="text-sm text-stone-500">親は締め後も修正できます。修正時は操作ログを保存します。</span> : null}
            </div>
          ) : null}
        </Card>

        <Card className="space-y-4 p-6">
          <SectionTitle title="利用できるルール" description="有効なルールを選んでポイントを登録します。" />
          {!canMutate ? (
            <p className="text-sm text-stone-500">子アカウントは閲覧のみ可能です。</p>
          ) : rules.length === 0 ? (
            <EmptyState title="有効なルールがありません" description="先にルール画面で承認済みのルールを用意してください。" />
          ) : (
            <div className="grid gap-3">
              {rules.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => handleAddPoint({ ruleSnapshotId: rule.id, pointDelta: rule.point_value, note: rule.label })}
                  className="rounded-[24px] border border-stone-200 bg-white px-4 py-4 text-left transition hover:border-amber-600 hover:bg-amber-50"
                >
                  <p className="font-semibold text-stone-950">{rule.label}</p>
                  <p className="mt-2 text-sm text-stone-500">{rule.point_value > 0 ? '+' : ''}{rule.point_value}pt</p>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {canMutate ? (
        <Card className="p-6">
          <SectionTitle title="任意ポイントを登録" description="特別ボーナスやペナルティを手入力できます。" />
          <form
            className="mt-6 grid gap-4 md:grid-cols-[1fr_180px]"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              void handleAddPoint({
                pointDelta: Number(formData.get('pointDelta')),
                note: String(formData.get('note') ?? ''),
              });
              event.currentTarget.reset();
            }}
          >
            <Field label="内容">
              <TextArea name="note" rows={3} placeholder="例: テストをがんばった" required />
            </Field>
            <Field label="ポイント値">
              <TextInput name="pointDelta" type="number" min={-999} max={999} required defaultValue={1} />
            </Field>
            <div className="md:col-span-2">
              <PrimaryButton type="submit">任意ポイントを登録</PrimaryButton>
            </div>
          </form>
        </Card>
      ) : null}

      {message ? <p className="text-sm text-stone-600">{message}</p> : null}

      <Card className="space-y-4 p-6">
        <SectionTitle title="ポイント履歴" description="この月の加点・減点を新しい順に表示します。" />
        {pointLogs.length === 0 ? (
          <EmptyState title="まだポイント履歴がありません" description="親がポイントを登録すると、ここに履歴が表示されます。" />
        ) : (
          <div className="space-y-3">
            {pointLogs.map((log) => {
              const isEditing = editingId === log.id;
              return (
                <div key={log.id} className="rounded-[24px] border border-stone-200 px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-stone-500">
                        {log.occurred_on} / 登録者 {userMap[log.created_by] ?? '不明'}
                      </p>
                      {isEditing ? (
                        <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                          <TextInput
                            type="number"
                            value={editingValue.pointDelta}
                            onChange={(event) =>
                              setEditingValue((current) => ({ ...current, pointDelta: Number(event.target.value) }))
                            }
                          />
                          <TextArea
                            rows={3}
                            value={editingValue.note}
                            onChange={(event) =>
                              setEditingValue((current) => ({ ...current, note: event.target.value }))
                            }
                          />
                        </div>
                      ) : (
                        <>
                          <p className="text-base font-semibold text-stone-950">{log.note ?? 'メモなし'}</p>
                          <p className="text-sm text-stone-500">記録日 {formatDateTime(log.updated_at)}</p>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-3 lg:items-end">
                      <p className={`text-2xl font-semibold ${log.point_delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {log.point_delta >= 0 ? '+' : ''}
                        {log.point_delta}pt
                      </p>
                      {canMutate ? (
                        isEditing ? (
                          <div className="flex gap-2">
                            <PrimaryButton type="button" onClick={() => handleEditSave(log.id)}>
                              保存
                            </PrimaryButton>
                            <PrimaryButton type="button" className="bg-stone-700 hover:bg-stone-600" onClick={() => setEditingId(null)}>
                              キャンセル
                            </PrimaryButton>
                          </div>
                        ) : (
                          <PrimaryButton type="button" className="bg-stone-700 hover:bg-stone-600" onClick={() => handleEditStart(log)}>
                            編集
                          </PrimaryButton>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
