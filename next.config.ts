import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // v15でdynamicルートのクライアントキャッシュ既定値が30s→0sに変更された影響で、
    // 「一覧」「レシピ」を行き来するたびに毎回サーバーへ再取得しに行き重く感じていた。
    // 30秒だけ再利用させ、切り替え直後の連続タップはネットワークを介さず即座に返す。
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
