'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Card, Button } from '@/components/UI';

type Props = {
  childId: string;
  month: string;
  isParent: boolean;
};

type Summary = {
  total_points: number;
  total_yen: number;
  status: 'collecting' | 'finalized';
};

export default function MonthlySummary({ childId, month, isParent }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [yenPerPoint, setYenPerPoint] = useState(1); // Default

  useEffect(() => {
    fetchSummary();
    fetchSettings();
    calculateCurrentTotal();
  }, [childId, month]);

  const fetchSettings = async () => {
    const supabase = supabaseBrowser();
    const { data } = await supabase
      .from('child_settings')
      .select('yen_per_point')
      .eq('child_id', childId)
      .single();
    if (data) setYenPerPoint(data.yen_per_point);
  };

  const fetchSummary = async () => {
    const supabase = supabaseBrowser();
    const { data } = await supabase
      .from('monthly_summary')
      .select('*')
      .eq('child_id', childId)
      .eq('month', month)
      .single();
    setSummary(data);
  };

  const calculateCurrentTotal = async () => {
    const supabase = supabaseBrowser();
    const { data } = await supabase
      .from('point_entry')
      .select('delta_points')
      .eq('child_id', childId)
      .gte('occurs_on', `${month}-01`)
      .lte('occurs_on', `${month}-31`);
    
    const total = data?.reduce((sum, entry) => sum + entry.delta_points, 0) || 0;
    setCalculatedTotal(total);
  };

  const handleFinalize = async () => {
    if (!confirm('今月のポイントを確定して締めますか？これ以降変更はできません。')) return;
    
    const supabase = supabaseBrowser();
    const totalYen = calculatedTotal * yenPerPoint;

    const { error } = await supabase.from('monthly_summary').upsert({
      child_id: childId,
      month: month,
      total_points: calculatedTotal,
      total_yen: totalYen,
      status: 'finalized',
      finalized_at: new Date().toISOString()
    });

    if (error) alert(error.message);
    else fetchSummary();
  };

  const displayPoints = summary?.status === 'finalized' ? summary.total_points : calculatedTotal;
  const displayYen = summary?.status === 'finalized' ? summary.total_yen : calculatedTotal * yenPerPoint;

  return (
    <Card>
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-gray-500 text-sm">{month} のお小遣い</h3>
          <div className="text-3xl font-bold mt-1">¥ {displayYen.toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1">
            {displayPoints} pt × {yenPerPoint} 円
            {summary?.status === 'finalized' && <span className="ml-2 text-green-600 font-bold">(確定済み)</span>}
          </div>
        </div>
        {isParent && summary?.status !== 'finalized' && (
          <Button onClick={handleFinalize} className="bg-orange-500">
            今月を締める
          </Button>
        )}
      </div>
    </Card>
  );
}
