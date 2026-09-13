/** seido-data-hub の自治体。code は6桁の団体コード（例: 小金井市 132101）。 */
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
  sourceUrl: string;
  /** 002 妊娠・出産 / 003 子育て / 004 保育 など。 */
  categoryCodes: string[];
  /** 対象者。086 妊産婦 / 087 子育て中 / 088 ひとり親 など。 */
  targetCodes: string[];
  /** 対象の月齢。age_min_months <= 月齢 < age_max_months。null はその側に制限なし。 */
  ageMinMonths: number | null;
  ageMaxMonths: number | null;
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
