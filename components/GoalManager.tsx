"use client"

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,DialogDescription } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { LoadingSpinner } from './ui/loading-spinner';
import { Edit, BookOpen, Check } from 'lucide-react';

// ★★★ 変更点(1) ★★★
// onGoalComplete を受け取るための型定義を追加
type GoalManagerProps = {
  profileId: string;
  onGoalComplete: (rewardXp: number) => void;
};

type GoalHistory = {
  id: string;
  goal_text: string;
  status: string;
  created_at: string;
  comment: string | null;
};

// ★★★ 変更点(2) ★★★
// propsの受け取り方を更新
export function GoalManager({ profileId, onGoalComplete }: GoalManagerProps) {
  const supabase = createClient();
  const [currentGoal, setCurrentGoal] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState('');
  const [history, setHistory] = useState<GoalHistory[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [achievementComment, setAchievementComment] = useState('');

  useEffect(() => {
    const fetchCurrentGoal = async () => {
      if (!profileId) return;
      setIsLoading(true);
      const { data } = await supabase
        .from('staff_profiles')
        .select('target')
        .eq('id', profileId)
        .single();
      setCurrentGoal(data?.target || null);
      setNewGoal(data?.target || '');
      setIsLoading(false);
    };
    fetchCurrentGoal();
  }, [profileId, supabase]);

  const handleSaveGoal = async (status: 'changed' | 'achieved', comment: string = '') => {
    setIsLoading(true);
    const response = await fetch('/api/update-goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId,
        oldGoal: currentGoal,
        newGoal: status === 'changed' ? newGoal : '',
        status,
        comment
      }),
    });
    const data = await response.json();
    if (response.ok) {
      setCurrentGoal(data.target);
      setIsEditing(false);
      setAchievementComment('');

      // ★★★ 変更点(3) ★★★
      // ステータスが 'achieved' の場合、onGoalComplete を呼び出す
      if (status === 'achieved') {
        const rewardXp = 50; // 目標達成時の報酬XP（固定値）
        onGoalComplete(rewardXp);
      }

    } else {
      alert(`目標の更新に失敗しました: ${data.error}`);
    }
    setIsLoading(false);
  };

  const handleViewHistory = async () => {
    try {
      const response = await fetch(`/api/goal-history?profileId=${profileId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '履歴の取得に失敗しました。');
      }

      if (Array.isArray(data)) {
        setHistory(data);
      } else {
        console.error("APIから配列でないデータが返されました:", data);
        setHistory([]);
      }
    } catch (error) {
      console.error(error);
      alert('履歴の取得中にエラーが発生しました。');
    }
  };

  if (isLoading) return <div className="flex justify-center p-4"><LoadingSpinner /></div>;

  if (!currentGoal && !isEditing) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-2">目標設定</h3>
        <p className="text-sm text-gray-600 mb-4">まだ目標が設定されていません。目標を入力して保存してください。</p>
        <div className="space-y-2">
          <Textarea
            placeholder="目標を入力..."
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            className="bg-white"
          />
          <div className="flex justify-end">
            <Button onClick={() => handleSaveGoal('changed')}>新しい目標を保存</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">現在の目標</h3>
      <p className="text-gray-700 min-h-[40px] p-2 bg-white rounded border">
        {currentGoal}
      </p>

      {isEditing && (
        <div className="mt-4 space-y-2">
          <Textarea
            placeholder="新しい目標を入力..."
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            className="bg-white"
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>キャンセル</Button>
            <Button onClick={() => handleSaveGoal('changed')}>新しい目標を保存</Button>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="flex justify-between items-center mt-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" onClick={handleViewHistory}><BookOpen className="w-4 h-4 mr-2" />今までの目標</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>今までの目標一覧</DialogTitle></DialogHeader>
              <DialogDescription>
                  過去に設定・達成した目標の履歴です。
                </DialogDescription>
              <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>日付</TableHead><TableHead>目標</TableHead><TableHead>状態</TableHead><TableHead>コメント</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {history.map(h => (
                      <TableRow key={h.id}>
                        <TableCell>{new Date(h.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{h.goal_text}</TableCell>
                        <TableCell>
                          <Badge variant={h.status === 'achieved' ? 'default' : 'secondary'}>
                            {h.status === 'achieved' ? '達成' : '変更'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{h.comment}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary"><Check className="w-4 h-4 mr-2" />達成</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>目標達成コメント</DialogTitle></DialogHeader>
                <DialogDescription>
                    目標達成に関するコメントや振り返りを入力してください。
                </DialogDescription>
                 {/* コメント入力欄を追加 */}
                <Textarea
                  placeholder="（例）目標達成のために工夫したこと、次に挑戦したいことなど"
                  value={achievementComment}
                  onChange={(e) => setAchievementComment(e.target.value)}
                  className="my-4"
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">キャンセル</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={() => handleSaveGoal('achieved', achievementComment)}>達成を記録</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={() => { setIsEditing(true); }}>
              <Edit className="w-4 h-4 mr-2" />変更
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}