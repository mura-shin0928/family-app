import type {
  LifeEventKind,
  ProcedureCategory,
  TemplateAnchorEvent,
} from "./types";

export type DefaultTemplateItem = {
  title: string;
  note: string | null;
  category: ProcedureCategory | null;
  anchorEvent: TemplateAnchorEvent | null;
  offsetDays: number | null;
};

export type DefaultTemplate = {
  lifeEventKind: LifeEventKind;
  title: string;
  items: readonly DefaultTemplateItem[];
};

// 家族が初めてこのライフイベントを開いたときに procedure_templates /
// procedure_template_items へ複製する既定内容。offset_daysはあくまで目安
// （PROCEDURE_SITE_FINDINGSの実測に基づくものと、一般的な知識からの推測が混在。
// 根拠quoteは持たない）。内容自体は編集画面からPOがいつでも調整できる前提の叩き台。
// 出産直後だけでなく、就学時健診・小学校入学準備まで(=6歳ごろ)を対象に含める。
// categoryがnullの項目は「役所への手続きが存在しない検討・準備系」の項目
// （名前を考える、産院を決める、保活の方針を考える、等）。一致するprocedures
// が無い前提であり、「制度情報が未登録」の警告は出さず、目安期限と
// 「やることに追加」だけを提供する（procedureへの自動マッチはそもそも対象外）。
export const DEFAULT_BIRTH_TEMPLATE: DefaultTemplate = {
  lifeEventKind: "birth",
  title: "子供関連の手続き",
  items: [
    {
      title: "産院を決める・分娩予約をする",
      note: "人気の産院は妊娠がわかってすぐ埋まることもある。役所への手続きではないが早めの検討が必要。",
      category: null,
      anchorEvent: "expected_birth",
      offsetDays: -240,
    },
    {
      title: "母子健康手帳をもらう",
      note: "妊娠が分かったら早めに。妊婦健診の受診票も一緒に受け取る。",
      category: "maternal_child_health_handbook",
      anchorEvent: "expected_birth",
      offsetDays: -180,
    },
    {
      title: "里帰り出産をするか検討する",
      note: "する場合は転院時期・里帰り先での健診の受け方も合わせて調整する。",
      category: null,
      anchorEvent: "expected_birth",
      offsetDays: -150,
    },
    {
      title: "産休・育休の取得について会社と相談する",
      note: "取得時期・期間・引き継ぎについて早めにすり合わせる。",
      category: null,
      anchorEvent: "expected_birth",
      offsetDays: -120,
    },
    {
      title: "妊婦のための支援給付を確認する",
      note: "該当する場合は妊娠中と出生後の2回に分けて給付を受けられる。",
      category: "pregnancy_birth_support_payment",
      anchorEvent: "expected_birth",
      offsetDays: -60,
    },
    {
      title: "名前の候補を考える",
      note: "出生届の提出(生後14日以内が目安)までに決める必要がある。",
      category: null,
      anchorEvent: "expected_birth",
      offsetDays: -45,
    },
    {
      title: "ベビー用品・チャイルドシートを準備する",
      note: "退院時の移動にチャイルドシートが必要。",
      category: null,
      anchorEvent: "expected_birth",
      offsetDays: -30,
    },
    {
      title: "妊婦健診を受ける",
      note: "母子手帳と一緒にもらう受診票を使うと費用の助成を受けられる。",
      category: "pregnancy_checkup_subsidy",
      anchorEvent: "expected_birth",
      offsetDays: -30,
    },
    {
      // 実測: 小金井市は「生まれた日を1日目として数える」ため14日目はbirth+13日。
      title: "出生届を出す",
      note: "生まれた日を1日目として数えて14日以内が目安。",
      category: "birth_registration",
      anchorEvent: "birth",
      offsetDays: 13,
    },
    {
      title: "健康保険の加入手続きをする",
      note: "職場の健康保険なら勤務先へ、国民健康保険なら市区町村窓口へ。乳幼児医療証や出産育児一時金の申請に必要になることが多い。",
      category: "health_insurance_dependent",
      anchorEvent: "birth",
      offsetDays: 13,
    },
    {
      title: "出産育児一時金を申請する",
      note: null,
      category: "maternity_lump_sum",
      anchorEvent: "birth",
      offsetDays: 14,
    },
    {
      title: "新生児訪問を受ける",
      note: "自治体から連絡が来ることが多いが、無ければこちらから問い合わせる。",
      category: "newborn_home_visit",
      anchorEvent: "birth",
      offsetDays: 28,
    },
    {
      title: "乳幼児医療証を申請する",
      note: null,
      category: "infant_medical_subsidy",
      anchorEvent: "birth",
      offsetDays: 14,
    },
    {
      title: "児童手当を申請する",
      note: "申請が遅れると、遅れた分の月は受け取れないことがある。",
      category: "child_allowance",
      anchorEvent: "birth",
      offsetDays: 15,
    },
    {
      title: "予防接種のスケジュールを確認する",
      note: "定期接種の種類・時期は自治体や医療機関で確認する。生後2か月ごろから始まるものが多い。",
      category: null,
      anchorEvent: "birth",
      offsetDays: 60,
    },
    {
      title: "乳児健診(3〜4か月児健診)を受ける",
      note: "自治体から案内が届くことが多い。",
      category: null,
      anchorEvent: "birth",
      offsetDays: 120,
    },
    {
      title: "保活の方針を考える(認可保育園・幼稚園など)",
      note: "希望する園の種類・見学スケジュールを検討する。",
      category: null,
      anchorEvent: "birth",
      offsetDays: 150,
    },
    {
      title: "保育所等の入園を検討・申し込む",
      note: "申込時期は希望する開始月で大きく変わる。4月入園の認可保育所は前年秋(10〜11月ごろ)が締切のことが多い。",
      category: "nursery_enrollment",
      anchorEvent: null,
      offsetDays: null,
    },
    {
      title: "復職のタイミングを考える",
      note: "保育園の入園可否・ならし保育の期間もふまえて職場と調整する。",
      category: null,
      anchorEvent: "birth",
      offsetDays: 180,
    },
    {
      title: "学資保険・教育費の準備を検討する",
      note: null,
      category: null,
      anchorEvent: "birth",
      offsetDays: 200,
    },
    {
      title: "児童手当の現況届が必要か確認する",
      note: "多くの場合は提出不要だが、自治体から通知が来たら必ず確認する。",
      category: "child_allowance",
      anchorEvent: "birth",
      offsetDays: 365,
    },
    {
      title: "1歳6か月児健診を受ける",
      note: null,
      category: "health_checkup_18m",
      anchorEvent: "birth",
      offsetDays: 545,
    },
    {
      title: "3歳児健診を受ける",
      note: null,
      category: "health_checkup_3y",
      anchorEvent: "birth",
      offsetDays: 1095,
    },
    {
      title: "小学校の就学先(学区・区域外就学・受験など)を検討する",
      note: "学区通学以外を考える場合は準備に時間がかかるため早めに情報収集する。",
      category: null,
      anchorEvent: "birth",
      offsetDays: 1800,
    },
    {
      title: "学童保育(放課後児童クラブ)を利用するか検討する",
      note: "人気の学童は定員があるため早めの情報収集が必要な地域もある。",
      category: null,
      anchorEvent: "birth",
      offsetDays: 1900,
    },
    {
      title: "就学時健康診断を受ける",
      note: "小学校入学前年の秋ごろが目安。誕生月によって前後する(学年区分は4月2日生まれ〜翌4月1日生まれで決まるため)。",
      category: "preschool_health_checkup",
      anchorEvent: "birth",
      offsetDays: 2100,
    },
    {
      title: "小学校入学の準備をする",
      note: "就学時健診のあと、就学通知や入学説明会の案内が届く。誕生月によって前後する。",
      category: "elementary_school_enrollment",
      anchorEvent: "birth",
      offsetDays: 2250,
    },
  ],
} as const;

export const DEFAULT_TEMPLATES_BY_KIND: Record<LifeEventKind, DefaultTemplate> =
  {
    birth: DEFAULT_BIRTH_TEMPLATE,
  };
