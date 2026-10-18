/** seido-data-hub の自治体。code は6桁の団体コード（例: サンプル市 999999）。 */
export type Area = {
  code: string;
  name: string;
  /** 市区町村なら都道府県のコード。都道府県自身は null。 */
  parentCode: string | null;
};

/** seido-data-hub の制度1件（レジストリの1行）。 */
export type Program = {
  id: string;
  areaCode: string;
  /** UM の標準名（例: 「乳児家庭全戸訪問（こんにちは赤ちゃん訪問）」）。 */
  canonicalName: string;
  /** 自治体での呼び名（例: 「新生児訪問（赤ちゃん訪問）」）。 */
  shortName: string | null;
  /** レジストリの値のまま。リンクには url を使う。 */
  sourceUrl: string;
  /** いま開ける URL（seido-data-hub が巡回で確かめた代表 URL。まだ確かめていなければ sourceUrl）。 */
  url: string;
  /**
   * 公式ページの状態（active / deletion_candidate / deleted / moved）。一度も確かめていなければ null。
   * API に値が増えても一覧ごと落とさないよう、列挙にせず文字列で持つ。
   */
  state: string | null;
  /** 最後に確かめた日時（ISO 8601）。null なら一度も確かめていない。 */
  checkedAt: string | null;
  /**
   * 最後に内容の変化を見た日時。null でも「変わっていない」とは言えない
   * （最初の巡回には比べる相手が無く、それより前の変化は観測していない）。
   */
  changedAt: string | null;
  /** false なら 403・robots で取得できず、自動で確かめられない。 */
  autoUpdate: boolean;
  /** 公式ページが消えた（か消えた疑いがある）制度でだけ、関連していそうなページを順位どおりに入れる。 */
  relatedLinks: ProgramLink[];
  /** 002 妊娠・出産 / 003 子育て / 004 保育 など。 */
  categoryCodes: string[];
  /** 対象者。086 妊産婦 / 087 子育て中 / 088 ひとり親 など。 */
  targetCodes: string[];
  /** 対象の月齢。age_min_months <= 月齢 < age_max_months。null はその側に制限なし。 */
  ageMinMonths: number | null;
  ageMaxMonths: number | null;
};

/** 制度の関連リンク1件。 */
export type ProgramLink = {
  url: string;
  state: string | null;
  checkedAt: string | null;
};

/** 絞り込みチップ1つ分のカテゴリー（CSC_個人向けカテゴリー）。名前は /v1/tags から。 */
export type ProgramCategory<Code extends string = string> = {
  code: Code;
  name: string;
};

/** CC BY 4.0 の出典表記。制度を出す画面には必ず出す。 */
export type Attribution = {
  source: string;
  license: string;
  licenseUrl: string;
  notice: string;
};
