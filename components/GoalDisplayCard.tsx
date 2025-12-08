"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import { Pin } from "lucide-react";

interface SimpleGoal {
  goal_text: string;
}

interface SimpleGoalDisplayCardProps {
  scope: "facility" | "floor";
  title: string;
  floorName?: string;
  className?: string;
  onClick?: () => void; // ★★★ 追加: クリックイベントを受け取るためのprop
}

export function GoalDisplayCard({
  scope,
  title,
  floorName,
  className,
  onClick, // ★★★ 追加
}: SimpleGoalDisplayCardProps) {
  const supabase = createClient();
  const [goal, setGoal] = useState<SimpleGoal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentGoal = async () => {
      setLoading(true);
      let query = supabase
        .from("group_goals")
        .select("goal_text")
        .eq("scope", scope)
        .eq("status", "active");

      if (scope === "floor" && floorName) {
        query = query.eq("floor_name", floorName);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false }).limit(1);

      if (data && data.length > 0) {
        setGoal(data[0]);
      } else {
        setGoal(null);
        if (error) {
          console.error(`Error fetching ${scope} goal:`, error);
        }
      }
      setLoading(false);
    };

    fetchCurrentGoal();
  }, [scope, floorName, supabase]);

  return (
    // ★★★ 変更: onClickハンドラとインタラクション用のクラスを追加 ★★★
    <Card
      onClick={onClick}
      className={cn(
        "shadow-sm flex flex-col h-52 cursor-pointer transition-transform hover:scale-[1.02]",
        className
      )}
    >
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Pin className="mr-2 h-5 w-5 text-gray-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <LoadingSpinner />
          </div>
        ) : goal ? (
          <p className="whitespace-pre-wrap text-gray-700 line-clamp-3">
            {goal.goal_text}
          </p>
        ) : (
          <div className="flex justify-center items-center h-full">
            <p className="text-center text-gray-500">現在の目標は設定されていません。</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}