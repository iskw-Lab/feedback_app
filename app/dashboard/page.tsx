"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  BookUser,
  ClipboardCheck,
  History,
  Pin,
  Settings,
  Upload,
  Users,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InteractiveGoalCard } from "@/components/InteractiveGoalCard";
import { GoalDisplayCard } from "@/components/GoalDisplayCard";
import { PanelButton } from "@/components/PanelButton";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

// 履歴用の型定義
interface GoalHistory {
  id: string;
  created_at: string;
  goal_text: string;
  status: 'achieved' | 'changed';
  comment?: string;
}

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialogContent, setDialogContent] = useState<{ scope: "facility" | "floor", floorName?: string } | null>(null);

  const [individualGoal, setIndividualGoal] = useState<string | null>(null);
  const [goalHistory, setGoalHistory] = useState<GoalHistory[]>([]);

  useEffect(() => {
    const checkUserAndRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
      } else {
        setUser(user);
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

        if (profile?.role === "admin") {
          setIsAdmin(true);
        } else {
          const { data: staffProfile } = await supabase.from("staff_profiles").select("id, target").eq("user_id", user.id).single();
          if (staffProfile) {
            setUserProfileId(staffProfile.id);
            setIndividualGoal(staffProfile.target);

            const { data: historyData } = await supabase
              .from("goal_history")
              .select("*")
              .eq("profile_id", staffProfile.id)
              .order("created_at", { ascending: false });
            if (historyData) {
              setGoalHistory(historyData as GoalHistory[]);
            }
          }
        }
        setLoading(false);
      }
    };
    checkUserAndRole();
  }, [router, supabase]);
  
  const refreshDashboard = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  // navigateTo... 系の関数は変更なし
  const navigateToMyFeedback = () => router.push("/my-feedback");
  const navigateToMyChecklist = () => { if (userProfileId) router.push(`/checklist/${userProfileId}`); };
  const navigateToAllFeedback = () => router.push("/feedback");
  const navigateToStaffAdmin = () => router.push("/admin");
  const navigateToRecipients = () => router.push("/recipients");
  const navigateToUpload = () => router.push("/upload");
  const navigateToResidentInfo = () => router.push("/resident-info");

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="container mx-auto max-w-6xl space-y-8">
        <div key={refreshKey}>
          <div className="space-y-6">
            {isAdmin ? (
              // --- 管理者ビュー ---
              <>
                <Dialog onOpenChange={(isOpen) => { if (!isOpen) refreshDashboard(); }}>
                  <DialogTrigger asChild>
                    <div>
                      <GoalDisplayCard scope="facility" title="施設全体の目標" className="bg-green-50 border-green-200" />
                    </div>
                  </DialogTrigger>
                  <DialogContent><InteractiveGoalCard scope="facility" title="施設全体の目標" isAdmin={isAdmin} /></DialogContent>
                </Dialog>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['1F', '2F', '小規模多機能'].map((floor) => (
                    <Dialog key={floor} onOpenChange={(isOpen) => { if (!isOpen) refreshDashboard(); }}>
                      <DialogTrigger asChild>
                        <div>
                          <GoalDisplayCard scope="floor" floorName={floor} title={`${floor}の目標`} />
                        </div>
                      </DialogTrigger>
                      <DialogContent><InteractiveGoalCard scope="floor" floorName={floor} title={`${floor}の目標`} isAdmin={isAdmin} /></DialogContent>
                    </Dialog>
                  ))}
                </div>
              </>
            ) : (
              // --- スタッフビュー ---
              <div className="space-y-6">
                <Dialog>
                  <DialogTrigger asChild>
                     <div className="cursor-pointer transition-transform hover:scale-[1.02]">
                        <Card className="shadow-sm flex flex-col h-52 bg-blue-50 border-blue-200">
                          <CardHeader>
                            <CardTitle className="text-xl flex items-center">
                              <Pin className="mr-2 h-5 w-5 text-gray-500" />
                              あなたの個人目標
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex-1">
                            {individualGoal ? (
                              <p className="whitespace-pre-wrap text-gray-700 line-clamp-3">{individualGoal}</p>
                            ) : (
                              <div className="flex justify-center items-center h-full">
                                <p className="text-center text-gray-500">個人目標はまだ設定されていません。</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>達成・変更済みの個人目標一覧</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-4 space-y-4">
                        {goalHistory.length > 0 ? (
                            goalHistory.map(goal => (
                                <div key={goal.id} className="border-b pb-3">
                                    <p className="text-gray-500 text-sm">
                                        {format(new Date(goal.created_at), 'yyyy年M月d日', { locale: ja })}
                                        {goal.status === 'achieved' ? ' 達成' : ' 変更'}
                                    </p>
                                    <p className="font-semibold mt-1">{goal.goal_text}</p>
                                    {goal.comment && <p className="mt-2 text-sm text-gray-600 bg-gray-100 p-2 rounded-md">{goal.comment}</p>}
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">過去の目標履歴はありません。</p>
                        )}
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog onOpenChange={(isOpen) => { if (!isOpen) refreshDashboard(); }}>
                  <DialogTrigger asChild>
                    <div className="cursor-pointer transition-transform hover:scale-[1.02]">
                      <GoalDisplayCard scope="facility" title="施設全体の目標" className="bg-green-50 border-green-200" />
                    </div>
                  </DialogTrigger>
                  <DialogContent><InteractiveGoalCard scope="facility" title="施設全体の目標" isAdmin={isAdmin} /></DialogContent>
                </Dialog>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['1F', '2F', '小規模多機能'].map((floor) => (
                    <Dialog key={floor} onOpenChange={(isOpen) => { if (!isOpen) refreshDashboard(); }}>
                      <DialogTrigger asChild>
                        <div className="cursor-pointer transition-transform hover:scale-[1.02]">
                          <GoalDisplayCard scope="floor" floorName={floor} title={`${floor}の目標`} />
                        </div>
                      </DialogTrigger>
                      <DialogContent><InteractiveGoalCard scope="floor" floorName={floor} title={`${floor}の目標`} isAdmin={isAdmin} /></DialogContent>
                    </Dialog>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">メニュー</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {isAdmin
              ? (
                <>
                  <PanelButton icon={<BarChart3 />} title="スタッフ情報" onClick={navigateToAllFeedback} />
                  <PanelButton icon={<BookUser />} title="利用者情報" onClick={navigateToResidentInfo} />
                  <PanelButton icon={<Users />} title="利用者管理" onClick={navigateToRecipients} />
                  <PanelButton icon={<Settings />} title="スタッフ管理" onClick={navigateToStaffAdmin} />
                  <PanelButton icon={<Upload />} title="ファイルアップロード" onClick={navigateToUpload} />
                </>
              )
              : (
                <>
                  <PanelButton icon={<BarChart3 />} title="自分のフィードバック" onClick={navigateToMyFeedback} />
                  <PanelButton icon={<BookUser />} title="利用者情報" onClick={navigateToResidentInfo} />
                  <PanelButton icon={<ClipboardCheck />} title="自己チェック表" onClick={navigateToMyChecklist} />
                </>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}