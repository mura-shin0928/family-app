"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { TASKS_QUERY_KEY } from "../types";

/**
 * 他ユーザーによるtasksの変更をRealtimeで検知する。ペイロードを直接
 * Reactのstateへ反映せず invalidateQueries のみ行い、DBを常にsource of
 * truthとして再取得させる（要件通りの「invalidate→再fetch」フロー）。
 *
 * visibilitychangeでのデータ再取得自体はTanStack Queryの
 * refetchOnWindowFocusが同じイベントで既に担っているため、ここでは
 * 「モバイルOSがバックグラウンド中に切ったWebSocketを繋ぎ直す」ことだけを行う
 * （realtime-jsは同一チャンネルインスタンスへの再subscribeを許可していないため
 * 作り直す）。
 */
export function useTasksRealtime(familyId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    function subscribe() {
      return supabase
        .channel(`tasks:${familyId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `family_id=eq.${familyId}`,
          },
          () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
        )
        .subscribe();
    }

    let channel = subscribe();

    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      supabase.removeChannel(channel);
      channel = subscribe();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [familyId, queryClient]);
}
