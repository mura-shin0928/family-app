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

describe("タスク・ライフイベント項目の書き込み関数", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;
  let memberAId: string;
  let childF1: string;
  let childF2: string;
  let locationF1: string;
  let locationF2: string;
  let clientA: SupabaseClient;

  const emailA = `ta-${runId}@example.test`;
  const emailC = `tc-${runId}@example.test`;
  const userIds: string[] = [];

  beforeAll(async () => {
    const { data: families, error: familiesError } = await admin
      .from("families")
      .insert([{ name: `TaskFnF1-${runId}` }, { name: `TaskFnF2-${runId}` }])
      .select("id, name");
    if (familiesError || !families)
      throw new Error(`failed to create families: ${familiesError?.message}`);
    familyF1 = families.find((f) => f.name.startsWith("TaskFnF1"))?.id;
    familyF2 = families.find((f) => f.name.startsWith("TaskFnF2"))?.id;

    const [a, c] = await Promise.all([
      createConfirmedUser(admin, emailA, PASSWORD),
      createConfirmedUser(admin, emailC, PASSWORD),
    ]);
    userIds.push(a.id, c.id);

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
    const memberCId = members.find((m) => m.user_id === c.id)?.id;

    const { data: children, error: childrenError } = await admin
      .from("children")
      .insert([
        { family_id: familyF1, display_name: "F1の子", created_by: memberAId },
        { family_id: familyF2, display_name: "F2の子", created_by: memberCId },
      ])
      .select("id, family_id");
    if (childrenError || !children)
      throw new Error(`failed to seed children: ${childrenError?.message}`);
    childF1 = children.find((row) => row.family_id === familyF1)?.id;
    childF2 = children.find((row) => row.family_id === familyF2)?.id;

    const { data: locations, error: locationsError } = await admin
      .from("purchase_locations")
      .insert([
        { family_id: familyF1, name: "スーパー", created_by: memberAId },
        { family_id: familyF2, name: "スーパー", created_by: memberCId },
      ])
      .select("id, family_id");
    if (locationsError || !locations)
      throw new Error(`failed to seed locations: ${locationsError?.message}`);
    locationF1 = locations.find((row) => row.family_id === familyF1)?.id;
    locationF2 = locations.find((row) => row.family_id === familyF2)?.id;

    clientA = await signInAsClient(emailA, PASSWORD);
  });

  afterAll(async () => {
    const familyIds = [familyF1, familyF2];
    await admin.from("tasks").delete().in("family_id", familyIds);
    await admin.from("life_event_items").delete().in("family_id", familyIds);
    await admin.from("purchase_locations").delete().in("family_id", familyIds);
    await admin.from("children").delete().in("family_id", familyIds);
    await admin.from("families").delete().in("id", familyIds);
    await Promise.all(userIds.map((id) => deleteUser(admin, id)));
  });

  async function taskById(id: string) {
    const { data, error } = await admin
      .from("tasks")
      .select(
        "family_id, title, due_on, is_purchase, purchase_location_id, sort_order, created_by, life_event_item_id, note, url",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async function itemsByKey(childId: string, catalogKey: string) {
    const { data, error } = await admin
      .from("life_event_items")
      .select("id, family_id, title, note, status, done_on, created_by")
      .eq("child_id", childId)
      .eq("catalog_key", catalogKey)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async function itemsByTitle(title: string) {
    const { data, error } = await admin
      .from("life_event_items")
      .select("id, child_id, catalog_key, title, status")
      .eq("family_id", familyF1)
      .eq("title", title);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async function maxSortOrder() {
    const { data } = await admin
      .from("tasks")
      .select("sort_order")
      .eq("family_id", familyF1)
      .is("deleted_at", null)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.sort_order ?? 0;
  }

  describe("create_task", () => {
    it("省略できる項目なしで、呼び出した人の家族の末尾に作る", async () => {
      const before = await maxSortOrder();
      const id = randomUUID();
      const { error } = await clientA.rpc("create_task", {
        p_id: id,
        p_title: "牛乳",
        p_is_purchase: true,
      });
      expect(error).toBeNull();

      expect(await taskById(id)).toEqual({
        family_id: familyF1,
        title: "牛乳",
        due_on: null,
        is_purchase: true,
        purchase_location_id: null,
        sort_order: before + 1,
        created_by: memberAId,
        life_event_item_id: null,
        note: null,
        url: null,
      });
    });

    it("期限と自家族の買う場所を付けられる", async () => {
      const id = randomUUID();
      const { error } = await clientA.rpc("create_task", {
        p_id: id,
        p_title: "卵",
        p_is_purchase: true,
        p_due_on: "2026-12-01",
        p_purchase_location_id: locationF1,
      });
      expect(error).toBeNull();

      const task = await taskById(id);
      expect(task?.due_on).toBe("2026-12-01");
      expect(task?.purchase_location_id).toBe(locationF1);
    });

    it("URL とメモを付けられる", async () => {
      const id = randomUUID();
      const { error } = await clientA.rpc("create_task", {
        p_id: id,
        p_title: "気になる投稿",
        p_is_purchase: false,
        p_url: "https://www.instagram.com/p/abc/",
        p_note: "共有されたメモ",
      });
      expect(error).toBeNull();

      const task = await taskById(id);
      expect(task?.url).toBe("https://www.instagram.com/p/abc/");
      expect(task?.note).toBe("共有されたメモ");
    });

    it("他の家族の買う場所は付けられない", async () => {
      const id = randomUUID();
      const { error } = await clientA.rpc("create_task", {
        p_id: id,
        p_title: "他家族の場所",
        p_is_purchase: true,
        p_purchase_location_id: locationF2,
      });
      expect(error?.message).toContain("purchase_location_not_found");
      expect(await taskById(id)).toBeNull();
    });

    it("子を指定すると、その子の記録を in_task で作ってタスクに繋ぐ", async () => {
      const id = randomUUID();
      const title = `予防接種-${runId}-${"あ".repeat(120)}`;
      const { error } = await clientA.rpc("create_task", {
        p_id: id,
        p_title: title,
        p_is_purchase: false,
        p_record_child_id: childF1,
      });
      expect(error).toBeNull();

      const task = await taskById(id);
      expect(task?.life_event_item_id).not.toBeNull();

      const { data: item } = await admin
        .from("life_event_items")
        .select("child_id, catalog_key, title, status, created_by")
        .eq("id", task?.life_event_item_id)
        .single();
      expect(item).toEqual({
        child_id: childF1,
        catalog_key: null,
        // 項目名は100字まで
        title: [...title].slice(0, 100).join(""),
        status: "in_task",
        created_by: memberAId,
      });
    });

    it("他の家族の子は指定できない", async () => {
      const id = randomUUID();
      const { error } = await clientA.rpc("create_task", {
        p_id: id,
        p_title: "他家族の子",
        p_is_purchase: false,
        p_record_child_id: childF2,
      });
      expect(error?.message).toContain("child_not_found");
      expect(await taskById(id)).toBeNull();
    });

    it("タスクの登録に失敗したら、子の記録も残らない", async () => {
      const id = randomUUID();
      const title = `重複するタスク-${runId}`;
      const args = {
        p_id: id,
        p_title: title,
        p_is_purchase: false,
        p_record_child_id: childF1,
      };
      expect((await clientA.rpc("create_task", args)).error).toBeNull();

      // 同じ id の2回目は tasks の主キー違反で失敗する
      const { error } = await clientA.rpc("create_task", args);
      expect(error).not.toBeNull();

      expect(await itemsByTitle(title)).toHaveLength(1);
    });
  });

  describe("set_task_record_child", () => {
    async function createTask(recordChildId?: string) {
      const id = randomUUID();
      const { error } = await clientA.rpc("create_task", {
        p_id: id,
        p_title: `記録の付け外し-${runId}`,
        p_is_purchase: false,
        p_record_child_id: recordChildId,
      });
      if (error) throw new Error(error.message);
      return id;
    }

    async function itemById(id: string | null | undefined) {
      const { data, error } = await admin
        .from("life_event_items")
        .select("child_id, catalog_key, title, status, done_on, deleted_at")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    it("付いていないタスクに子を付けると、in_task の項目を作って繋ぐ", async () => {
      const id = await createTask();
      const { error } = await clientA.rpc("set_task_record_child", {
        p_task_id: id,
        p_child_id: childF1,
      });
      expect(error).toBeNull();

      const task = await taskById(id);
      expect(await itemById(task?.life_event_item_id)).toEqual({
        child_id: childF1,
        catalog_key: null,
        title: `記録の付け外し-${runId}`,
        status: "in_task",
        done_on: null,
        deleted_at: null,
      });
    });

    it("完了済みのタスクに付けると、項目も済みで作る", async () => {
      const id = await createTask();
      await admin
        .from("tasks")
        .update({
          status: "done",
          completed_at: "2026-10-01T03:00:00Z",
          completed_by: memberAId,
        })
        .eq("id", id);

      const { error } = await clientA.rpc("set_task_record_child", {
        p_task_id: id,
        p_child_id: childF1,
      });
      expect(error).toBeNull();

      const task = await taskById(id);
      expect(await itemById(task?.life_event_item_id)).toMatchObject({
        status: "done",
        done_on: "2026-10-01",
      });
    });

    it("外すと、タスクからの参照を消して項目を論理削除する", async () => {
      const id = await createTask(childF1);
      const itemId = (await taskById(id))?.life_event_item_id;

      const { error } = await clientA.rpc("set_task_record_child", {
        p_task_id: id,
      });
      expect(error).toBeNull();

      expect((await taskById(id))?.life_event_item_id).toBeNull();
      expect((await itemById(itemId)).deleted_at).not.toBeNull();
    });

    it("別の子に付け替えると、元の項目を論理削除して新しい項目に繋ぐ", async () => {
      const { data: sibling } = await admin
        .from("children")
        .insert({
          family_id: familyF1,
          display_name: "F1の下の子",
          created_by: memberAId,
        })
        .select("id")
        .single();
      const id = await createTask(childF1);
      const oldItemId = (await taskById(id))?.life_event_item_id;

      const { error } = await clientA.rpc("set_task_record_child", {
        p_task_id: id,
        p_child_id: sibling?.id,
      });
      expect(error).toBeNull();

      const newItemId = (await taskById(id))?.life_event_item_id;
      expect(newItemId).not.toBe(oldItemId);
      expect((await itemById(newItemId)).child_id).toBe(sibling?.id);
      expect((await itemById(oldItemId)).deleted_at).not.toBeNull();
    });

    it("同じ子を指定しても項目を作り直さない", async () => {
      const id = await createTask(childF1);
      const itemId = (await taskById(id))?.life_event_item_id;

      const { error } = await clientA.rpc("set_task_record_child", {
        p_task_id: id,
        p_child_id: childF1,
      });
      expect(error).toBeNull();
      expect((await taskById(id))?.life_event_item_id).toBe(itemId);
    });

    it("同じ項目を指すタスクがほかにあれば、外しても項目は残る", async () => {
      const args = {
        p_child_id: childF1,
        p_catalog_key: `test:shared-${runId}`,
        p_item_title: "妊婦健診を受ける",
        p_task_title: "妊婦健診を受ける",
      };
      const first = await clientA.rpc("add_life_event_item_to_task", args);
      const second = await clientA.rpc("add_life_event_item_to_task", args);
      const itemId = (await taskById(first.data))?.life_event_item_id;

      const { error } = await clientA.rpc("set_task_record_child", {
        p_task_id: first.data,
      });
      expect(error).toBeNull();

      expect((await taskById(first.data))?.life_event_item_id).toBeNull();
      expect((await taskById(second.data))?.life_event_item_id).toBe(itemId);
      expect((await itemById(itemId)).deleted_at).toBeNull();
    });

    it("他の家族の子は指定できず、元の記録も変わらない", async () => {
      const id = await createTask(childF1);
      const itemId = (await taskById(id))?.life_event_item_id;

      const { error } = await clientA.rpc("set_task_record_child", {
        p_task_id: id,
        p_child_id: childF2,
      });
      expect(error?.message).toContain("child_not_found");
      expect((await taskById(id))?.life_event_item_id).toBe(itemId);
      expect((await itemById(itemId)).deleted_at).toBeNull();
    });

    it("他の家族のタスクは変えられない", async () => {
      const { data: other } = await admin
        .from("tasks")
        .insert({ family_id: familyF2, title: "他家族のタスク", sort_order: 1 })
        .select("id")
        .single();

      const { error } = await clientA.rpc("set_task_record_child", {
        p_task_id: other?.id,
        p_child_id: childF1,
      });
      expect(error?.message).toContain("task_not_found");
    });
  });

  describe("add_life_event_item_to_task", () => {
    it("項目とタスクを作って繋ぎ、タスクの id を返す", async () => {
      const key = `test:add-${runId}`;
      const before = await maxSortOrder();
      const { data: taskId, error } = await clientA.rpc(
        "add_life_event_item_to_task",
        {
          p_child_id: childF1,
          p_catalog_key: key,
          p_item_title: "出生届を出す",
          p_task_title: "出生届を出す（F1の子）",
          p_item_note: "項目のメモ",
          p_task_note: "タスクのメモ",
          p_url: "https://example.test/birth",
          p_due_on: "2026-12-10",
        },
      );
      expect(error).toBeNull();

      const items = await itemsByKey(childF1, key);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        family_id: familyF1,
        title: "出生届を出す",
        note: "項目のメモ",
        status: "in_task",
        created_by: memberAId,
      });

      expect(await taskById(taskId)).toEqual({
        family_id: familyF1,
        title: "出生届を出す（F1の子）",
        due_on: "2026-12-10",
        is_purchase: false,
        purchase_location_id: null,
        sort_order: before + 1,
        created_by: memberAId,
        life_event_item_id: items[0].id,
        note: "タスクのメモ",
        url: "https://example.test/birth",
      });
    });

    it("同じ項目がすでにタスクにあれば、項目を増やさずタスクだけ足す", async () => {
      const key = `test:again-${runId}`;
      const args = {
        p_child_id: childF1,
        p_catalog_key: key,
        p_item_title: "児童手当を申請する",
        p_task_title: "児童手当を申請する",
      };
      const first = await clientA.rpc("add_life_event_item_to_task", args);
      const second = await clientA.rpc("add_life_event_item_to_task", args);
      expect([first.error, second.error]).toEqual([null, null]);

      const items = await itemsByKey(childF1, key);
      expect(items).toHaveLength(1);
      expect((await taskById(first.data))?.life_event_item_id).toBe(
        items[0].id,
      );
      expect((await taskById(second.data))?.life_event_item_id).toBe(
        items[0].id,
      );
    });

    it("記録済みの項目はタスクにできない", async () => {
      const key = `test:done-${runId}`;
      await admin.from("life_event_items").insert({
        family_id: familyF1,
        child_id: childF1,
        catalog_key: key,
        title: "記録済み",
        status: "done",
        done_on: "2026-09-01",
        created_by: memberAId,
      });
      const before = await maxSortOrder();

      const { error } = await clientA.rpc("add_life_event_item_to_task", {
        p_child_id: childF1,
        p_catalog_key: key,
        p_item_title: "記録済み",
        p_task_title: "記録済み",
      });
      expect(error?.message).toContain("already_recorded");
      expect(await maxSortOrder()).toBe(before);
    });

    it("タスクの登録に失敗したら、項目も残らない", async () => {
      const key = `test:rollback-${runId}`;
      const { error } = await clientA.rpc("add_life_event_item_to_task", {
        p_child_id: childF1,
        p_catalog_key: key,
        p_item_title: "項目名は妥当",
        // タスク名は200字までなので tasks の CHECK 制約に違反する
        p_task_title: "あ".repeat(201),
      });
      expect(error).not.toBeNull();
      expect(await itemsByKey(childF1, key)).toEqual([]);
    });

    it("他の家族の子は指定できない", async () => {
      const key = `test:other-${runId}`;
      const { error } = await clientA.rpc("add_life_event_item_to_task", {
        p_child_id: childF2,
        p_catalog_key: key,
        p_item_title: "他家族",
        p_task_title: "他家族",
      });
      expect(error?.message).toContain("child_not_found");
      expect(await itemsByKey(childF2, key)).toEqual([]);
    });
  });

  describe("record_life_event_item_done", () => {
    it("まだ無い項目は、済みの記録として作る", async () => {
      const key = `test:record-${runId}`;
      const { error } = await clientA.rpc("record_life_event_item_done", {
        p_child_id: childF1,
        p_catalog_key: key,
        p_title: "お宮参りに行く",
        p_done_on: "2026-08-15",
        p_note: "https://example.test/omiyamairi",
      });
      expect(error).toBeNull();

      const items = await itemsByKey(childF1, key);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        title: "お宮参りに行く",
        note: "https://example.test/omiyamairi",
        status: "done",
        done_on: "2026-08-15",
        created_by: memberAId,
      });
    });

    it("タスクにある項目は済みに変え、タスクからの参照を外す", async () => {
      const key = `test:record-in-task-${runId}`;
      const { data: taskId } = await clientA.rpc(
        "add_life_event_item_to_task",
        {
          p_child_id: childF1,
          p_catalog_key: key,
          p_item_title: "新生児訪問を受ける",
          p_task_title: "新生児訪問を受ける",
        },
      );

      const { error } = await clientA.rpc("record_life_event_item_done", {
        p_child_id: childF1,
        p_catalog_key: key,
        p_title: "新生児訪問を受ける",
        p_done_on: "2026-09-20",
      });
      expect(error).toBeNull();

      const items = await itemsByKey(childF1, key);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ status: "done", done_on: "2026-09-20" });
      expect((await taskById(taskId))?.life_event_item_id).toBeNull();
    });

    it("すでに済みの項目は二重に記録できず、日付も変わらない", async () => {
      const key = `test:record-twice-${runId}`;
      const args = {
        p_child_id: childF1,
        p_catalog_key: key,
        p_title: "お食い初めをする",
        p_done_on: "2026-07-01",
      };
      expect(
        (await clientA.rpc("record_life_event_item_done", args)).error,
      ).toBeNull();

      const { error } = await clientA.rpc("record_life_event_item_done", {
        ...args,
        p_done_on: "2026-07-31",
      });
      expect(error?.message).toContain("already_recorded");
      expect((await itemsByKey(childF1, key))[0].done_on).toBe("2026-07-01");
    });

    it("他の家族の子は指定できない", async () => {
      const key = `test:record-other-${runId}`;
      const { error } = await clientA.rpc("record_life_event_item_done", {
        p_child_id: childF2,
        p_catalog_key: key,
        p_title: "他家族",
        p_done_on: "2026-07-01",
      });
      expect(error?.message).toContain("child_not_found");
      expect(await itemsByKey(childF2, key)).toEqual([]);
    });
  });

  describe("タスク完了でメモと URL を記録に残す", () => {
    const URL_A = "https://example.test/kenshin";

    async function createLinkedTask(
      note: string | null,
      keepDetailsInRecord: boolean,
    ) {
      const id = randomUUID();
      const { error } = await clientA.rpc("create_task", {
        p_id: id,
        p_title: `メモを残す-${runId}`,
        p_is_purchase: false,
        p_record_child_id: childF1,
      });
      if (error) throw new Error(error.message);
      const { error: updateError } = await clientA
        .from("tasks")
        .update({ note, keep_details_in_record: keepDetailsInRecord })
        .eq("id", id);
      if (updateError) throw new Error(updateError.message);
      return id;
    }

    async function setDone(id: string, done: boolean) {
      const { error } = await clientA
        .from("tasks")
        .update(
          done
            ? {
                status: "done",
                completed_at: new Date().toISOString(),
                completed_by: memberAId,
              }
            : { status: "open", completed_at: null, completed_by: null },
        )
        .eq("id", id);
      if (error) throw new Error(error.message);
    }

    async function itemIdOf(taskId: string) {
      const task = await taskById(taskId);
      return task?.life_event_item_id as string;
    }

    async function itemNote(itemId: string) {
      const { data, error } = await admin
        .from("life_event_items")
        .select("note")
        .eq("id", itemId)
        .single();
      if (error) throw new Error(error.message);
      return data.note;
    }

    async function setItemNote(itemId: string, note: string) {
      const { error } = await admin
        .from("life_event_items")
        .update({ note })
        .eq("id", itemId);
      if (error) throw new Error(error.message);
    }

    it("オンなら、完了時にタスクのメモを記録へコピーする", async () => {
      const id = await createLinkedTask("身長62cm", true);
      await setDone(id, true);
      expect(await itemNote(await itemIdOf(id))).toBe("身長62cm");
    });

    it("オフなら、メモがあっても記録へコピーしない", async () => {
      const id = await createLinkedTask("身長62cm", false);
      await setDone(id, true);
      expect(await itemNote(await itemIdOf(id))).toBeNull();
    });

    it("オンでもメモが空なら、記録のメモを変えない", async () => {
      const id = await createLinkedTask(null, true);
      const itemId = await itemIdOf(id);
      await setItemNote(itemId, "https://example.test/program");
      await setDone(id, true);
      expect(await itemNote(itemId)).toBe("https://example.test/program");
    });

    it("記録にメモがあれば、空行を挟んで後ろに足す", async () => {
      const id = await createLinkedTask("身長62cm", true);
      const itemId = await itemIdOf(id);
      await setItemNote(itemId, "https://example.test/program");
      await setDone(id, true);
      expect(await itemNote(itemId)).toBe(
        "https://example.test/program\n\n身長62cm",
      );
    });

    it("足して2000文字を超えるなら切って、完了は失敗させない", async () => {
      const id = await createLinkedTask("b".repeat(2000), true);
      const itemId = await itemIdOf(id);
      await setItemNote(itemId, "a".repeat(1000));
      await setDone(id, true);
      expect(await itemNote(itemId)).toBe(
        `${"a".repeat(1000)}\n\n${"b".repeat(998)}`,
      );
    });

    it("完了を取り消すと、写したメモを記録から取り除く", async () => {
      const id = await createLinkedTask("身長62cm", true);
      const itemId = await itemIdOf(id);
      await setDone(id, true);
      await setDone(id, false);
      expect(await itemNote(itemId)).toBeNull();
    });

    it("取り消してメモを直して再完了すると、直したメモだけが残る", async () => {
      const id = await createLinkedTask("身長62cm", true);
      const itemId = await itemIdOf(id);
      await setDone(id, true);
      await setDone(id, false);
      await clientA.from("tasks").update({ note: "身長63cm" }).eq("id", id);
      await setDone(id, true);
      expect(await itemNote(itemId)).toBe("身長63cm");
    });

    it("取り消しても、もともとの記録のメモは残す", async () => {
      const id = await createLinkedTask("身長62cm", true);
      const itemId = await itemIdOf(id);
      await setItemNote(itemId, "https://example.test/program");
      await setDone(id, true);
      await setDone(id, false);
      expect(await itemNote(itemId)).toBe("https://example.test/program");
    });

    it("完了後にタスクのメモを直しても、写した文を取り除ける", async () => {
      const id = await createLinkedTask("身長62cm", true);
      const itemId = await itemIdOf(id);
      await setDone(id, true);
      await clientA.from("tasks").update({ note: "身長63cm" }).eq("id", id);
      await setDone(id, false);
      expect(await itemNote(itemId)).toBeNull();
    });

    it("2000文字で切って写した分も、取り消しで取り除く", async () => {
      const id = await createLinkedTask("b".repeat(2000), true);
      const itemId = await itemIdOf(id);
      await setItemNote(itemId, "a".repeat(1000));
      await setDone(id, true);
      await setDone(id, false);
      expect(await itemNote(itemId)).toBe("a".repeat(1000));
    });

    it("記録側でメモを直していたら、取り消しても手を付けない", async () => {
      const id = await createLinkedTask("身長62cm", true);
      const itemId = await itemIdOf(id);
      await setDone(id, true);
      await setItemNote(itemId, "身長62cm、よく笑うようになった");
      await setDone(id, false);
      expect(await itemNote(itemId)).toBe("身長62cm、よく笑うようになった");
      await setDone(id, true);
      expect(await itemNote(itemId)).toBe("身長62cm、よく笑うようになった");
    });

    it("URL があれば、メモの前に写す", async () => {
      const id = await createLinkedTask("身長62cm", true);
      await clientA.from("tasks").update({ url: URL_A }).eq("id", id);
      await setDone(id, true);
      expect(await itemNote(await itemIdOf(id))).toBe(`${URL_A}\n\n身長62cm`);
    });

    it("メモがなくても URL は写す", async () => {
      const id = await createLinkedTask(null, true);
      await clientA.from("tasks").update({ url: URL_A }).eq("id", id);
      await setDone(id, true);
      expect(await itemNote(await itemIdOf(id))).toBe(URL_A);
    });

    it("オフなら URL も写さない", async () => {
      const id = await createLinkedTask(null, false);
      await clientA.from("tasks").update({ url: URL_A }).eq("id", id);
      await setDone(id, true);
      expect(await itemNote(await itemIdOf(id))).toBeNull();
    });

    it("同じ URL が記録にあれば、メモだけ足す", async () => {
      const id = await createLinkedTask("身長62cm", true);
      const itemId = await itemIdOf(id);
      await clientA.from("tasks").update({ url: URL_A }).eq("id", id);
      await setItemNote(itemId, URL_A);
      await setDone(id, true);
      expect(await itemNote(itemId)).toBe(`${URL_A}\n\n身長62cm`);
    });

    it("取り消すと、写した URL も取り除く", async () => {
      const id = await createLinkedTask("身長62cm", true);
      const itemId = await itemIdOf(id);
      await clientA.from("tasks").update({ url: URL_A }).eq("id", id);
      await setDone(id, true);
      await setDone(id, false);
      expect(await itemNote(itemId)).toBeNull();
    });

    it("同じ項目を指す別のタスクが先に完了していても、メモを足す", async () => {
      const first = await createLinkedTask(null, false);
      const itemId = await itemIdOf(first);
      const second = await createLinkedTask("身長62cm", true);
      await admin
        .from("tasks")
        .update({ life_event_item_id: itemId })
        .eq("id", second);
      await setDone(first, true);
      await setDone(second, true);
      expect(await itemNote(itemId)).toBe("身長62cm");
    });
  });
});
