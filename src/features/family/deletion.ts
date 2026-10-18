/** 退会の確認欄に入れた名前が家族名と一致するか。前後の空白は無視する。 */
export function canConfirmFamilyDeletion(
  input: string,
  familyName: string,
): boolean {
  const trimmed = input.trim();
  return trimmed !== "" && trimmed === familyName.trim();
}
