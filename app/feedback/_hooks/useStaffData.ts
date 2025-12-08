import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { StaffMember } from "../types"; // 型定義をインポート

export const useStaffData = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const initializePage = async () => {
      // 1. 認証チェック
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      setUser(user);

      // 2. 権限チェック
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        alert("アクセス権限がありません。");
        router.push("/dashboard");
        return;
      }
      setIsAdmin(true);

      // 3. スタッフ一覧取得
      try {
        const { data: staffData, error } = await supabase
          .from("staff_member")
          .select(`id, floor, profile_id, staff_profiles ( id, name )`);
          
        if (error) throw error;

        const formattedStaff = staffData.map((s) => {
          const profile = Array.isArray(s.staff_profiles)
            ? s.staff_profiles[0]
            : s.staff_profiles;
          return {
            id: s.id,
            floor: s.floor,
            profile_id: s.profile_id,
            name: (profile as { name?: string })?.name || "名前不明",
          };
        });
        setAllStaff(formattedStaff);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [router, supabase]);

  return { user, allStaff, loading, isAdmin };
};