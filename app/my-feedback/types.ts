// スタッフ情報
export type StaffProfile = {
  id: string;
  name: string;
  floor: string | null;
  experience_points: number;
  character_level: number;
};

// チェックリスト関連
export interface Question {
  id: string;
  text: string;
  type: string;
}

export interface Category {
  category_id: string;
  category_title: string;
  questions: Question[];
}

export type AnswerItem = { text: string; category: string };
export type DescriptionItem = { q: string; a: string; category: string };

export type CategorizedAnswers = {
  know: AnswerItem[];
  can_do: AnswerItem[];
  dont_know: AnswerItem[];
  descriptions: DescriptionItem[];
};

// 分析・利用者記録関連
export type EmotionData = { name: string; value: number };
export type PersonalRecord = { time: string; content: string };

export type ResidentRecordInfo = {
  name: string;
  count: number;
  emotionDistribution: EmotionData[];
  careplanMatchRate: number;
  personalRecords: PersonalRecord[];
};