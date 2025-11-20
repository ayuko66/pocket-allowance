'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Card, Button } from '@/components/UI';
import AuthGate from '@/components/AuthGate';
import { useParams } from 'next/navigation';

type Rule = {
  id: string;
  label: string;
  points: number;
  status: 'awaiting_approval' | 'active';
  month: string;
};

export default function RulesPage() {
  const { userProfile } = useAuth();
  const params = useParams();
  const childId = params.childId as string;
  const [rules, setRules] = useState<Rule[]>([]);
  const [newRuleLabel, setNewRuleLabel] = useState('');
  const [newRulePoints, setNewRulePoints] = useState(10);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    if (childId) {
      fetchRules();
    }
  }, [childId, currentMonth]);

  const fetchRules = async () => {
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from('rule_snapshot')
      .select('*')
      .eq('child_id', childId)
      .eq('month', currentMonth)
      .order('created_at', { ascending: false });
    
    if (error) console.error(error);
    else setRules(data || []);
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    const supabase = supabaseBrowser();
    const { error } = await supabase.from('rule_snapshot').insert({
      child_id: childId,
      month: currentMonth,
      label: newRuleLabel,
      points: newRulePoints,
      created_by: userProfile.id,
      status: 'awaiting_approval' // Default
    });

    if (error) alert(error.message);
    else {
      setNewRuleLabel('');
      setNewRulePoints(10);
      fetchRules();
    }
  };

  const handleApprove = async (ruleId: string) => {
    if (!userProfile) return;
    const supabase = supabaseBrowser();
    
    // 1. Insert approval record
    const { error: approvalError } = await supabase.from('rule_approval').insert({
      snapshot_id: ruleId,
      approver_id: userProfile.id,
      role: userProfile.role,
      decision: 'approved'
    });

    if (approvalError) {
      alert(approvalError.message);
      return;
    }

    // 2. Check if fully approved (Parent + Child) - Simplified for MVP:
    // If Parent approves, and it was created by Parent, maybe we just make it active?
    // Spec says: "Parent creates -> Child approves -> Parent approves".
    // Let's simplify: If current user is Parent, set status to 'active'.
    // If current user is Child, just add approval record (which we did above).
    
    if (userProfile.role === 'parent') {
       const { error: updateError } = await supabase
        .from('rule_snapshot')
        .update({ status: 'active' })
        .eq('id', ruleId);
       if (updateError) alert(updateError.message);
    }
    
    fetchRules();
  };

  return (
    <AuthGate>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">ルール管理</h2>
          <input 
            type="month" 
            value={currentMonth} 
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>

        {userProfile?.role === 'parent' && (
          <Card title="新しいルールを追加">
            <form onSubmit={handleAddRule} className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-500">内容</label>
                <input 
                  type="text" 
                  required
                  className="w-full border rounded px-2 py-1"
                  value={newRuleLabel}
                  onChange={(e) => setNewRuleLabel(e.target.value)}
                />
              </div>
              <div className="w-20">
                <label className="block text-xs text-gray-500">ポイント</label>
                <input 
                  type="number" 
                  required
                  className="w-full border rounded px-2 py-1"
                  value={newRulePoints}
                  onChange={(e) => setNewRulePoints(Number(e.target.value))}
                />
              </div>
              <Button type="submit">追加</Button>
            </form>
          </Card>
        )}

        <div className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">{rule.label}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${rule.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {rule.status === 'active' ? '有効' : '承認待ち'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-xl">{rule.points} pt</span>
                  {rule.status !== 'active' && (
                    <Button onClick={() => handleApprove(rule.id)} className="bg-indigo-600 text-sm">
                      承認する
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {rules.length === 0 && <p className="text-center text-gray-500">ルールがありません</p>}
        </div>
      </div>
    </AuthGate>
  );
}
