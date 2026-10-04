/**
 * 画像URLを持たない既存レシピに、取り込み元ページの代表画像のURLを埋める（一度きりの後付け用）。
 *
 *   npm run backfill:recipe-images            # 対象と取得結果を表示するだけ
 *   npm run backfill:recipe-images -- --yes   # 書き込む
 *
 * 接続先と service role key は scripts/admin.mts と同じ .env.admin.local から読む。
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { isSnsHost } from "../src/features/recipes/extraction/detect";
import { fetchHtml } from "../src/features/recipes/extraction/fetch-html";
import { extractImageUrl } from "../src/features/recipes/extraction/image-url";

const FETCH_DEADLINE_MS = 10_000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です。");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { values } = parseArgs({
    options: { yes: { type: "boolean", default: false } },
  });

  console.log(`接続先: ${SUPABASE_URL}`);

  const { data: recipes, error } = await admin
    .from("recipes")
    .select("id, title, source_url")
    .not("source_url", "is", null)
    .is("image_url", null)
    .is("deleted_at", null)
    .order("created_at");
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  let found = 0;
  for (const recipe of recipes ?? []) {
    const sourceUrl = recipe.source_url as string;
    let imageUrl: string | null = null;
    if (!isSnsHost(sourceUrl)) {
      const fetched = await fetchHtml(sourceUrl, {
        deadlineAt: Date.now() + FETCH_DEADLINE_MS,
      });
      if (fetched.ok) imageUrl = extractImageUrl(fetched.html, sourceUrl);
    }

    console.log(`${imageUrl ? "○" : "×"} ${recipe.title}\n    ${sourceUrl}`);
    if (!imageUrl) continue;
    console.log(`    → ${imageUrl}`);
    found += 1;

    if (values.yes) {
      const { error: updateError } = await admin
        .from("recipes")
        .update({ image_url: imageUrl })
        .eq("id", recipe.id)
        .is("image_url", null);
      if (updateError) {
        console.error(`    更新に失敗しました: ${updateError.message}`);
        process.exit(1);
      }
    }
  }

  console.log(`\n対象 ${recipes?.length ?? 0} 件中、画像あり ${found} 件`);
  console.log(
    values.yes
      ? "書き込みました。"
      : "何も変更していません。書き込むには --yes を付けてください。",
  );
}

await main();
