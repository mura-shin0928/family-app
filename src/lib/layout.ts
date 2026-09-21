/** 下部ナビの高さ。MUI BottomNavigation の既定 56px + セーフエリア。 */
export const BOTTOM_NAV_HEIGHT = "calc(56px + env(safe-area-inset-bottom))";

/** 下部ナビをかわす距離。ナビの高さ + 16px（画面の余白 `p: 2` と同じ）。 */
export const BOTTOM_NAV_CLEARANCE = `calc(16px + ${BOTTOM_NAV_HEIGHT})`;
