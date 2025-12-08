"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Check, Edit, History, Plus, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

// 型定義
export interface GroupGoal {
  id: string;
  created_at: string;
  goal_text: string;
  scope: 'facility' | 'floor';
  floor_name?: string;
  status: 'active' | 'achieved' | 'changed';
  comment?: string;
}

interface InteractiveGoalCardProps {
  scope: "facility" | "floor";
  title: string;
  floorName?: string;
  isAdmin: boolean;
}

export function InteractiveGoalCard({
  scope,
  title,
  floorName,
  isAdmin,
}: InteractiveGoalCardProps) {
  const supabase = createClient();
  const [currentGoal, setCurrentGoal] = useState<GroupGoal | null>(null);
  const [pastGoals, setPastGoals] = useState<GroupGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  
  const [isAchieveDialogOpen, setIsAchieveDialogOpen] = useState(false);
  const [achievementComment, setAchievementComment] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  
  const [isSettingNewGoal, setIsSettingNewGoal] = useState(false);
  const [newGoalText, setNewGoalText] = useState("");

  const fetchGoals = async () => {
    setLoading(true);

    // Fetch the current active goal
    let currentGoalQuery = supabase.from("group_goals").select("*").eq("scope", scope).eq("status", "active");
    if (scope === "floor") {
      currentGoalQuery = currentGoalQuery.eq("floor_name", floorName!);
    }
    const { data: currentData } = await currentGoalQuery.limit(1).single();
    
    // Fetch the past goals from goal_history
    let pastGoalsQuery = supabase.from("goal_history").select("*").eq("scope", scope);
    if (scope === "floor") {
      pastGoalsQuery = pastGoalsQuery.eq("floor_name", floorName!);
    }
    const { data: pastData } = await pastGoalsQuery.order("created_at", { ascending: false });

    // ★★★ CRITICAL: Ensure both states are set correctly ★★★
    setCurrentGoal(currentData);
    if (currentData) {
      setEditText(currentData.goal_text);
    }
    
    setPastGoals(pastData || []); // This correctly sets the past goals state
    
    setLoading(false);
  };

  useEffect(() => {
    fetchGoals();
  }, [scope, floorName]);

  const handleSaveEdit = async () => {
    if (!currentGoal) return;
    setIsSaving(true);
    await supabase.from("goal_history").insert({ goal_text: currentGoal.goal_text, status: 'changed', scope: scope, floor_name: floorName });
    const { error } = await supabase.from("group_goals").update({ goal_text: editText }).eq("id", currentGoal.id);
    if (error) {
      alert("目標の更新に失敗しました。");
      console.error("Update Error:", error);
    } else {
      setIsEditing(false);
      await fetchGoals();
    }
    setIsSaving(false);
  };

  const handleConfirmAchievement = async () => {
    if (!currentGoal) return;
    setIsSaving(true);
    
    await supabase.from("goal_history").insert({
        goal_text: currentGoal.goal_text,
        status: 'achieved',
        comment: achievementComment,
        scope: scope,
        floor_name: floorName,
    });

    const { error } = await supabase
      .from("group_goals")
      .update({ 
        status: 'achieved', 
        comment: achievementComment,
        created_at: new Date().toISOString() 
      })
      .eq("id", currentGoal.id);

    if (error) {
      alert("目標達成の記録に失敗しました。");
      console.error("Achievement Error:", error);
    } else {
      setAchievementComment("");
      setIsAchieveDialogOpen(false);
      setCurrentGoal(null); 
      setIsSettingNewGoal(true);
      await fetchGoals();
    }
    setIsSaving(false);
  };

  const handleCreateNewGoal = async () => {
    if (!newGoalText.trim()) {
        alert("目標を入力してください。");
        return;
    }
    setIsSaving(true);
    const insertData: any = {
        goal_text: newGoalText,
        scope: scope,
        status: 'active',
        floor_name: scope === 'floor' ? floorName : undefined,
    };
    const { error } = await supabase.from("group_goals").insert(insertData);
    if (error) {
        alert("新しい目標の作成に失敗しました。");
        console.error("Create Error:", error);
    } else {
        setNewGoalText("");
        setIsSettingNewGoal(false);
        await fetchGoals();
    }
    setIsSaving(false);
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle className="text-2xl">{title}</DialogTitle>
      </DialogHeader>
      <div className="py-6 min-h-[150px]">
        {loading ? (
          <div className="flex justify-center items-center h-24"><LoadingSpinner /></div>
        ) : isSettingNewGoal ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">新しい目標を入力してください</h3>
            <Textarea
              placeholder="ここに新しい目標を入力..."
              value={newGoalText}
              onChange={(e) => setNewGoalText(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => { setIsSettingNewGoal(false); fetchGoals(); }}>キャンセル</Button>
              <Button size="sm" onClick={handleCreateNewGoal} disabled={isSaving}>
                {isSaving ? <LoadingSpinner size="sm" /> : "目標を作成"}
              </Button>
            </div>
          </div>
        ) : currentGoal ? (
          isEditing ? (
            <div className="space-y-2">
              <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[100px]" />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>キャンセル</Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                  {isSaving ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4 mr-2" /> 保存</>}
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-gray-700">{currentGoal.goal_text}</p>
          )
        ) : (
          <p className="text-center text-gray-500 py-4">現在の目標は設定されていません。</p>
        )}
      </div>
      {/* ★★★ ここからが修正箇所 ★★★ */}
      <div className="bg-muted -mx-6 -mb-6 px-6 py-3 flex justify-end gap-2 rounded-b-lg">
        {isAdmin && !isSettingNewGoal && (
          currentGoal ? (
            !isEditing && (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" /> 変更
                </Button>
                <Dialog open={isAchieveDialogOpen} onOpenChange={setIsAchieveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <Check className="w-4 h-4 mr-2" /> 目標達成
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>目標達成の記録</DialogTitle>
                      <DialogDescription>目標達成に関するコメントを入力してください。</DialogDescription>
                    </DialogHeader>
                    <Textarea placeholder="（例）ヒヤリハット報告の件数が増え、事故を未然に防ぐ文化が定着したため。" value={achievementComment} onChange={(e) => setAchievementComment(e.target.value)} className="min-h-[120px]" />
                    <DialogFooter>
                      <Button onClick={handleConfirmAchievement} disabled={isSaving}>
                        {isSaving ? <LoadingSpinner size="sm" /> : "入力完了"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )
          ) : (
            <Button size="sm" onClick={() => setIsSettingNewGoal(true)}><Plus className="w-4 h-4 mr-2" /> 新しい目標を設定</Button>
          )
        )}
        
        {/* 「今までの目標」ボタンをisAdminの条件の外に出す */}
        {pastGoals.length > 0 && (
          <Dialog>
            <DialogTrigger asChild><Button variant="secondary" size="sm"><History className="w-4 h-4 mr-2" /> 今までの目標</Button></DialogTrigger>
            <DialogContent className="max-h-[80vh] flex flex-col">
              <DialogHeader><DialogTitle>達成済みの目標一覧</DialogTitle></DialogHeader>
              <div className="flex-1 overflow-y-auto pr-4 space-y-4">
                {pastGoals.map(goal => (
                  <div key={goal.id} className="border-b pb-3">
                    <p className="text-gray-500 text-sm">
                      {format(new Date(goal.created_at), 'yyyy年M月d日', { locale: ja })}
                      {goal.status === 'achieved' ? ' 達成' : ' 変更'}
                    </p>
                    <p className="font-semibold mt-1">{goal.goal_text}</p>
                    {goal.comment && <p className="mt-2 text-sm text-gray-600 bg-gray-100 p-2 rounded-md">{goal.comment}</p>}
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
       {/* ★★★ ここまでが修正箇所 ★★★ */}
    </div>
  );
}