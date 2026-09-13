import "server-only";
import { z } from "zod";
import type { Area, Attribution, Program, ProgramCategory } from "./types";

/**
 * seido-data-hub（子育て支援制度レジストリを配る別プロダクトの API）の読み取り。
 * 呼ぶのはサーバー側だけ（CORS 不要・URL を画面に出さない）。
 *
 * 取得結果は1日キャッシュする。レジストリは2025年8月で更新が止まっており、
 * 変わるのは seido-data-hub 側の週1の更新（S2 以降）だけなので、開くたびに
 * Lambda の起動と DB 接続を待たせる理由が無い。
 */
const REVALIDATE_SECONDS = 60 * 60 * 24;

const attributionSchema = z.object({
  source: z.string(),
  license: z.string(),
  license_url: z.string(),
  notice: z.string(),
});

const areaSchema = z.object({
  code: z.string(),
  name: z.string(),
  parent_code: z.string().nullable(),
});

const programSchema = z.object({
  id: z.string(),
  area_code: z.string(),
  canonical_name: z.string(),
  short_name: z.string().nullable(),
  source_url: z.string(),
  category_codes: z.array(z.string()),
  target_codes: z.array(z.string()),
  age_min_months: z.number().int().nullable(),
  age_max_months: z.number().int().nullable(),
});

export type SeidoResult<T> =
  | { ok: true; data: T; attribution: Attribution }
  | { ok: false; reason: "not-configured" | "unavailable" };

async function get<T>(
  path: string,
  dataSchema: z.ZodType<T>,
): Promise<SeidoResult<T>> {
  const baseUrl = process.env.SEIDO_DATA_HUB_API_URL;
  if (!baseUrl) {
    return { ok: false, reason: "not-configured" };
  }

  try {
    const response = await fetch(new URL(path, baseUrl), {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      console.error(`seido-data-hub ${path}: HTTP ${response.status}`);
      return { ok: false, reason: "unavailable" };
    }
    // データを返すレスポンスには必ず出典表記が付く（seido-data-hub の約束）
    const parsed = z
      .object({ data: dataSchema, attribution: attributionSchema })
      .safeParse(await response.json());
    if (!parsed.success) {
      console.error(`seido-data-hub ${path}: unexpected body`, parsed.error);
      return { ok: false, reason: "unavailable" };
    }
    return {
      ok: true,
      data: parsed.data.data,
      attribution: toAttribution(parsed.data.attribution),
    };
  } catch (error) {
    console.error(`seido-data-hub ${path}: request failed`, error);
    return { ok: false, reason: "unavailable" };
  }
}

function toAttribution(raw: z.infer<typeof attributionSchema>): Attribution {
  return {
    source: raw.source,
    license: raw.license,
    licenseUrl: raw.license_url,
    notice: raw.notice,
  };
}

const tagSchema = z.object({ code: z.string(), name: z.string() });

/**
 * 画面のチップに出すカテゴリーの名前を /v1/tags から引く。どのコードを出すかは
 * family-app が決め（filter.ts の PROGRAM_CATEGORY_CODES）、名前はレジストリの語彙を
 * 持つ seido-data-hub に任せる。対象者・コンテンツタイプの名前は使わないので読まない。
 * 渡したコードが一覧に無ければ（API とずれていれば）取得できなかった扱いにする。
 */
export async function getProgramCategories<Code extends string>(
  codes: readonly Code[],
): Promise<SeidoResult<ProgramCategory<Code>[]>> {
  const result = await get(
    "/v1/tags",
    z.object({ categories: z.array(tagSchema) }),
  );
  if (!result.ok) return result;
  const nameByCode = new Map(
    result.data.categories.map((tag) => [tag.code, tag.name]),
  );
  const categories: ProgramCategory<Code>[] = [];
  for (const code of codes) {
    const name = nameByCode.get(code);
    if (name === undefined) {
      console.error(`seido-data-hub /v1/tags: category ${code} is missing`);
      return { ok: false, reason: "unavailable" };
    }
    categories.push({ code, name });
  }
  return { ...result, data: categories };
}

export async function getAreas(): Promise<SeidoResult<Area[]>> {
  const result = await get("/v1/areas", z.array(areaSchema));
  if (!result.ok) return result;
  return {
    ...result,
    data: result.data.map((area) => ({
      code: area.code,
      name: area.name,
      parentCode: area.parent_code,
    })),
  };
}

/**
 * 自治体と、その都道府県の制度をまとめて返す。月齢・カテゴリの絞り込みは
 * 子供のタブを切り替えるたびに取り直さないよう、画面側で行う（filter.ts）。
 */
export async function getAreaPrograms(
  areaCode: string,
): Promise<SeidoResult<Program[]>> {
  const result = await get(
    `/v1/areas/${encodeURIComponent(areaCode)}/programs`,
    z.array(programSchema),
  );
  if (!result.ok) return result;
  return {
    ...result,
    data: result.data.map((program) => ({
      id: program.id,
      areaCode: program.area_code,
      canonicalName: program.canonical_name,
      shortName: program.short_name,
      sourceUrl: program.source_url,
      categoryCodes: program.category_codes,
      targetCodes: program.target_codes,
      ageMinMonths: program.age_min_months,
      ageMaxMonths: program.age_max_months,
    })),
  };
}
