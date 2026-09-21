/**
 * 下部ナビ（BottomNav）の高さ。MUI BottomNavigation の既定 56px に、端末の
 * セーフエリア（ホームインジケータ）が加わる。ナビのすぐ上に隙間なく貼り付ける
 * 固定要素（クイック追加バー）の `bottom` に使う。
 */
export const BOTTOM_NAV_HEIGHT = "calc(56px + env(safe-area-inset-bottom))";

/**
 * 下部ナビをかわすのに要る、画面下端からの距離。ナビの高さ + 16px（各画面の余白
 * `p: 2` と同じぶん）。スクロール領域の下余白（`pb`）と、ナビの上に浮かせる
 * 固定要素の位置（FAB の `bottom`）の両方に使う。
 *
 * `pb: 10`（80px）のような固定値にすると、セーフエリアのぶんだけ足りず、最後の
 * 数pxがナビの下に潜って文字が切れて見える。値を直接書いていたころに手続き画面と
 * 制度一覧だけコピーし忘れて、実際にこの不具合が出ていた。
 * 下部ナビを出す画面では必ずこれを使うこと。
 */
export const BOTTOM_NAV_CLEARANCE = `calc(16px + ${BOTTOM_NAV_HEIGHT})`;
