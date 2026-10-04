import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createConfirmedUser,
  deleteUser,
  signInAsClient,
} from "./support/supabase";

const PASSWORD = "Test-Password-123!";

describe("レシピの書き込み関数", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;
  let memberAId: string;
  let memberCId: string;
  let clientA: SupabaseClient;
  let clientC: SupabaseClient;
  let clientOutsider: SupabaseClient;

  const emailA = `wa-${runId}@example.test`;
  const emailC = `wc-${runId}@example.test`;
  const emailOutsider = `wo-${runId}@example.test`;
  const userIds: string[] = [];

  beforeAll(async () => {
    const { data: families, error: familiesError } = await admin
      .from("families")
      .insert([{ name: `WriteFnF1-${runId}` }, { name: `WriteFnF2-${runId}` }])
      .select("id, name");
    if (familiesError || !families)
      throw new Error(`failed to create families: ${familiesError?.message}`);
    familyF1 = families.find((f) => f.name.startsWith("WriteFnF1"))?.id;
    familyF2 = families.find((f) => f.name.startsWith("WriteFnF2"))?.id;

    const [a, c, outsider] = await Promise.all([
      createConfirmedUser(admin, emailA, PASSWORD),
      createConfirmedUser(admin, emailC, PASSWORD),
      createConfirmedUser(admin, emailOutsider, PASSWORD),
    ]);
    userIds.push(a.id, c.id, outsider.id);

    const { data: members, error: membersError } = await admin
      .from("family_members")
      .insert([
        { family_id: familyF1, user_id: a.id, display_name: "A" },
        { family_id: familyF2, user_id: c.id, display_name: "C" },
      ])
      .select("id, user_id");
    if (membersError || !members)
      throw new Error(`failed to seed members: ${membersError?.message}`);
    memberAId = members.find((m) => m.user_id === a.id)?.id;
    memberCId = members.find((m) => m.user_id === c.id)?.id;

    [clientA, clientC, clientOutsider] = await Promise.all([
      signInAsClient(emailA, PASSWORD),
      signInAsClient(emailC, PASSWORD),
      signInAsClient(emailOutsider, PASSWORD),
    ]);
  });

  afterAll(async () => {
    await admin
      .from("recipe_ingredients")
      .delete()
      .in("family_id", [familyF1, familyF2]);
    await admin.from("recipes").delete().in("family_id", [familyF1, familyF2]);
    await admin.from("tasks").delete().in("family_id", [familyF1, familyF2]);
    await admin.from("families").delete().in("id", [familyF1, familyF2]);
    await Promise.all(userIds.map((id) => deleteUser(admin, id)));
  });

  /** service_role で直接レシピと材料を用意する。 */
  async function seedRecipe(
    familyId: string,
    memberId: string,
    ingredientNames: string[],
  ): Promise<{ recipeId: string; ingredientIds: string[] }> {
    const recipeId = randomUUID();
    const { error } = await admin.from("recipes").insert({
      id: recipeId,
      family_id: familyId,
      title: "元のタイトル",
      created_by: memberId,
    });
    if (error) throw new Error(`failed to seed recipe: ${error.message}`);

    const rows = ingredientNames.map((name, index) => ({
      id: randomUUID(),
      recipe_id: recipeId,
      family_id: familyId,
      name,
      sort_order: index,
    }));
    if (rows.length > 0) {
      const { error: ingredientsError } = await admin
        .from("recipe_ingredients")
        .insert(rows);
      if (ingredientsError)
        throw new Error(
          `failed to seed ingredients: ${ingredientsError.message}`,
        );
    }
    return { recipeId, ingredientIds: rows.map((row) => row.id) };
  }

  async function ingredientsOf(recipeId: string) {
    const { data, error } = await admin
      .from("recipe_ingredients")
      .select("id, name, quantity, sort_order, task_id, family_id")
      .eq("recipe_id", recipeId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async function liveTasksOf(familyId: string) {
    const { data, error } = await admin
      .from("tasks")
      .select("id, title, is_purchase, sort_order, created_by")
      .eq("family_id", familyId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  describe("create_recipe", () => {
    it("レシピと材料を、呼び出した人の家族に並び順どおり作る", async () => {
      const id = randomUUID();
      const { error } = await clientA.rpc("create_recipe", {
        p_id: id,
        p_title: "カレー",
        p_source_url: "https://example.test/curry",
        p_source_text: "",
        p_note: "",
        p_ingredients: [
          { name: "にんじん", quantity: "1本" },
          { name: "じゃがいも", quantity: "" },
        ],
      });
      expect(error).toBeNull();

      const { data: recipe } = await admin
        .from("recipes")
        .select("family_id, title, source_url, source_text, note, created_by")
        .eq("id", id)
        .single();
      expect(recipe).toEqual({
        family_id: familyF1,
        title: "カレー",
        source_url: "https://example.test/curry",
        source_text: null,
        note: null,
        created_by: memberAId,
      });

      const ingredients = await ingredientsOf(id);
      expect(
        ingredients.map((row) => [row.name, row.quantity, row.sort_order]),
      ).toEqual([
        ["にんじん", "1本", 0],
        ["じゃがいも", null, 1],
      ]);
      expect(ingredients.every((row) => row.family_id === familyF1)).toBe(true);
    });

    it("画像のURLを保存し、渡さなければ null のままにする", async () => {
      const withImage = randomUUID();
      const withoutImage = randomUUID();
      const base = {
        p_title: "画像つき",
        p_source_url: "https://example.test/curry",
        p_source_text: "",
        p_note: "",
        p_ingredients: [],
      };

      const { error } = await clientA.rpc("create_recipe", {
        ...base,
        p_id: withImage,
        p_image_url: "https://cdn.example.test/curry.jpg",
      });
      expect(error).toBeNull();
      const { error: omittedError } = await clientA.rpc("create_recipe", {
        ...base,
        p_id: withoutImage,
      });
      expect(omittedError).toBeNull();

      const { data } = await admin
        .from("recipes")
        .select("id, image_url")
        .in("id", [withImage, withoutImage]);
      expect(data?.find((row) => row.id === withImage)?.image_url).toBe(
        "https://cdn.example.test/curry.jpg",
      );
      expect(
        data?.find((row) => row.id === withoutImage)?.image_url,
      ).toBeNull();
    });

    it("https 以外の画像URLは保存できない", async () => {
      const id = randomUUID();
      const { error } = await clientA.rpc("create_recipe", {
        p_id: id,
        p_title: "不正な画像",
        p_source_url: "",
        p_source_text: "",
        p_note: "",
        p_ingredients: [],
        p_image_url: "javascript:alert(1)",
      });
      expect(error).not.toBeNull();

      const { data } = await admin.from("recipes").select("id").eq("id", id);
      expect(data).toEqual([]);
    });

    it("材料の登録に失敗したら、レシピも残らない", async () => {
      const id = randomUUID();
      const { error } = await clientA.rpc("create_recipe", {
        p_id: id,
        p_title: "失敗するレシピ",
        p_source_url: "",
        p_source_text: "",
        p_note: "",
        // 空の材料名は recipe_ingredients の CHECK 制約に違反する
        p_ingredients: [
          { name: "たまねぎ", quantity: "" },
          { name: "", quantity: "" },
        ],
      });
      expect(error).not.toBeNull();

      const { data } = await admin.from("recipes").select("id").eq("id", id);
      expect(data).toEqual([]);
      expect(await ingredientsOf(id)).toEqual([]);
    });

    it("どの家族にも属さないユーザーは作れない", async () => {
      const id = randomUUID();
      const { error } = await clientOutsider.rpc("create_recipe", {
        p_id: id,
        p_title: "部外者のレシピ",
        p_source_url: "",
        p_source_text: "",
        p_note: "",
        p_ingredients: [],
      });
      expect(error?.message).toContain("not_a_family_member");

      const { data } = await admin.from("recipes").select("id").eq("id", id);
      expect(data).toEqual([]);
    });
  });

  describe("update_recipe", () => {
    it("画像のURLを置き換え、空文字列なら消す", async () => {
      const { recipeId } = await seedRecipe(familyF1, memberAId, []);
      const base = {
        p_recipe_id: recipeId,
        p_title: "画像を替える",
        p_source_url: "https://example.test/curry",
        p_source_text: "",
        p_note: "",
        p_ingredients: [],
      };
      async function imageUrl() {
        const { data } = await admin
          .from("recipes")
          .select("image_url")
          .eq("id", recipeId)
          .single();
        return data?.image_url;
      }

      const { error } = await clientA.rpc("update_recipe", {
        ...base,
        p_image_url: "https://cdn.example.test/new.jpg",
      });
      expect(error).toBeNull();
      expect(await imageUrl()).toBe("https://cdn.example.test/new.jpg");

      const { error: clearError } = await clientA.rpc("update_recipe", {
        ...base,
        p_image_url: "",
      });
      expect(clearError).toBeNull();
      expect(await imageUrl()).toBeNull();
    });

    it("既存の材料は task_id を保って更新し、渡されなかった材料は消し、新しい材料を足す", async () => {
      const { recipeId, ingredientIds } = await seedRecipe(
        familyF1,
        memberAId,
        ["残す", "消す"],
      );
      const [keepId, dropId] = ingredientIds;
      const { data: task } = await admin
        .from("tasks")
        .insert({
          family_id: familyF1,
          title: "残す",
          is_purchase: true,
          sort_order: 900,
          created_by: memberAId,
        })
        .select("id")
        .single();
      await admin
        .from("recipe_ingredients")
        .update({ task_id: task?.id })
        .eq("id", keepId);

      const { error } = await clientA.rpc("update_recipe", {
        p_recipe_id: recipeId,
        p_title: "新しいタイトル",
        p_source_url: "",
        p_source_text: "本文",
        p_note: "メモ",
        p_ingredients: [
          { name: "新しい材料", quantity: "2個" },
          { id: keepId, name: "残す(改)", quantity: "" },
        ],
      });
      expect(error).toBeNull();

      const { data: recipe } = await admin
        .from("recipes")
        .select("title, source_text, note")
        .eq("id", recipeId)
        .single();
      expect(recipe).toEqual({
        title: "新しいタイトル",
        source_text: "本文",
        note: "メモ",
      });

      const ingredients = await ingredientsOf(recipeId);
      expect(ingredients.map((row) => [row.name, row.sort_order])).toEqual([
        ["新しい材料", 0],
        ["残す(改)", 1],
      ]);
      expect(ingredients.find((row) => row.id === keepId)?.task_id).toBe(
        task?.id,
      );
      expect(ingredients.some((row) => row.id === dropId)).toBe(false);
    });

    it("材料の更新に失敗したら、タイトルも材料の削除も巻き戻る", async () => {
      const { recipeId, ingredientIds } = await seedRecipe(
        familyF1,
        memberAId,
        ["消されるはずだった材料"],
      );

      const { error } = await clientA.rpc("update_recipe", {
        p_recipe_id: recipeId,
        p_title: "書き換わらないタイトル",
        p_source_url: "",
        p_source_text: "",
        p_note: "",
        p_ingredients: [{ name: "", quantity: "" }],
      });
      expect(error).not.toBeNull();

      const { data: recipe } = await admin
        .from("recipes")
        .select("title")
        .eq("id", recipeId)
        .single();
      expect(recipe?.title).toBe("元のタイトル");
      expect((await ingredientsOf(recipeId)).map((row) => row.id)).toEqual(
        ingredientIds,
      );
    });

    it("他の家族のレシピは更新できない", async () => {
      const { recipeId } = await seedRecipe(familyF2, memberCId, ["F2の材料"]);

      const { error } = await clientA.rpc("update_recipe", {
        p_recipe_id: recipeId,
        p_title: "乗っ取り",
        p_source_url: "",
        p_source_text: "",
        p_note: "",
        p_ingredients: [],
      });
      expect(error?.message).toContain("recipe_not_found");

      const { data: recipe } = await admin
        .from("recipes")
        .select("title")
        .eq("id", recipeId)
        .single();
      expect(recipe?.title).toBe("元のタイトル");
      expect(await ingredientsOf(recipeId)).toHaveLength(1);
    });
  });

  describe("add_ingredients_to_purchases", () => {
    it("材料の並び順で「買うもの」を作り、材料に task_id を残す", async () => {
      const { recipeId, ingredientIds } = await seedRecipe(
        familyF1,
        memberAId,
        ["一番目", "二番目", "選ばない"],
      );
      const maxBefore = Math.max(
        0,
        ...(await liveTasksOf(familyF1)).map((task) => task.sort_order),
      );

      // 並び順と逆に渡しても、材料の並び順で作られる
      const { data: taskIds, error } = await clientA.rpc(
        "add_ingredients_to_purchases",
        {
          p_recipe_id: recipeId,
          p_ingredient_ids: [ingredientIds[1], ingredientIds[0]],
        },
      );
      expect(error).toBeNull();
      expect(taskIds).toHaveLength(2);

      const created = (await liveTasksOf(familyF1)).filter((task) =>
        taskIds.includes(task.id),
      );
      expect(
        created.map((task) => [
          task.title,
          task.is_purchase,
          task.sort_order,
          task.created_by,
        ]),
      ).toEqual([
        ["一番目", true, maxBefore + 1, memberAId],
        ["二番目", true, maxBefore + 2, memberAId],
      ]);

      const ingredients = await ingredientsOf(recipeId);
      expect(ingredients.map((row) => row.task_id)).toEqual([
        taskIds[0],
        taskIds[1],
        null,
      ]);
    });

    it("レシピに無い材料が混ざっていたら、タスクを1つも作らない", async () => {
      const { recipeId, ingredientIds } = await seedRecipe(
        familyF1,
        memberAId,
        ["ある材料"],
      );
      const before = await liveTasksOf(familyF1);

      const { error } = await clientA.rpc("add_ingredients_to_purchases", {
        p_recipe_id: recipeId,
        p_ingredient_ids: [ingredientIds[0], randomUUID()],
      });
      expect(error?.message).toContain("ingredients_not_found");

      expect(await liveTasksOf(familyF1)).toEqual(before);
      expect((await ingredientsOf(recipeId))[0].task_id).toBeNull();
    });

    it("他の家族のレシピの材料は追加できない", async () => {
      const { recipeId, ingredientIds } = await seedRecipe(
        familyF2,
        memberCId,
        ["F2の材料"],
      );
      const before = await liveTasksOf(familyF1);

      const { error } = await clientA.rpc("add_ingredients_to_purchases", {
        p_recipe_id: recipeId,
        p_ingredient_ids: ingredientIds,
      });
      expect(error?.message).toContain("ingredients_not_found");

      expect(await liveTasksOf(familyF1)).toEqual(before);
      expect(await liveTasksOf(familyF2)).toEqual([]);
    });

    it("同時に追加しても sort_order が重ならない", async () => {
      const first = await seedRecipe(familyF1, memberAId, ["同時A1", "同時A2"]);
      const second = await seedRecipe(familyF1, memberAId, [
        "同時B1",
        "同時B2",
      ]);

      const results = await Promise.all([
        clientA.rpc("add_ingredients_to_purchases", {
          p_recipe_id: first.recipeId,
          p_ingredient_ids: first.ingredientIds,
        }),
        clientA.rpc("add_ingredients_to_purchases", {
          p_recipe_id: second.recipeId,
          p_ingredient_ids: second.ingredientIds,
        }),
      ]);
      expect(results.map((result) => result.error)).toEqual([null, null]);

      const sortOrders = (await liveTasksOf(familyF1)).map(
        (task) => task.sort_order,
      );
      expect(new Set(sortOrders).size).toBe(sortOrders.length);
    });
  });

  describe("undo_add_ingredients_to_purchases", () => {
    it("作ったタスクを論理削除し、材料の task_id を外す", async () => {
      const { recipeId, ingredientIds } = await seedRecipe(
        familyF1,
        memberAId,
        ["取り消す材料"],
      );
      const { data: taskIds } = await clientA.rpc(
        "add_ingredients_to_purchases",
        { p_recipe_id: recipeId, p_ingredient_ids: ingredientIds },
      );

      const { error } = await clientA.rpc("undo_add_ingredients_to_purchases", {
        p_task_ids: taskIds,
      });
      expect(error).toBeNull();

      const { data: tasks } = await admin
        .from("tasks")
        .select("deleted_at")
        .in("id", taskIds);
      expect(tasks?.every((task) => task.deleted_at !== null)).toBe(true);
      expect((await ingredientsOf(recipeId))[0].task_id).toBeNull();
    });

    it("他の家族のタスクは取り消せない", async () => {
      const { recipeId, ingredientIds } = await seedRecipe(
        familyF2,
        memberCId,
        ["F2が追加した材料"],
      );
      const { data: taskIds } = await clientC.rpc(
        "add_ingredients_to_purchases",
        { p_recipe_id: recipeId, p_ingredient_ids: ingredientIds },
      );

      const { error } = await clientA.rpc("undo_add_ingredients_to_purchases", {
        p_task_ids: taskIds,
      });
      expect(error).toBeNull();

      const { data: tasks } = await admin
        .from("tasks")
        .select("deleted_at")
        .in("id", taskIds);
      expect(tasks?.every((task) => task.deleted_at === null)).toBe(true);
      expect((await ingredientsOf(recipeId))[0].task_id).toBe(taskIds[0]);
    });
  });
});
