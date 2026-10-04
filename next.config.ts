import type { NextConfig } from "next";

// script-src は入れていない。nonce が要り、全ページが動的レンダリングになって
// static shell を先に出せなくなるため。
const contentSecurityPolicy = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // frame-ancestors を解釈しないブラウザ向け
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // v15でdynamicルートのクライアントキャッシュ既定値が30s→0sに変更された影響で、
    // 「一覧」「レシピ」を行き来するたびに毎回サーバーへ再取得しに行き重く感じていた。
    // 30秒だけ再利用させ、切り替え直後の連続タップはネットワークを介さず即座に返す。
    staleTimes: {
      dynamic: 30,
    },
    // 既定は1MB。レシピ画像取り込み(analyzeRecipeImage)がクライアント側で
    // 圧縮した画像(目標1.2MB、ハード上限2MB)+multipartのオーバーヘッドを
    // 通すため引き上げる。Vercel Functionのリクエストボディ上限(4.5MB)には
    // 十分な余裕がある。認証必須・夫婦2人利用のアプリのため、上限引き上げに
    // よる悪用リスクは小さいと判断。
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
