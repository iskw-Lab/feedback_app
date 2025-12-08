import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { processChecklistAnswers } from "../_utils/analysisHelpers";
import { CategorizedAnswers } from "../types";

export const useChecklistData = (profileId: string) => {
  const [checklistSubmission, setChecklistSubmission] = useState<{
    answers: Record<string, string>;
    submitted_at: string;
  } | null>(null);
  
  const [categorizedAnswers, setCategorizedAnswers] = useState<CategorizedAnswers | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchChecklistData = async () => {
      if (!profileId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("checklist_submissions")
          .select("answers, submitted_at")
          .eq("profile_id", profileId)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setChecklistSubmission(data);
          setCategorizedAnswers(processChecklistAnswers(data.answers));
        }
      } catch (error) {
        console.error("チェックリストデータの取得に失敗:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChecklistData();
  }, [profileId, supabase]);

  return { checklistSubmission, categorizedAnswers, isLoading };
};