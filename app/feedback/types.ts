export type StaffMember = {
  id: string;
  name: string;
  floor: string;
  profile_id: string | null;
};

export type AnswerItem = { text: string; category: string };
export type DescriptionItem = { q: string; a: string; category: string };

export type CategorizedAnswers = {
  know: AnswerItem[];
  can_do: AnswerItem[];
  dont_know: AnswerItem[];
  descriptions: DescriptionItem[];
};

// 利用者記録用
export type EmotionData = { name: string; value: number };
export type PersonalRecord = { time: string; content: string };

export type ResidentRecordInfo = {
  name: string;
  count: number;
  emotionDistribution: EmotionData[];
  careplanMatchRate: number;
  personalRecords: PersonalRecord[];
};