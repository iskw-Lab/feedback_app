import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ClipboardCheck } from "lucide-react";
import { CategorizedAnswers } from "../types"; // ★types.tsから型を読み込む

// 親から受け取るデータの型定義
interface ChecklistViewerProps {
  isLoading: boolean;
  submissionDate: string | undefined;
  answers: CategorizedAnswers | null;
  onNavigate: () => void; // 「チェック表へ移動」ボタンの動作
}

export const ChecklistViewer = ({
  isLoading,
  submissionDate,
  answers,
  onNavigate,
}: ChecklistViewerProps) => {
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
          <Button
            onClick={onNavigate}
            variant="outline"
            size="sm"
            className="bg-white"
          >
            <ClipboardCheck className="w-4 h-4 mr-2" />
            チェック表へ移動
          </Button>
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

            {/* 各タブの中身 (元のコードと同じロジック) */}
            <TabsContent value="can_do" className="mt-4 max-h-80 overflow-y-auto">
              {answers.can_do.length > 0 ? (
                <ul className="list-none space-y-2 p-0">
                  {answers.can_do.map((item, i) => (
                    <li key={`can_do_${i}`}>
                      <Badge variant="outline" className="mr-2">{item.category}</Badge>
                      {item.text}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-center text-gray-500 text-sm py-4">該当なし</p>}
            </TabsContent>

            <TabsContent value="know" className="mt-4 max-h-80 overflow-y-auto">
               {/* ... (knowの中身: 同様にコピー) ... */}
                {/* 簡略化のため省略しますが、元のコードの know の中身を貼ってください */}
               <ul className="list-none space-y-2 p-0">
                  {answers.know.map((item, i) => (
                    <li key={`know_${i}`}>
                      <Badge variant="outline" className="mr-2">{item.category}</Badge>
                      {item.text}
                    </li>
                  ))}
                </ul>
            </TabsContent>
            
            <TabsContent value="dont_know" className="mt-4 max-h-80 overflow-y-auto">
                {/* ... (dont_knowの中身) ... */}
                <ul className="list-none space-y-2 p-0">
                  {answers.dont_know.map((item, i) => (
                    <li key={`dont_${i}`}>
                      <Badge variant="outline" className="mr-2">{item.category}</Badge>
                      {item.text}
                    </li>
                  ))}
                </ul>
            </TabsContent>

            <TabsContent value="descriptions" className="mt-4 max-h-80 overflow-y-auto">
               {/* ... (descriptionsの中身) ... */}
               {answers.descriptions.map((item, i) => (
                  <div key={`desc_${i}`} className="border-b pb-2 last:border-b-0">
                      <p className="font-semibold text-sm">
                          <Badge variant="outline" className="mr-2">{item.category}</Badge>
                          {item.q}
                      </p>
                      <p className="text-gray-700 pl-2 mt-1 whitespace-pre-wrap">{item.a}</p>
                  </div>
               ))}
            </TabsContent>
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