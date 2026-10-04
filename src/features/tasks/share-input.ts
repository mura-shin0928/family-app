import { isHttpUrl } from "@/lib/url";

type ShareParam = string | string[] | undefined;

export type ShareDraft = { title: string; url: string; note: string };

// 上限は tasks/schema.ts（= DBのCHECK制約）と揃える。
const TITLE_MAX = 200;
const URL_MAX = 2000;
const NOTE_MAX = 2000;

// 日本語の文に続けて書かれたURLを文ごと拾わないよう、ASCIIの範囲だけを見る。
const URL_IN_TEXT = /https?:\/\/[\x21-\x7e]+/i;
const TRAILING_PUNCTUATION = ".,!?)]}";

function first(value: ShareParam): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function isAcceptableUrl(value: string): boolean {
  return value.length <= URL_MAX && isHttpUrl(value);
}

function count(value: string, char: string): number {
  return value.split(char).length - 1;
}

// 文の句読点や括弧を落とす。URL自身の括弧（Wikipedia の `Foo_(bar)` など）は残す。
function stripTrailingPunctuation(url: string): string {
  let result = url;
  while (TRAILING_PUNCTUATION.includes(result.slice(-1)) && result !== "") {
    if (result.endsWith(")") && count(result, ")") <= count(result, "(")) {
      break;
    }
    result = result.slice(0, -1);
  }
  return result;
}

function findUrlInText(text: string): string | null {
  const match = text.match(URL_IN_TEXT)?.[0];
  if (!match) return null;
  const candidate = stripTrailingPunctuation(match);
  return isAcceptableUrl(candidate) ? candidate : null;
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
