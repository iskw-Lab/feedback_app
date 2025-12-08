"use client"

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from './ui/loading-spinner';
import { MessageSquareQuote } from 'lucide-react'; // アイコンをインポート

type GroupGoalViewerProps = {
  scope: 'facility' | 'floor';
  floorName?: string;
  title: string;
};

type Goal = {
  goal_text: string;
  comment?: string | null; // コメントも取得する可能性がある
};

export function GroupGoalViewer({ scope, floorName, title }: GroupGoalViewerProps) {
  const supabase = createClient();
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  // ★★★ 変更点(1) ★★★
  // 直近の達成済み目標を保存するStateを追加
  const [lastAchievedGoal, setLastAchievedGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      if (scope === 'floor' && !floorName) {
        setIsLoading(false);
        setActiveGoal(null);
        setLastAchievedGoal(null);
        return;
      }
      
      setIsLoading(true);

      // ★★★ 変更点(2) ★★★
      // 有効な目標と、達成済みの目標を同時に取得する
      const fetchActive = supabase
        .from('group_goals')
        .select('goal_text')
        .eq('scope', scope)
        .eq('status', 'active')
        .eq(scope === 'floor' ? 'floor_name' : 'scope', scope === 'floor' ? floorName : 'facility')
        .limit(1)
        .single();
      
      const fetchLastAchieved = supabase
        .from('group_goals')
        .select('goal_text, comment')
        .eq('scope', scope)
        .eq('status', 'achieved')
        .eq(scope === 'floor' ? 'floor_name' : 'scope', scope === 'floor' ? floorName : 'facility')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // 両方のPromiseを並行して実行
      const [activeResult, achievedResult] = await Promise.all([fetchActive, fetchLastAchieved]);

      if (activeResult.error && activeResult.error.code !== 'PGRST116') {
        console.error(`有効な${title}の取得に失敗:`, activeResult.error);
      }
      if (achievedResult.error && achievedResult.error.code !== 'PGRST116') {
        console.error(`達成済みの${title}の取得に失敗:`, achievedResult.error);
      }
      
      setActiveGoal(activeResult.data);
      setLastAchievedGoal(achievedResult.data);
      setIsLoading(false);
    };

    fetchGoals();
  }, [scope, floorName, supabase, title]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">現在の{title}</h3>
        {activeGoal ? (
          <p className="text-gray-700 min-h-[40px] p-2 bg-white rounded border">
            {activeGoal.goal_text}
          </p>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            現在設定されている目標はありません。
          </p>
        )}
      </div>
      
      {/* ★★★ 変更点(3) ★★★ */}
      {/* 直近の達成コメントを表示するセクションを追加 */}
      {lastAchievedGoal?.comment && (
         <div>
            <h4 className="text-md font-semibold mb-2 flex items-center text-gray-600">
                <MessageSquareQuote className="w-4 h-4 mr-2" />
                前回の達成コメント
            </h4>
            <div className="text-sm text-gray-800 p-3 bg-green-50 border-l-4 border-green-400 rounded">
                <p className="italic">「{lastAchievedGoal.comment}」</p>
                <p className="text-xs text-right mt-2 text-gray-500">- 達成した目標: {lastAchievedGoal.goal_text}</p>
            </div>
         </div>
      )}
    </div>
  );
}