"use server";

import { z } from "zod";
import { requireFamilyMember } from "@/features/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { getAreas } from "./api";

export type ActionResult = { ok: true } | { ok: false; error: string };

// 空文字列 = 設定を外す（children.schema と同じ規約）。
const updateFamilyMunicipalitySchema = z.object({
  code: z.union([z.string().regex(/^\d{6}$/), z.literal("")]),
});

/**
 * 家族の自治体を設定する。名前はクライアントから受け取らず、seido-data-hub の
 * 自治体一覧から引いて保存する（一覧に無いコードは弾く）。
 */
export async function updateFamilyMunicipality(input: {
  code: string;
}): Promise<ActionResult> {
  const parsed = updateFamilyMunicipalitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "自治体を選び直してください" };
  }

  const { member } = await requireFamilyMember();

  let name: string | null = null;
  if (parsed.data.code !== "") {
    const areas = await getAreas();
    if (!areas.ok) {
      return {
        ok: false,
        error: "自治体の一覧を取得できませんでした。時間をおいて試してください",
      };
    }
    const area = areas.data.find((a) => a.code === parsed.data.code);
    if (!area) {
      return { ok: false, error: "この自治体は選べません" };
    }
    name = area.name;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("families")
    .update({
      municipality_code: name === null ? null : parsed.data.code,
      municipality_name: name,
    })
    .eq("id", member.familyId);

  if (error) {
    return { ok: false, error: "自治体の保存に失敗しました" };
  }

  return { ok: true };
}
