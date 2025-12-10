import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

// 表示したい記録例の辞書データ
const RECORD_EXAMPLES: Record<string, { title: string; examples: string[] }> = {
  "発話率": {
    title: "発言内容（「」や『』）を含む記録の例",
    examples: [
      "入浴拒否が続いていたが、「今日は背中がかゆくてたまらない」との訴えあり。入浴すればさっぱりして痒みも引くかもしれないとお伝えすると、『それなら入ろうかね』と納得され、スムーズに入浴へ誘導できた。",
      "昼食の魚料理を見て「昔はよく船に乗って自分で釣ったもんだ」と懐かしそうに話される。食事中も当時の武勇伝を周囲に語り、普段よりも箸が進み全量摂取された。"
    ]
  },
  "パーソナル": {
    title: "趣味・嗜好・好き嫌いに関する記録の例",
    examples: [
      "演歌がお好きとのことで、レクリエーション時に昔の歌番組のDVDを流すと、普段はウトウトされていることが多いが、今日は目を輝かせて一緒に口ずさまれていた。",
      "甘いものには目がないご様子だが、酸っぱいものは苦手のよう。「みかんは酸っぱいからいらない」と残されることが多いため、おやつの提供時は酸味の少ないものを選ぶなどの配慮が必要。"
    ]
  },
  "BADL": {
    title: "BADL（食事・排泄・移動など）に関する記録の例",
    examples: [
      "右半身の拘縮が少し強くなっており、更衣動作時に袖を通すのに苦戦されている。無理に引っ張らず、肘関節を支えながらゆっくり行うことで、痛みなく着替えていただくことができた。",
      "トイレ誘導時、ズボンの上げ下げは自立されているが、立ち上がり直後にふらつきが見られる。手すりをしっかり握っていただくよう声かけを行い、動作が安定するまで側方で見守りを実施。"
    ]
  },
  "IADL": {
    title: "IADL（買い物・金銭・服薬など）に関する記録の例",
    examples: [
      "訪問販売での購入を楽しみにされているが、小銭の計算に時間がかかり焦ってしまう様子が見られた。スタッフが横につき、一緒に硬貨の種類を確認しながら支払いをサポートした。",
      "ご自身で洗濯物をたたむことを日課にされているが、今日は「どうやってたたむんだったか...」と手順に戸惑われている。最初の一枚を一緒にたたんで見せると、その後はスムーズに作業を継続された。"
    ]
  },
  "コミュニケーション": {
    title: "周囲とのコミュニケーションに関する記録の例",
    examples: [
      "他の利用者様が落としたハンカチをすぐに拾って渡されており、「ありがとう」と言われると照れくさそうに笑っておられた。普段はあまり他者と関わろうとしないが、今日は積極的に交流が見られた。",
      "デイルームにて、テレビのチャンネル争いで他利用者様と口論になる。「相撲が見たいんだ」と主張を曲げず興奮気味だったため、一旦自室へ誘導しクールダウンを図った。"
    ]
  },
  "環境": {
    title: "環境整備・安全確保に関する記録の例",
    examples: [
      "夜間巡視時、ベッド柵とマットレスの間に隙間ができており、足が挟まる危険性があった。クッションを入れて隙間を埋め、安全を確保するとともに、ご本人には中央で休むようお声がけした。",
      "居室内の湿度が低く乾燥していたため、加湿器の水を補充し環境を整える。ご本人にも「喉が渇く前に水を飲んでください」と伝え、手の届く位置にお茶を準備した。"
    ]
  }
};

type Props = {
  category: string | null;
};

export function RecordAdviceCard({ category }: Props) {
  // カテゴリが無い、または辞書にキーが存在しない場合は何も表示しない
  if (!category || !RECORD_EXAMPLES[category]) {
    return null;
  }

  const content = RECORD_EXAMPLES[category];

  return (
    <Card className="border-2 border-green-200 bg-green-50/30">
      <CardHeader className="bg-green-50 pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-red-500" />
          <CardTitle className="text-lg text-green-900">
            記録のヒント：<span className="font-bold text-red-600">{category}</span>の視点
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <h4 className="font-semibold text-sm text-gray-700 mb-2">
          【{content.title}】
        </h4>
        <ul className="space-y-3">
          {content.examples.map((example, i) => (
            <li key={i} className="bg-white p-3 rounded border border-green-100 shadow-sm text-sm text-gray-700 leading-relaxed">
              {example}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}