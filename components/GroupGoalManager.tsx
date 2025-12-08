// src/components/GroupGoalManager.tsx

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Plus } from "lucide-react";

interface GroupGoalManagerProps {
  scope: "facility" | "floor";
  floorName?: string;
  onGoalUpdated?: () => void;
}

export function GroupGoalManager({
  scope,
  floorName,
  onGoalUpdated,
}: GroupGoalManagerProps) {
  const supabase = createClient();
  const [newGoalText, setNewGoalText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddNewGoal = async () => {
    if (!newGoalText.trim()) {
        alert("目標を入力してください。");
        return;
    }
    setIsSaving(true);
    const insertData: any = {
        goal_text: newGoalText,
        scope: scope,
        status: 'active', // ★ 新しい目標は 'active' で作成
    };
    if (scope === "floor" && floorName) {
      insertData.floor_name = floorName;
    }

    const { error } = await supabase.from("group_goals").insert(insertData);
    
    if (error) {
        alert("目標の作成に失敗しました: " + error.message);
    } else {
        setNewGoalText("");
        if (onGoalUpdated) onGoalUpdated();
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
        <Textarea
            placeholder="ここに新しい目標を入力..."
            value={newGoalText}
            onChange={(e) => setNewGoalText(e.target.value)}
            className="min-h-[120px]"
        />
        <Button onClick={handleAddNewGoal} disabled={isSaving} className="w-full">
            {isSaving ? <LoadingSpinner size="sm" /> : <><Plus className="w-4 h-4 mr-2" /> 目標を作成</>}
        </Button>
    </div>
  );
}