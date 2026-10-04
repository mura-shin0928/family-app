import { isHttpUrl } from "@/lib/url";

type ShareParam = string | string[] | undefined;

export type ShareDraft = { title: string; url: string; note: string };

// 上限は tasks/schema.ts（= DBのCHECK制約）と揃える。
const TITLE_MAX = 200;
const URL_MAX = 2000;
const NOTE_MAX = 2000;

// 日本語の文に続けて書かれたURLを文ごと拾わないよう、ASCIIの範囲だけを見る。
const URL_IN_TEXT = /https?:\/\/[\x21-\x7e]+/i;
const TRAILING_PUNCTUATION = /[.,!?)\]}]+$/;

function first(value: ShareParam): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function isAcceptableUrl(value: string): boolean {
  return value.length <= URL_MAX && isHttpUrl(value);
}

function findUrlInText(text: string): string | null {
  const candidate = text
    .match(URL_IN_TEXT)?.[0]
    .replace(TRAILING_PUNCTUATION, "");
  return candidate && isAcceptableUrl(candidate) ? candidate : null;
}

/** 共有シートやショートカットから届いたクエリを、確認画面の初期値にする。 */
export function parseShareInput(params: {
  title?: ShareParam;
  text?: ShareParam;
  url?: ShareParam;
}): ShareDraft {
  const title = first(params.title).slice(0, TITLE_MAX);
  const text = first(params.text);
  const urlParam = first(params.url);

  if (isAcceptableUrl(urlParam)) {
    return { title, url: urlParam, note: text.slice(0, NOTE_MAX) };
  }

  const urlInText = findUrlInText(text);
  const note = (urlInText ? text.replace(urlInText, "") : text)
    .trim()
    .slice(0, NOTE_MAX);

  return { title, url: urlInText ?? "", note };
}

export function isEmptyShareDraft(draft: ShareDraft): boolean {
  return draft.title === "" && draft.url === "" && draft.note === "";
}
