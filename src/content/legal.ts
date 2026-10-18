/** 規約とポリシーの版（制定・改定日）。招待の受け入れのときに同意した版として記録する。 */
export const TERMS_VERSION = "2026-10-19";

export const OPERATOR_NAME = "Shin Murakami";

export const APP_NAME = "Family App";

/** 規約・ポリシーの 1 つの節。paragraphs は段落、items は箇条書き。 */
export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  items?: string[];
  table?: { head: string[]; rows: string[][] };
};

/** 個人データを預ける先。プライバシーポリシーの委託先と外部送信の表の元になる。 */
export const PROCESSORS = [
  {
    name: "Supabase, Inc.",
    country: "米国（データの保存先は日本・東京）",
    purpose: "データベースとログインの提供",
    data: "アカウントの情報、家族の中で入力した内容、ログインの記録",
  },
  {
    name: "Vercel Inc.",
    country: "米国（アプリの実行は日本・東京）",
    purpose: "アプリの配信と実行",
    data: "アクセスの記録（IP アドレス、端末とブラウザの情報）",
  },
  {
    name: "Google LLC（Gemini API）",
    country: "米国",
    purpose: "レシピの本文や画像からの、料理名と材料の読み取り",
    data: "解析を頼んだレシピの本文、ページの内容、画像",
  },
  {
    name: "AlphaAI Technologies Inc.（Tavily）",
    country: "米国",
    purpose: "子育て支援制度の Web 検索",
    data: "検索の言葉と、設定した自治体の名前",
  },
  {
    name: "PostHog, Inc.",
    country: "米国（データの保存先は EU）",
    purpose: "利用状況の計測と、エラーの監視",
    data: "メンバーと家族の識別子、操作の種類、端末とブラウザの情報、エラーの内容",
  },
  {
    name: "Google LLC（Gmail）",
    country: "米国",
    purpose: "お問い合わせの受け付け",
    data: "お問い合わせのメールアドレスと本文",
  },
] as const;
