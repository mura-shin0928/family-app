#!/usr/bin/env node
// Gemini画像理解の実疎通確認（CIには入れない、手動で1回叩くためのスクリプト）。
// 生レスポンスをそのまま出力する。input配列形式（text+image）が通るか、
// 応答形式が既存のparseOutput（output_text / steps）と互換かを
// Next + Supabaseを起動せずに確認するためのもので、アプリ本体のコードは呼ばない。
//
// 使い方: node --env-file=.env.local scripts/gemini-image-smoke.mjs <画像パス> [mime_type]

import { readFile } from "node:fs/promises";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY が設定されていません（.env.local を確認）");
  process.exit(1);
}

const imagePath = process.argv[2];
if (!imagePath) {
  console.error(
    "使い方: node --env-file=.env.local scripts/gemini-image-smoke.mjs <画像パス> [mime_type]",
  );
  process.exit(1);
}
const mimeType = process.argv[3] ?? "image/jpeg";

const imageBytes = await readFile(imagePath);
console.log(`画像サイズ: ${imageBytes.length} bytes, mime: ${mimeType}`);
const base64 = imageBytes.toString("base64");

const systemInstruction =
  "あなたは日本語のレシピ画像から料理名と材料を抽出するアシスタントです。" +
  "画像に写っているレシピの情報だけを根拠にJSONを出力してください。" +
  "読み取れない文字は推測で埋めず、その材料を省いてください。" +
  "広告・ページ番号・関係のない文字は無視してください。" +
  "料理名が読み取れない場合は画像の内容から適切な短い名前を推測してください。" +
  "材料の分量が画像に書かれていない場合、quantityは空文字にしてください。" +
  "材料が1つも見つからない場合はingredientsを空配列にしてください。" +
  "画像に人数・分量の目安（何人分・何人前など）の記載があれば、" +
  "servingsに「2人分」のような形で書き出してください。記載がなければservingsは空文字にしてください。" +
  "人名・住所・電話番号など、レシピと関係のない情報は出力しないでください。";

const body = {
  model: "gemini-3.7-flash",
  input: [
    { type: "text", text: "この画像からレシピ情報を抽出してください。" },
    { type: "image", data: base64, mime_type: mimeType },
  ],
  system_instruction: systemInstruction,
  store: false,
  generation_config: { temperature: 0, thinking_level: "low" },
  response_format: {
    type: "text",
    mime_type: "application/json",
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        servings: { type: "string" },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "string" },
            },
            required: ["name", "quantity"],
          },
        },
      },
      required: ["title", "servings", "ingredients"],
    },
  },
};

const startedAt = Date.now();
const response = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/interactions",
  {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  },
);
const elapsedMs = Date.now() - startedAt;

console.log("status:", response.status, `(${elapsedMs}ms)`);
const json = await response.json();
console.log(JSON.stringify(json, null, 2));

function extractOutputText(res) {
  if (res.output_text) return res.output_text;
  const text = (res.steps ?? [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((item) => item.type === "text" && item.text)
    .map((item) => item.text)
    .join("");
  return text === "" ? null : text;
}

const outputText = extractOutputText(json);
if (outputText) {
  console.log("\n--- 抽出したJSON（既存parseOutput互換の想定） ---");
  console.log(JSON.parse(outputText));
} else {
  console.log(
    "\n--- output_text も steps からのテキストも取得できませんでした ---",
  );
}
