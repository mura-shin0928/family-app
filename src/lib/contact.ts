/** 問い合わせ用の Gmail。決まるまでは null で、問い合わせのリンクを出さない。 */
export const CONTACT_EMAIL: string | null = null;

export const CONTACT_SUBJECT = "家族アプリへのお問い合わせ";

export function contactMailto(
  subject: string,
  email: string | null = CONTACT_EMAIL,
): string | null {
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
