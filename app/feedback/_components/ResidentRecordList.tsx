import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ChartPieIcon } from "lucide-react"; // または @heroicons/react/...
import { EmotionPieChart } from "@/components/EmotionPieChart"; // 既存コンポーネント
import { ResidentRecordInfo } from "../types";

interface ResidentRecordListProps {
  staffName: string;
  records: ResidentRecordInfo[];
}

export const ResidentRecordList: React.FC<ResidentRecordListProps> = ({
  staffName,
  records,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>利用者ごとの記録詳細</CardTitle>
        <CardDescription>
          選択された期間内に、{staffName}さんが各利用者について記録した件数です。各行をクリックすると詳細を表示します。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {records.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-3">
            {records.map((item) => (
              <Dialog key={item.name}>
                <DialogTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer transition-colors">
                    <span className="font-medium text-gray-800">
                      {item.name}さん
                    </span>
                    <div className="flex items-center space-x-4">
                      {item.count > 0 && (
                        <Badge
                          variant="outline"
                          className="text-sm font-normal border-blue-300 text-blue-700"
                        >
                          ケアプラン一致率: {item.careplanMatchRate}%
                        </Badge>
                      )}
                      <span className="font-bold text-lg text-black">
                        {item.count}{" "}
                        <span className="text-sm font-normal text-gray-500">件</span>
                      </span>
                      <ChartPieIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{item.name}さんの記録詳細</DialogTitle>
                    <DialogDescription>
                      {item.name}さんの感情分析とパーソナル記録の詳細です。
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="emotion">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="emotion">感情分析</TabsTrigger>
                      <TabsTrigger value="personal">パーソナル記録</TabsTrigger>
                    </TabsList>
                    <TabsContent value="emotion" className="mt-4 h-80 w-full">
                      <EmotionPieChart data={item.emotionDistribution} />
                    </TabsContent>
                    <TabsContent value="personal" className="mt-4">
                      {item.personalRecords.length > 0 ? (
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                          {item.personalRecords.map((rec, i) => (
                            <div key={i} className="p-3 bg-gray-50/80 rounded-md border text-sm">
                              <p className="font-semibold text-gray-500">{rec.time}</p>
                              <p className="mt-1 text-gray-800 font-medium">
                                {rec.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-8">
                          この期間のパーソナル記録はありません。
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">
            表示するデータがありません。
          </p>
        )}
      </CardContent>
    </Card>
  );
};