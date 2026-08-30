import type { LifeEventAnchor, LifeEventKind, TimingKind } from "./types";

export type LifeEventTemplateItem = {
  title: string;
  note: string | null;
  isGovernment: boolean;
  timingKind: TimingKind;
  anchorEvent: LifeEventAnchor | null;
  offsetDays: number | null;
};

export type LifeEventTemplate = {
  kind: LifeEventKind;
  title: string;
  description: string;
  items: readonly LifeEventTemplateItem[];
};

// 家族がライフイベントを追加したときに life_event_procedures へコピーする既定内容。
// offsetDaysはあくまで目安（[[project-procedure-site-findings]]の実測に基づくものと、
// 一般的な知識からの推測が混在）。
// コピーした後は家族が自由に編集する前提の叩き台であり、テンプレ側を後から直しても
// 既に追加済みのリストには影響しない。

// 妊活は子に紐づかないので、目安時期の基準日は life_events.started_on
// （＝anchorEvent: "event_start"）から引く。行政項目は「不妊検査等助成の確認」だけで、
// あとは自分たちの都合で進めること（慣習ではない）。
// P6-3で category 列（行政カタログとの結合キー）は廃止されたため、
// fertility_treatment_subsidy というカテゴリ値は持たせず isGovernment だけで表す。
const PRECONCEPTION_TEMPLATE: LifeEventTemplate = {
  kind: "preconception",
  title: "妊活",
  description: "基礎体温の記録から不妊検査の助成確認まで、妊娠に向けた準備",
  items: [
    {
      title: "基礎体温の記録をつけ始める",
      note: "2〜3か月つけると排卵の傾向がつかめる。アプリや基礎体温表を使う。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "event_start",
      offsetDays: 0,
    },
    {
      title: "パートナーと妊活の進め方を話す",
      note: "いつまで自己流で続けるか、受診に切り替える目安を先に決めておくと動きやすい。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "event_start",
      offsetDays: 0,
    },
    {
      title: "風しんの抗体検査を受ける(必要ならワクチン接種)",
      note: "妊娠中は接種できず、接種後は約2か月避妊が必要。自治体で費用の助成があることが多い。",
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "event_start",
      offsetDays: 0,
    },
    {
      title: "ブライダルチェック(妊娠に向けた基礎的な検査)を受ける",
      note: "産婦人科で子宮・卵巣の状態や感染症などを確認する。パートナーの検査も合わせて検討する。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "event_start",
      offsetDays: 14,
    },
    {
      // 実測: 小金井市「不妊治療費等助成」/ 東京都「不妊検査等助成」。
      // 対象・回数・年齢の条件が自治体ごとに違うので早めに確認する。
      title: "不妊検査・不妊治療の助成制度を確認する",
      note: "保険適用に加えて、自治体独自の助成や上乗せがある。対象・回数・年齢の条件を早めに確認する。",
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "event_start",
      offsetDays: 30,
    },
    {
      title: "半年〜1年で授からなければクリニックを受診する",
      note: "年齢によって目安は変わる(35歳以上は半年が目安とされる)。早めの相談で選択肢が広がる。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "event_start",
      offsetDays: 180,
    },
  ],
} as const;

// 妊娠中のこと。すべて出産予定日(expected_birth)を基準に逆算する。行政の手続きに
// 戌の日参りの慣習を混ぜてある（慣習は isGovernment: false / timingKind: "around" で、
// 時期は「〜ごろ」の目安だけ。暦の十二支などの厳密な計算はしない）。
// 「出産」以降(出生届・児童手当・お宮参りなど)は BIRTH_TEMPLATE 側。予定日基準と
// 出生日基準では必要になる時期がまるで違うので、家族が別々に足せるよう分けてある。
const PREGNANCY_TEMPLATE: LifeEventTemplate = {
  kind: "pregnancy",
  title: "妊娠",
  description:
    "母子手帳・妊婦健診から出産の準備まで、予定日を基準にした妊娠中のこと",
  items: [
    {
      title: "産院を決める・分娩予約をする",
      note: "人気の産院は妊娠がわかってすぐ埋まることもある。役所への手続きではないが早めの検討が必要。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "expected_birth",
      offsetDays: -240,
    },
    {
      title: "母子健康手帳をもらう",
      note: "妊娠が分かったら早めに。妊婦健診の受診票も一緒に受け取る。",
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "expected_birth",
      offsetDays: -180,
    },
    {
      title: "里帰り出産をするか検討する",
      note: "する場合は転院時期・里帰り先での健診の受け方も合わせて調整する。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "expected_birth",
      offsetDays: -150,
    },
    {
      title: "戌の日の安産祈願(帯祝い)をする",
      note: "妊娠5か月ごろの戌の日に安産を祈願する慣習。日にちは厳密でなくてよい。腹帯を用意する家庭も多い。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "expected_birth",
      offsetDays: -140,
    },
    {
      title: "産休・育休の取得について会社と相談する",
      note: "取得時期・期間・引き継ぎについて早めにすり合わせる。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "expected_birth",
      offsetDays: -120,
    },
    {
      title: "妊婦のための支援給付を確認する",
      note: "該当する場合は妊娠中と出生後の2回に分けて給付を受けられる。",
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "expected_birth",
      offsetDays: -60,
    },
    {
      title: "名前の候補を考える",
      note: "出生届の提出(生後14日以内が目安)までに決める必要がある。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "expected_birth",
      offsetDays: -45,
    },
    {
      title: "ベビー用品・チャイルドシートを準備する",
      note: "退院時の移動にチャイルドシートが必要。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "expected_birth",
      offsetDays: -30,
    },
    {
      title: "妊婦健診を受ける",
      note: "母子手帳と一緒にもらう受診票を使うと費用の助成を受けられる。",
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "expected_birth",
      offsetDays: -30,
    },
  ],
} as const;

// 出産以降のこと。すべて出生日(birth)を基準にする。行政の手続きに、お宮参り・
// お食い初め・初節句・初誕生の慣習を時系列で混ぜてある（慣習は isGovernment: false /
// timingKind: "around" で、時期は「〜ごろ」の目安だけ。厳密な暦計算はしない）。
const BIRTH_TEMPLATE: LifeEventTemplate = {
  kind: "birth",
  title: "出産",
  description:
    "出生届から児童手当・健診まで、出生日を基準にした出産後の手続きと慣習",
  items: [
    {
      // 実測: 小金井市は「生まれた日を1日目として数える」ため14日目はbirth+13日。
      title: "出生届を出す",
      note: "生まれた日を1日目として数えて14日以内が目安。",
      isGovernment: true,
      timingKind: "deadline",
      anchorEvent: "birth",
      offsetDays: 13,
    },
    {
      title: "健康保険の加入手続きをする",
      note: "職場の健康保険なら勤務先へ、国民健康保険なら市区町村窓口へ。乳幼児医療証や出産育児一時金の申請に必要になることが多い。",
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 13,
    },
    {
      title: "出産育児一時金を申請する",
      note: null,
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 14,
    },
    {
      title: "乳幼児医療証を申請する",
      note: null,
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 14,
    },
    {
      title: "児童手当を申請する",
      note: "申請が遅れると、遅れた分の月は受け取れないことがある。",
      isGovernment: true,
      timingKind: "deadline",
      anchorEvent: "birth",
      offsetDays: 15,
    },
    {
      title: "新生児訪問を受ける",
      note: "自治体から連絡が来ることが多いが、無ければこちらから問い合わせる。",
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 28,
    },
    {
      title: "お宮参りに行く",
      note: "生後1か月ごろ、氏神様に赤ちゃんの誕生を報告する慣習。地域や家によって時期に幅がある。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 31,
    },
    {
      title: "予防接種のスケジュールを確認する",
      note: "定期接種の種類・時期は自治体や医療機関で確認する。生後2か月ごろから始まるものが多い。",
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 60,
    },
    {
      title: "お食い初め(百日祝い)をする",
      note: "生後100日ごろ、一生食べ物に困らないようにと願う慣習。数え方に地域差がある。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 100,
    },
    {
      title: "初節句を祝う",
      note: "女の子は3月3日、男の子は5月5日。生まれて間もない場合は翌年に祝う家庭も多い。日付は決まっているので基準日からの計算はしない。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: null,
      offsetDays: null,
    },
    {
      title: "乳児健診(3〜4か月児健診)を受ける",
      note: "自治体から案内が届くことが多い。",
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 120,
    },
    {
      title: "復職のタイミングを考える",
      note: "保育園の入園可否・ならし保育の期間もふまえて職場と調整する。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 180,
    },
    {
      title: "学資保険・教育費の準備を検討する",
      note: null,
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 200,
    },
    {
      title: "初誕生(1歳の誕生日)を祝う",
      note: "一升餅を背負わせる、選び取りをするなどの慣習がある。地域や家によってやり方はさまざま。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 365,
    },
    {
      title: "児童手当の現況届が必要か確認する",
      note: "多くの場合は提出不要だが、自治体から通知が来たら必ず確認する。",
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 365,
    },
    {
      title: "1歳6か月児健診を受ける",
      note: null,
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 545,
    },
    {
      title: "3歳児健診を受ける",
      note: null,
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 1095,
    },
  ],
} as const;

// 保育園・小学校は「入れる家庭と入れない家庭がある」「6年先」で、妊娠・出産とは
// 必要になるタイミングがまるで違うため別イベントにする。基準日は子の予定日/出生日。
const NURSERY_TEMPLATE: LifeEventTemplate = {
  kind: "nursery",
  title: "保育園入園",
  description: "保活の方針から入園申込まで",
  items: [
    {
      title: "保活の方針を考える(認可保育園・幼稚園など)",
      note: "希望する園の種類・見学スケジュールを検討する。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 150,
    },
    {
      title: "保育所等の入園を検討・申し込む",
      note: "申込時期は希望する開始月で大きく変わる。4月入園の認可保育所は前年秋(10〜11月ごろ)が締切のことが多い。",
      isGovernment: true,
      timingKind: "deadline",
      anchorEvent: null,
      offsetDays: null,
    },
  ],
} as const;

const SCHOOL_TEMPLATE: LifeEventTemplate = {
  kind: "school",
  title: "小学校入学",
  description: "就学先の検討から入学準備まで",
  items: [
    {
      title: "小学校の就学先(学区・区域外就学・受験など)を検討する",
      note: "学区通学以外を考える場合は準備に時間がかかるため早めに情報収集する。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 1800,
    },
    {
      title: "学童保育(放課後児童クラブ)を利用するか検討する",
      note: "人気の学童は定員があるため早めの情報収集が必要な地域もある。",
      isGovernment: false,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 1900,
    },
    {
      title: "就学時健康診断を受ける",
      note: "小学校入学前年の秋ごろが目安。誕生月によって前後する(学年区分は4月2日生まれ〜翌4月1日生まれで決まるため)。",
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 2100,
    },
    {
      title: "小学校入学の準備をする",
      note: "就学時健診のあと、就学通知や入学説明会の案内が届く。誕生月によって前後する。",
      isGovernment: true,
      timingKind: "around",
      anchorEvent: "birth",
      offsetDays: 2250,
    },
  ],
} as const;

// 家族が選べるライフイベントはこの配列に並ぶ（画面のプルダウンと schema の
// kind enum はここから生成される）。並び順は時系列
// （妊活 → 妊娠 → 出産 → 保育園 → 小学校）。
export const LIFE_EVENT_TEMPLATES: readonly LifeEventTemplate[] = [
  PRECONCEPTION_TEMPLATE,
  PREGNANCY_TEMPLATE,
  BIRTH_TEMPLATE,
  NURSERY_TEMPLATE,
  SCHOOL_TEMPLATE,
];

export function findLifeEventTemplate(
  kind: LifeEventKind,
): LifeEventTemplate | null {
  return LIFE_EVENT_TEMPLATES.find((t) => t.kind === kind) ?? null;
}
