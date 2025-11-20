'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Card, Button } from '@/components/UI';
import AuthGate from '@/components/AuthGate';
import { useParams } from 'next/navigation';
import MonthlySummary from '@/components/MonthlySummary';

type Rule = {
  id: string;
  label: string;
  points: number;
};

type PointEntry = {
  id: string;
  occurs_on: string;
  delta_points: number;
  note: string;
  rule_snapshot?: { label: string };
};

export default function PointsPage() {
  const { userProfile } = useAuth();
  const params = useParams();
  const childId = params.childId as string;
  const [activeRules, setActiveRules] = useState<Rule[]>([]);
  const [history, setHistory] = useState<PointEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (childId) {
      fetchActiveRules();
      fetchHistory();
    }
  }, [childId, currentMonth]);

  const fetchActiveRules = async () => {
    const supabase = supabaseBrowser();
    const { data } = await supabase
      .from('rule_snapshot')
      .select('id, label, points')
      .eq('child_id', childId)
      .eq('month', currentMonth)
      .eq('status', 'active');
    setActiveRules(data || []);
  };

  const fetchHistory = async () => {
    const supabase = supabaseBrowser();
    const { data } = await supabase
      .from('point_entry')
      .select('*, rule_snapshot(label)')
      .eq('child_id', childId)
      .gte('occurs_on', `${currentMonth}-01`)
      .lte('occurs_on', `${currentMonth}-31`)
      .order('created_at', { ascending: false });
    setHistory(data || []);
  };

  const handleAddPoint = async (rule: Rule) => {
    if (!userProfile) return;
    const supabase = supabaseBrowser();
    const { error } = await supabase.from('point_entry').insert({
      child_id: childId,
      snapshot_id: rule.id,
      occurs_on: selectedDate,
      delta_points: rule.points,
      note: rule.label,
      created_by: userProfile.id
    });

    if (error) alert(error.message);
    else fetchHistory();
  };

  const handleAdhocPoint = async (points: number, note: string) => {
    if (!userProfile) return;
    const supabase = supabaseBrowser();
    const { error } = await supabase.from('point_entry').insert({
      child_id: childId,
      snapshot_id: null, // Ad-hoc
      occurs_on: selectedDate,
      delta_points: points,
      note: note,
      created_by: userProfile.id
    });

    if (error) alert(error.message);
    else fetchHistory();
  };

  return (
    <AuthGate>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">ポイント登録</h2>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setCurrentMonth(e.target.value.slice(0, 7));
            }}
            className="border rounded px-2 py-1"
          />
        </div>

        <MonthlySummary 
          childId={childId} 
          month={currentMonth} 
          isParent={userProfile?.role === 'parent'} 
        />

        {userProfile?.role === 'parent' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {activeRules.map((rule) => (
                <button
                  key={rule.id}
                  onClick={() => handleAddPoint(rule)}
                  className="p-4 rounded-lg border bg-white hover:bg-gray-50 text-left shadow-sm transition"
                >
                  <div className="font-bold">{rule.label}</div>
                  <div className="text-indigo-600 font-bold">+{rule.points} pt</div>
                </button>
              ))}
            </div>

            <Card title="特別ボーナス / ペナルティ">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as any;
                  handleAdhocPoint(Number(form.points.value), form.note.value);
                  form.reset();
                }} 
                className="flex gap-2 items-end"
              >
                <div className="flex-1">
                  <label className="block text-xs text-gray-500">理由</label>
                  <input name="note" type="text" required className="w-full border rounded px-2 py-1" />
                </div>
                <div className="w-20">
                  <label className="block text-xs text-gray-500">Pt</label>
                  <input name="points" type="number" required className="w-full border rounded px-2 py-1" />
                </div>
                <Button type="submit">登録</Button>
              </form>
            </Card>
          </>
        )}

        <div className="mt-8">
          <h3 className="font-bold text-lg mb-4">履歴 ({currentMonth})</h3>
          <div className="space-y-2">
            {history.map((entry) => (
              <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                <div>
                  <div className="font-bold">{entry.note || entry.rule_snapshot?.label || '不明なポイント'}</div>
                  <div className="text-xs text-gray-500">{entry.occurs_on}</div>
                </div>
                <div className={`font-bold ${entry.delta_points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {entry.delta_points > 0 ? '+' : ''}{entry.delta_points} pt
                </div>
              </div>
            ))}
            {history.length === 0 && <p className="text-center text-gray-500">履歴がありません</p>}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
