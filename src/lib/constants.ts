/** 「そろそろ」バケットに入れる日数（今日を含まず、これから先何日まで）。 */
export const SOON_DAYS = 7;

/** 招待の有効期限（発行から何日後に失効するか）。DB側のRLSでも上限30日を強制する。 */
export const INVITATION_TTL_DAYS = 7;
