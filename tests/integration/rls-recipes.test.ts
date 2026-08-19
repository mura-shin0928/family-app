import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createAnonClient,
  createConfirmedUser,
  deleteUser,
  signInAsClient,
} from "./support/supabase";

const PASSWORD = "Test-Password-123!";

describe("recipes / recipe_ingredients RLS", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;
  let memberAId: string;
  let memberBId: string;
  let memberCId: string;
  let taskF1: string;
  let taskF2: string;
  let recipeF1: string;
  let recipeF2: string;
  let ingredientF1: string;
  let ingredientF2: string;

  const userA = { email: `ra-${runId}@example.test` };
  const userB = { email: `rb-${runId}@example.test` };
  const userC = { email: `rc-${runId}@example.test` };
  const userIds: Record<string, string> = {};

  beforeAll(async () => {
    const { data: f1, error: f1Error } = await admin
      .from("families")
      .insert({ name: `RecipesF1-${runId}` })
      .select("id")
      .single();
    if (f1Error || !f1)
      throw new Error(`failed to create F1: ${f1Error?.message}`);
    familyF1 = f1.id;

    const { data: f2, error: f2Error } = await admin
      .from("families")
      .insert({ name: `RecipesF2-${runId}` })
      .select("id")
      .single();
    if (f2Error || !f2)
      throw new Error(`failed to create F2: ${f2Error?.message}`);
    familyF2 = f2.id;

    const created = await Promise.all([
      createConfirmedUser(admin, userA.email, PASSWORD),
      createConfirmedUser(admin, userB.email, PASSWORD),
      createConfirmedUser(admin, userC.email, PASSWORD),
    ]);
    for (const u of created) userIds[u.email] = u.id;

    const { data: members, error: membersError } = await admin
      .from("family_members")
      .insert([
        { family_id: familyF1, email: userA.email, display_name: "A" },
        { family_id: familyF1, email: userB.email, display_name: "B" },
        { family_id: familyF2, email: userC.email, display_name: "C" },
      ])
      .select("id, email");
    if (membersError || !members)
      throw new Error(
        `failed to seed family_members: ${membersError?.message}`,
      );

    const findMemberId = (email: string): string => {
      const member = members.find((m) => m.email === email);
      if (!member)
        throw new Error(`seeded family_members row missing for ${email}`);
      return member.id;
    };
    memberAId = findMemberId(userA.email);
    memberBId = findMemberId(userB.email);
    memberCId = findMemberId(userC.email);

    await Promise.all([
      signInAsClient(userA.email, PASSWORD).then((c) =>
        c.rpc("claim_membership"),
      ),
      signInAsClient(userB.email, PASSWORD).then((c) =>
        c.rpc("claim_membership"),
      ),
      signInAsClient(userC.email, PASSWORD).then((c) =>
        c.rpc("claim_membership"),
      ),
    ]);

    const { data: t1, error: t1Error } = await admin
      .from("tasks")
      .insert({
        family_id: familyF1,
        title: "F1のタスク",
        sort_order: 1,
        created_by: memberAId,
      })
      .select("id")
      .single();
    if (t1Error || !t1)
      throw new Error(`failed to seed F1 task: ${t1Error?.message}`);
    taskF1 = t1.id;

    const { data: t2, error: t2Error } = await admin
      .from("tasks")
      .insert({
        family_id: familyF2,
        title: "F2のタスク",
        sort_order: 1,
        created_by: memberCId,
      })
      .select("id")
      .single();
    if (t2Error || !t2)
      throw new Error(`failed to seed F2 task: ${t2Error?.message}`);
    taskF2 = t2.id;

    const { data: r1, error: r1Error } = await admin
      .from("recipes")
      .insert({
        family_id: familyF1,
        title: "F1のレシピ",
        created_by: memberAId,
      })
      .select("id")
      .single();
    if (r1Error || !r1)
      throw new Error(`failed to seed F1 recipe: ${r1Error?.message}`);
    recipeF1 = r1.id;

    const { data: r2, error: r2Error } = await admin
      .from("recipes")
      .insert({
        family_id: familyF2,
        title: "F2のレシピ",
        created_by: memberCId,
      })
      .select("id")
      .single();
    if (r2Error || !r2)
      throw new Error(`failed to seed F2 recipe: ${r2Error?.message}`);
    recipeF2 = r2.id;

    const { data: i1, error: i1Error } = await admin
      .from("recipe_ingredients")
      .insert({
        recipe_id: recipeF1,
        family_id: familyF1,
        name: "鶏もも肉",
        quantity: "300g",
        sort_order: 1,
      })
      .select("id")
      .single();
    if (i1Error || !i1)
      throw new Error(`failed to seed F1 ingredient: ${i1Error?.message}`);
    ingredientF1 = i1.id;

    const { data: i2, error: i2Error } = await admin
      .from("recipe_ingredients")
      .insert({
        recipe_id: recipeF2,
        family_id: familyF2,
        name: "白菜",
        quantity: "1/4個",
        sort_order: 1,
      })
      .select("id")
      .single();
    if (i2Error || !i2)
      throw new Error(`failed to seed F2 ingredient: ${i2Error?.message}`);
    ingredientF2 = i2.id;
  });

  afterAll(async () => {
    await admin
      .from("recipe_ingredients")
      .delete()
      .in("family_id", [familyF1, familyF2]);
    await admin.from("recipes").delete().in("family_id", [familyF1, familyF2]);
    await admin.from("tasks").delete().in("family_id", [familyF1, familyF2]);
    await Promise.all(
      Object.values(userIds).map((id) => deleteUser(admin, id)),
    );
    await admin.from("families").delete().in("id", [familyF1, familyF2]);
  });

  describe("recipes", () => {
    it("a member can select their own family's recipes but not another family's", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data: ownRecipes, error: ownError } = await clientA
        .from("recipes")
        .select("id")
        .eq("family_id", familyF1);
      expect(ownError).toBeNull();
      expect(ownRecipes?.map((r) => r.id)).toContain(recipeF1);

      const { data: otherRecipes, error: otherError } = await clientA
        .from("recipes")
        .select("id")
        .eq("id", recipeF2);
      expect(otherError).toBeNull();
      expect(otherRecipes).toHaveLength(0);
    });

    it("a member can insert a recipe into their own family", async () => {
      const clientB = await signInAsClient(userB.email, PASSWORD);

      const { data, error } = await clientB
        .from("recipes")
        .insert({
          family_id: familyF1,
          title: "Bが追加したレシピ",
          created_by: memberBId,
        })
        .select("id")
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBeTruthy();
    });

    it("cannot insert a recipe into another family", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("recipes").insert({
        family_id: familyF2,
        title: "なりすまし挿入",
        created_by: memberAId,
      });

      expect(error).not.toBeNull();
    });

    it("cannot insert with created_by pointing at another family's member", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("recipes").insert({
        family_id: familyF1,
        title: "created_byなりすまし",
        created_by: memberCId,
      });

      expect(error).not.toBeNull();
    });

    it("a member can update their own family's recipe", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA
        .from("recipes")
        .update({ note: "メモを追加" })
        .eq("id", recipeF1);
      expect(error).toBeNull();

      const { data } = await admin
        .from("recipes")
        .select("note")
        .eq("id", recipeF1)
        .single();
      expect(data?.note).toBe("メモを追加");
    });

    it("cannot update another family's recipe", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data, error } = await clientA
        .from("recipes")
        .update({ title: "改ざん" })
        .eq("id", recipeF2)
        .select("id");

      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      const { data: check } = await admin
        .from("recipes")
        .select("title")
        .eq("id", recipeF2)
        .single();
      expect(check?.title).toBe("F2のレシピ");
    });

    it("can soft-delete (update deleted_at) their own family's recipe", async () => {
      const clientB = await signInAsClient(userB.email, PASSWORD);

      const { data: created, error: createError } = await admin
        .from("recipes")
        .insert({
          family_id: familyF1,
          title: "削除予定",
          created_by: memberBId,
        })
        .select("id")
        .single();
      if (createError || !created)
        throw new Error(`failed to seed recipe: ${createError?.message}`);

      const { error } = await clientB
        .from("recipes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", created.id);
      expect(error).toBeNull();

      const { data: check } = await admin
        .from("recipes")
        .select("deleted_at")
        .eq("id", created.id)
        .single();
      expect(check?.deleted_at).not.toBeNull();
    });

    it("no client can hard-delete a recipe (no delete policy)", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA
        .from("recipes")
        .delete()
        .eq("id", recipeF1);
      expect(error).not.toBeNull();

      const { data: check } = await admin
        .from("recipes")
        .select("id")
        .eq("id", recipeF1)
        .single();
      expect(check?.id).toBe(recipeF1);
    });

    it("an unauthenticated client sees no recipes", async () => {
      const anon = createAnonClient();
      const { data, error } = await anon
        .from("recipes")
        .select("id")
        .eq("family_id", familyF1);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });

  describe("recipe_ingredients", () => {
    it("a member can select their own family's ingredients but not another family's", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data: ownIngredients, error: ownError } = await clientA
        .from("recipe_ingredients")
        .select("id")
        .eq("family_id", familyF1);
      expect(ownError).toBeNull();
      expect(ownIngredients?.map((i) => i.id)).toContain(ingredientF1);

      const { data: otherIngredients, error: otherError } = await clientA
        .from("recipe_ingredients")
        .select("id")
        .eq("id", ingredientF2);
      expect(otherError).toBeNull();
      expect(otherIngredients).toHaveLength(0);
    });

    it("a member can insert an ingredient into their own family's recipe", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data, error } = await clientA
        .from("recipe_ingredients")
        .insert({
          recipe_id: recipeF1,
          family_id: familyF1,
          name: "醤油",
          quantity: "大さじ2",
          sort_order: 2,
        })
        .select("id")
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBeTruthy();
    });

    it("cannot insert an ingredient with family_id spoofed to another family", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("recipe_ingredients").insert({
        recipe_id: recipeF1,
        family_id: familyF2,
        name: "なりすまし材料",
        sort_order: 99,
      });

      expect(error).not.toBeNull();
    });

    it("cannot insert an ingredient whose recipe_id belongs to another family", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("recipe_ingredients").insert({
        recipe_id: recipeF2,
        family_id: familyF1,
        name: "recipe_idなりすまし",
        sort_order: 99,
      });

      expect(error).not.toBeNull();
    });

    it("cannot insert an ingredient whose task_id belongs to another family", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("recipe_ingredients").insert({
        recipe_id: recipeF1,
        family_id: familyF1,
        name: "task_idなりすまし",
        sort_order: 99,
        task_id: taskF2,
      });

      expect(error).not.toBeNull();
    });

    it("can insert an ingredient linked to a task in the same family", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data, error } = await clientA
        .from("recipe_ingredients")
        .insert({
          recipe_id: recipeF1,
          family_id: familyF1,
          name: "買うものに紐づく材料",
          sort_order: 3,
          task_id: taskF1,
        })
        .select("id")
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBeTruthy();
    });

    it("a member can update their own family's ingredient", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA
        .from("recipe_ingredients")
        .update({ quantity: "400g" })
        .eq("id", ingredientF1);
      expect(error).toBeNull();

      const { data } = await admin
        .from("recipe_ingredients")
        .select("quantity")
        .eq("id", ingredientF1)
        .single();
      expect(data?.quantity).toBe("400g");
    });

    it("cannot update another family's ingredient", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data, error } = await clientA
        .from("recipe_ingredients")
        .update({ name: "改ざん" })
        .eq("id", ingredientF2)
        .select("id");

      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      const { data: check } = await admin
        .from("recipe_ingredients")
        .select("name")
        .eq("id", ingredientF2)
        .single();
      expect(check?.name).toBe("白菜");
    });

    it("a member can hard-delete their own family's ingredient", async () => {
      const clientB = await signInAsClient(userB.email, PASSWORD);

      const { data: created, error: createError } = await admin
        .from("recipe_ingredients")
        .insert({
          recipe_id: recipeF1,
          family_id: familyF1,
          name: "削除予定",
          sort_order: 4,
        })
        .select("id")
        .single();
      if (createError || !created)
        throw new Error(`failed to seed ingredient: ${createError?.message}`);

      const { error } = await clientB
        .from("recipe_ingredients")
        .delete()
        .eq("id", created.id);
      expect(error).toBeNull();

      const { data: check } = await admin
        .from("recipe_ingredients")
        .select("id")
        .eq("id", created.id)
        .maybeSingle();
      expect(check).toBeNull();
    });

    it("cannot delete another family's ingredient", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data, error } = await clientA
        .from("recipe_ingredients")
        .delete()
        .eq("id", ingredientF2)
        .select("id");

      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      const { data: check } = await admin
        .from("recipe_ingredients")
        .select("id")
        .eq("id", ingredientF2)
        .single();
      expect(check?.id).toBe(ingredientF2);
    });

    it("an unauthenticated client sees no ingredients", async () => {
      const anon = createAnonClient();
      const { data, error } = await anon
        .from("recipe_ingredients")
        .select("id")
        .eq("family_id", familyF1);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });
});
