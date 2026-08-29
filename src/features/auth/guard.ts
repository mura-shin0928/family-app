import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentFamilyMember = {
  userId: string;
  email: string;
  member: {
    id: string;
    familyId: string;
    displayName: string;
  };
};

/**
 * 認証 + Family所属を検証する。全ページ/Server Actionの入口で呼ぶ。
 * ここが漏れても、実際のデータ取得はすべてRLSで守られているため漏洩はしない
 * （proxy.ts のリダイレクトと同様、これもUXのための層であり最終防衛線はRLS）。
 */
export const requireFamilyMember = cache(
  async (): Promise<CurrentFamilyMember> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: member } = await supabase
      .from("family_members")
      .select("id, family_id, display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      redirect("/no-access");
    }

    return {
      userId: user.id,
      email: user.email ?? "",
      member: {
        id: member.id,
        familyId: member.family_id,
        displayName: member.display_name,
      },
    };
  },
);

/**
 * ログイン中ユーザーがapp_adminかどうか。admin_usersテーブルはRLSで直接読ませず、
 * is_app_admin() (security definer RPC) 経由でのみ判定できる。
 * 未ログインなら常にfalse（RPCがauth.uid()=nullを扱えるため、ここでガードしない）。
 */
export const getIsAppAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_app_admin");
  return data === true;
});

export type CurrentAppAdmin = { userId: string };

/**
 * app_admin専用ページ/Server Actionの入口で呼ぶ。Family所属は問わない
 * （adminは自分のFamilyの外側を管理するための権限のため）。
 * ここが漏れても、実際のデータ操作はすべてRLS（is_app_admin()を含む）で
 * 守られているため漏洩・改ざんはしない。
 */
export const requireAppAdmin = cache(async (): Promise<CurrentAppAdmin> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = await getIsAppAdmin();
  if (!isAdmin) {
    redirect("/tasks");
  }

  return { userId: user.id };
});
