import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StaffProfile } from "../types";

export const useMyProfile = () => {
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchMyProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const { data: profileData, error } = await supabase
        .from("staff_profiles")
        .select("id, name, experience_points, character_level")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        // 所属フロアを取得
        const { data: memberData } = await supabase
          .from("staff_member")
          .select("floor")
          .eq("profile_id", profileData.id)
          .single();

        setStaffProfile({
          id: profileData.id,
          name: profileData.name,
          floor: memberData?.floor || null,
          experience_points: profileData.experience_points || 0,
          character_level: profileData.character_level || 1,
        });
      }
      setLoading(false);
    };
    fetchMyProfile();
  }, [router, supabase]);

  return { staffProfile, setStaffProfile, loading };
};