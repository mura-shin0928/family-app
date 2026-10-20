import type { LinkNotice } from "../link-notice";

/**
 * 「公式ページを開けませんでした（最終確認: 10月18日）」。括弧の中は1かたまりにして、
 * 折り返すなら文言と日付の間で折る（日付の途中で「10」「月18日」に割れないように）。
 */
export function LinkNoticeText({ notice }: { notice: LinkNotice }) {
  return (
    <>
      {notice.message}
      {notice.checkedOn && (
        <span style={{ whiteSpace: "nowrap" }}>（{notice.checkedOn}）</span>
      )}
    </>
  );
}
