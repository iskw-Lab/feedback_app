import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CategorizedAnswers } from "../types"; // 定義した型をインポート

interface ChecklistViewerProps {
  isLoading: boolean;
  submissionDate: string | null | undefined;
  answers: CategorizedAnswers | null;
}

export const ChecklistViewer: React.FC<ChecklistViewerProps> = ({
  isLoading,
  submissionDate,
  answers,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Card className="border-2 border-sky-200">
      <CardHeader className="bg-sky-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">自己チェック表の回答内容</CardTitle>
        </div>
        <CardDescription>
          {submissionDate
            ? `最終回答日: ${new Date(submissionDate).toLocaleDateString("ja-JP")}`
            : "未回答またはデータがありません"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {answers ? (
          <Tabs defaultValue="can_do">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="can_do">
                実践できる ({answers.can_do.length})
              </TabsTrigger>
              <TabsTrigger value="know">
                知っている ({answers.know.length})
              </TabsTrigger>
              <TabsTrigger value="dont_know">
                知らない ({answers.dont_know.length})
              </TabsTrigger>
              <TabsTrigger value="descriptions">
                記述 ({answers.descriptions.length})
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 max-h-60 overflow-y-auto pr-2">
              {/* 重複コードを避けるため、簡易的なリストレンダラーを作成 */}
              {(["can_do", "know", "dont_know"] as const).map((key) => (
                <TabsContent key={key} value={key}>
                  <ul className="space-y-2">
                    {answers[key].map((item, index) => (
                      <li key={index} className="p-2 bg-gray-50 rounded border text-sm">
                        <span className="font-semibold text-gray-800">{item.text}</span>
                        <span className="block text-xs text-gray-500 mt-1">{item.category}</span>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              ))}

              <TabsContent value="descriptions">
                <ul className="space-y-3">
                  {answers.descriptions.map((item, index) => (
                    <li key={index} className="p-2 bg-gray-50 rounded border text-sm">
                      <p className="font-semibold text-gray-800">{item.q}</p>
                      <p className="mt-1 text-gray-700 pl-2 border-l-2 border-gray-300">
                        {item.a}
                      </p>
                      <span className="block text-xs text-gray-500 mt-1">{item.category}</span>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center min-h-[240px] w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 p-8">
            <p className="text-center text-gray-500">チェック表のデータがありません。</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};