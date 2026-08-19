#!/usr/bin/env node
// Gemini構造化抽出の実疎通確認（CIには入れない、手動で1回叩くためのスクリプト）。
// 生レスポンスをそのまま出力する。output_text / steps の実際の形を
// Next + Supabaseを起動せずに確認するためのもので、アプリ本体のコードは呼ばない。
//
// 使い方: node --env-file=.env.local scripts/gemini-smoke.mjs

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY が設定されていません（.env.local を確認）");
  process.exit(1);
}

const sampleText = `
鶏の照り焼き
材料（2人分）
鶏もも肉 300g
白菜 1/4個
醤油 大さじ2
みりん 大さじ2
砂糖 小さじ1
`;

const body = {
  model: "gemini-3.7-flash",
  input: sampleText,
  system_instruction:
    "あなたは日本語のレシピ本文から料理名と材料を抽出するアシスタントです。" +
    "与えられた本文だけを根拠にJSONを出力してください。" +
    "材料の分量が本文に書かれていない場合、quantityは空文字にしてください。",
  store: false,
  generation_config: { temperature: 0, thinking_level: "low" },
  response_format: {
    type: "text",
    mime_type: "application/json",
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
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
      required: ["title", "ingredients"],
    },
  },
};

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

console.log("status:", response.status);
const json = await response.json();
console.log(JSON.stringify(json, null, 2));

if (json.output_text) {
  console.log("\n--- output_text をJSONとしてparse ---");
  console.log(JSON.parse(json.output_text));
}
