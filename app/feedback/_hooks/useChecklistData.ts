import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { processChecklistAnswers } from "../_utils/analysisHelpers";

export const useChecklistData = (profileId: string) => {
  const [checklistSubmission, setChecklistSubmission] = useState<any>(null);
  const [categorizedAnswers, setCategorizedAnswers] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!profileId) {
        setChecklistSubmission(null);
        setCategorizedAnswers(null);
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("checklist_submissions")
          .select("answers, submitted_at")
          .eq("profile_id", profileId)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setChecklistSubmission(data);
          setCategorizedAnswers(processChecklistAnswers(data.answers));
        } else {
            setChecklistSubmission(null);
            setCategorizedAnswers(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [profileId]);

  return { checklistSubmission, categorizedAnswers, isLoading };
};