"use client";

import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import { Progress } from "@/components/ui/progress";

// ★★★ 変更点(1) ★★★
// 各キャラクターに9種類の応援メッセージを追加
const evolutionStages = [
    { 
        level: 1, name: 'たまごさん', scoreThreshold: 100, image: "/charactor1.png",
        messages: [
            "まだ眠いみたい...",
            "もうすぐ会えるかな？",
            "皆さんの記録が栄養になります！",
            "Zzz...",
            "むにゃむにゃ...",
            "あたたかい...",
            "どんな人に会えるかな...",
            "ドキドキ...",
            "もう少し...",
        ]
    },
    { 
        level: 2, name: 'ひよっこ', scoreThreshold: 200, image: "/charactor2.png",
        messages: [
            "ピヨ！はじめまして！",
            "いつも見てるよ！ピヨ！",
            "今日の記録もすてきだピヨ！",
            "ひとつひとつのケアが力になるんだ！",
            "頑張ってるの、知ってるよ！",
            "あなたの優しさが大好きだッピ！",
            "ファイトだピヨ！",
            "すごい、すごい！",
            "今日も一日おつかれさま！",
        ]
    },
    { 
        level: 3, name: 'みならいひよこ', scoreThreshold: 300, image: "/charactor3.png",
        messages: [
            "コケッ！調子はどう？",
            "その調子！とっても良い感じ！",
            "あなたのケアは、あたたかいね！",
            "困ったときはいつでも声をかけてね！",
            "小さな気づき、素晴らしい！",
            "あなたなら大丈夫だよ！",
            "いつもありがとう！",
            "コツコツ頑張っていてえらい！",
            "応援してるよ！コケッ！",
        ]
    },
    { 
        level: 4, name: 'いっぱしひよこ', scoreThreshold: 400, image: "/charactor4.png",
        messages: [
            "コケッ！頼りにしてるよ！",
            "あなたの視点、素晴らしいね！",
            "チームの大切な一員だ！",
            "その丁寧な仕事、見てる人は見てるよ！",
            "周りをよく見ていて、すごい！",
            "自信をもって大丈夫！",
            "どんどん成長しているね！",
            "今日も一日お疲れ様！",
            "明日も一緒に頑張ろう！",
        ]
    },
    { 
        level: 5, name: 'にわとりさん', scoreThreshold: 500, image: "/charactor5.png",
        messages: [
            "コケコッコー！今日も最高の一日だ！",
            "あなたの経験がみんなを支えているね！",
            "いつも本当にありがとう！",
            "皆さんは最高のチームです！",
            "あなたの判断はいつも的確だね！",
            "さすがだね！安心して任せられるよ！",
            "これからもずっと応援しています！",
            "その背中、後輩はちゃんと見てるよ！",
            "今日も一日、本当にお疲れ様でした！",
        ]
    },
];

interface GamificationCharacterProps {
  score: number;
  level: number;
  message: string;
  hideScore?: boolean;   // スコア/XPバー非表示フラグ
  hideLevel?: boolean;   // レベルテキスト非表示フラグ
  imageOnly?: boolean;   // 画像のみ表示フラグ
}

const getNextLevelThreshold = (currentLevel: number): number => {
    const nextStage = evolutionStages.find(s => s.level === currentLevel + 1);
    return nextStage ? nextStage.scoreThreshold : Infinity; // 次がなければ Infinity
};

// 現在のレベルに到達するためのしきい値を取得する関数
const getCurrentLevelThreshold = (currentLevel: number): number => {
    // レベル1の場合は0
    if (currentLevel <= 1) return 0;
    // 現在のレベルの1つ前のステージのしきい値を返す
    const prevStage = evolutionStages.find(s => s.level === currentLevel - 1);
    // scoreThresholdは次のレベルになるための値なので、現在のレベルになるための閾値は1つ前のレベルの閾値
    return prevStage ? prevStage.scoreThreshold : 0;
};


export function GamificationCharacter({
    score,
    level,
    message,
    // ★★★ 2. Propsを受け取り、デフォルト値を設定 ★★★
    hideScore = false,
    hideLevel = false,
    imageOnly = false,
}: GamificationCharacterProps) {
  const [animationClass, setAnimationClass] = useState("");
  const [activeMessage, setActiveMessage] = useState<string>("");

  const currentCharacter = useMemo(() => {
    // レベルに基づいて現在のキャラクター情報を取得 (最大レベル超過も考慮)
    let foundStage = evolutionStages.find(stage => stage.level === level);
    if (!foundStage) {
        // level が定義された最大レベルを超えている場合は、最大レベルのキャラを返す
        foundStage = evolutionStages[evolutionStages.length - 1];
    }
    return foundStage || evolutionStages[0]; // 万が一見つからない場合は初期キャラ
  }, [level]);

  // クリック時のアニメーションとメッセージ表示ロジック (変更なし)
  const handleClick = () => {
    setAnimationClass("animate-bounce-once");
    setTimeout(() => setAnimationClass(""), 500);
    const allPossibleMessages = [...currentCharacter.messages, message].filter(Boolean); // messageが空の場合を除外
    if (allPossibleMessages.length > 0) {
        const randomIndex = Math.floor(Math.random() * allPossibleMessages.length);
        setActiveMessage(allPossibleMessages[randomIndex]);
    }
  };

  // メッセージ自動消去ロジック (変更なし)
  useEffect(() => {
    if (activeMessage) {
      const timer = setTimeout(() => setActiveMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [activeMessage]);

  // ★★★ 3. プログレスバー計算ロジックを修正 ★★★
  const currentLevelThreshold = getCurrentLevelThreshold(level); // 現在LvになるためのXP
  const nextLevelThreshold = getNextLevelThreshold(level);       // 次LvになるためのXP
  const xpNeededForThisLevel = nextLevelThreshold - currentLevelThreshold; // 現在Lvで必要なXP量
  const xpEarnedInThisLevel = score - currentLevelThreshold;        // 現在Lvで獲得したXP

  const progressPercentage = (xpNeededForThisLevel > 0 && nextLevelThreshold !== Infinity)
    ? Math.max(0, Math.min((xpEarnedInThisLevel / xpNeededForThisLevel) * 100, 100))
    : 100; // 最大レベルか計算不能なら100%

  // ★★★ 4. imageOnlyがtrueなら画像だけを返す ★★★
  if (imageOnly) {
    return (
      <div className={`relative w-full h-full ${animationClass}`} onClick={handleClick}>
        <Image
          src={currentCharacter.image}
          alt={currentCharacter.name}
          fill
          style={{ objectFit: 'contain' }}
          priority // 画像を優先的に読み込む (任意)
        />
      </div>
    );
  }

  // ★★★ 5. 通常表示 (hideScore, hideLevelを適用) ★★★
  return (
    <div className="relative flex flex-col items-center justify-center pt-12"> {/* フキダシ用にptを追加 */}
      {/* メッセージ表示 (変更なし) */}
      {activeMessage && (
        <div className="absolute top-0 bg-gray-800 text-white text-sm rounded-lg px-3 py-1.5 mb-2 shadow-lg max-w-[90%] text-center transition-opacity duration-300 z-10">
          {activeMessage}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[-8px] w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-gray-800" />
        </div>
      )}

      {/* キャラクター画像 (クリックイベント適用) */}
      <div
        className={`w-32 h-32 relative cursor-pointer ${animationClass}`} // サイズを少し小さく
        onClick={handleClick}
      >
        <Image
          src={currentCharacter.image}
          alt={currentCharacter.name}
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>

      <div className="mt-3 text-center w-full px-4">
        {/* ★ レベル表示 (hideLevelがfalseの場合のみ) ★ */}
        {!hideLevel && (
          <p className="text-lg font-bold text-black">
            {currentCharacter.name} (Lv. {level})
          </p>
        )}

        {/* ★ スコア・プログレスバー表示 (hideScoreがfalseの場合のみ) ★ */}
        {!hideScore && (
          <div className="mt-2">
            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
              <span>XP: {score}</span>
              {nextLevelThreshold !== Infinity && (
                <span>次のレベルまで {Math.max(0, nextLevelThreshold - score)}</span>
              )}
            </div>
            {/* Progressバーを追加 */}
            <Progress value={progressPercentage} className="w-full h-2" />
          </div>
        )}
      </div>
    </div>
  );
}