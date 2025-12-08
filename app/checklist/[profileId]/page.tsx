"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
// ArrowRight を追加インポート
import { ArrowLeft, ArrowRight, Save } from "lucide-react"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import checklistData from "@/lib/checklist-data.json";

export default function ChecklistPage() {
  const params = useParams();
  const profileId = params.profileId as string;
  const router = useRouter();
  const supabase = createClient();

  const [staffName, setStaffName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 【追加】現在のタブを管理するState (初期値は最初のカテゴリID)
  const [activeTab, setActiveTab] = useState(checklistData[0]?.category_id);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    const { error } = await supabase.from("checklist_submissions").upsert({
      profile_id: profileId,
      submitted_at: new Date().toISOString().slice(0, 10),
      answers: answers,
    }, {
      onConflict: "profile_id,submitted_at",
    });

    if (error) {
      alert("保存に失敗しました: " + error.message);
    } else {
      alert("回答を保存しました。");
      router.back(); 
    }
    setIsSaving(false);
  };

  // 【追加】タブ切り替え時にページトップへスクロールするヘルパー
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 【追加】次へ・戻るボタンのロジック
  const handleNavigation = (direction: "next" | "prev") => {
    const currentIndex = checklistData.findIndex((cat) => cat.category_id === activeTab);
    
    if (direction === "prev") {
      if (currentIndex > 0) {
        setActiveTab(checklistData[currentIndex - 1].category_id);
        scrollToTop();
      }
    } else {
      // "next" の場合
      if (currentIndex < checklistData.length - 1) {
        setActiveTab(checklistData[currentIndex + 1].category_id);
        scrollToTop();
      } else {
        // 最後のカテゴリの場合は保存処理を実行
        handleSubmit();
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return; 
      }
      
      if (!profileId) {
        setLoading(false);
        return;
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from("staff_profiles")
          .select("name")
          .eq("id", profileId)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          throw profileError;
        }
        if (profileData) setStaffName(profileData.name);

        const today = new Date().toISOString().slice(0, 10);
        const { data: submissionData, error: submissionError } = await supabase
          .from("checklist_submissions")
          .select("answers")
          .eq("profile_id", profileId)
          .eq("submitted_at", today);

        if (submissionError) throw submissionError;

        if (submissionData && submissionData.length > 0) {
          setAnswers(submissionData[0].answers || {});
        } else {
          setAnswers({});
        }
      } catch (error: any) {
        console.error("データ取得エラー:", error);
        alert(`データの読み込みに失敗しました: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profileId, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="container mx-auto max-w-5xl">
        <Card className="mb-6 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl lg:text-3xl font-bold text-gray-800">
                自己チェック表
              </CardTitle>
              <CardDescription className="mt-1">
                {staffName}さんの今日の状態をチェックしましょう。
              </CardDescription>
            </div>
            {/* ヘッダーの保存ボタンは残していますが、下のナビゲーションでも保存可能です */}
            <div className="flex w-full sm:w-auto space-x-2">
              <Button
                onClick={handleSubmit}
                disabled={isSaving}
                className="w-1/2 sm:w-auto bg-green-600 hover:bg-green-700 text-white"
              >
                {isSaving ? <LoadingSpinner size="sm" /> : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> 回答を保存
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <Tabs
              value={activeTab} // 【変更】Controlled Componentにする
              onValueChange={setActiveTab} // 【変更】タブクリック時もStateを更新
              className="w-full"
            >
              <div className="flex flex-col gap-2 mb-6">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                  {checklistData.slice(0, 4).map((cat) => (
                    <TabsTrigger 
                      key={cat.category_id} 
                      value={cat.category_id}
                      className="h-auto whitespace-normal py-2 px-1 leading-tight"
                    >
                      {cat.category_title}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                  {checklistData.slice(4, 8).map((cat) => (
                    <TabsTrigger 
                      key={cat.category_id} 
                      value={cat.category_id}
                      className="h-auto whitespace-normal py-2 px-1 leading-tight"
                    >
                      {cat.category_title}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {checklistData.map((category, index) => {
                // 現在のカテゴリが最初か最後かを判定
                const isFirst = index === 0;
                const isLast = index === checklistData.length - 1;

                return (
                  <TabsContent
                    key={category.category_id}
                    value={category.category_id}
                    className="mt-4 focus-visible:ring-0 focus-visible:ring-offset-0"
                  >
                    <div className="space-y-6">
                      {category.questions.map((q) => (
                        <div
                          key={q.id}
                          className="p-4 border rounded-lg bg-white shadow-sm"
                        >
                          <p className="font-semibold mb-3 text-gray-700">
                            {q.text}
                          </p>
                          {q.type === "radio"
                            ? (
                              <RadioGroup
                                value={answers[q.id] || ""}
                                onValueChange={(value) =>
                                  handleAnswerChange(q.id, value)}
                              >
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-x-6 gap-y-3">
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value="can_do"
                                      id={`${q.id}-can_practice`}
                                    />
                                    <Label htmlFor={`${q.id}-can_practice`} className="leading-relaxed cursor-pointer">
                                      知った上で実行(実践)できる
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value="know"
                                      id={`${q.id}-knows`}
                                    />
                                    <Label htmlFor={`${q.id}-knows`} className="leading-relaxed cursor-pointer">
                                      覚えている・知っている
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value="dont_know"
                                      id={`${q.id}-does_not_know`}
                                    />
                                    <Label htmlFor={`${q.id}-does_not_know`} className="leading-relaxed cursor-pointer">
                                      覚えていない・知らない・したことない
                                    </Label>
                                  </div>
                                </div>
                              </RadioGroup>
                            )
                            : (
                              <Textarea
                                placeholder="記述してください..."
                                value={answers[q.id] || ""}
                                onChange={(e) =>
                                  handleAnswerChange(q.id, e.target.value)}
                                className="min-h-[80px]"
                              />
                            )}
                        </div>
                      ))}
                    </div>

                    {/* 【追加】ナビゲーションボタンエリア */}
                    <div className="flex justify-between items-center mt-8 pt-4 border-t">
                      {/* 戻るボタン (最初のカテゴリでは非表示) */}
                      <Button
                        variant="outline"
                        onClick={() => handleNavigation("prev")}
                        disabled={isFirst}
                        className={isFirst ? "invisible" : "w-1/3 sm:w-auto"}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> 戻る
                      </Button>

                      {/* 次へ / 保存 ボタン */}
                      <Button
                        onClick={() => handleNavigation("next")}
                        className={`w-1/3 sm:w-auto ${
                          isLast ? "bg-green-600 hover:bg-green-700 text-white" : ""
                        }`}
                        disabled={isSaving}
                      >
                        {isLast ? (
                          isSaving ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <>
                              回答を保存 <Save className="ml-2 h-4 w-4" />
                            </>
                          )
                        ) : (
                          <>
                            次へ <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>

                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}