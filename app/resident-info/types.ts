// 利用者情報
export type Recipient = {
  id: string;
  name: string;
  floor: string;
};

// 感情分析データ（円グラフ用）
export type EmotionData = { 
  name: string; 
  value: number 
};

// パーソナル記録
export type PersonalRecord = { 
  time: string; 
  content: string 
};

// 月別感情データ（比較・折れ線グラフ用）
export type MonthlyEmotionData = {
  month: string;
  positive: number;
  negative: number;
  neutral: number;
};