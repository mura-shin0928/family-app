import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("メールアドレスの形式が正しくありません"));

const displayNameSchema = z
  .string()
  .trim()
  .min(1, "表示名を入力してください")
  .max(50, "表示名は50文字以内で入力してください");

export const createInvitationSchema = z.object({
  email: emailSchema,
  displayName: displayNameSchema,
});

export const invitationIdSchema = z.object({
  invitationId: z.string().uuid(),
});

export const memberIdSchema = z.object({
  memberId: z.string().uuid(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "招待トークンが不正です"),
});

export const sendInviteLoginLinkSchema = z.object({
  token: z.string().min(1, "招待トークンが不正です"),
  email: emailSchema,
});
