-- signInWithOtp は create_user:true で呼ぶため、第三者が招待先のメールアドレス宛に
-- 先にパスワード付きで sign up しておくと、本人がログインリンクでそのメール確認を
-- 完了させた瞬間に、第三者の設定したパスワードがそのまま使えるようになってしまう
-- （本人もこのアプリにパスワード画面を持たないため、気づく手段がない）。
-- メールが初めて確認された時点で、それまでに設定されていたパスワードを無効化する。
-- これは「確認前に誰かが設定した可能性がある」ことへの対処であり、
-- 本人が確認後にパスワードを設定する操作は妨げない（UPDATE OF email_confirmed_at のみに反応）。
create function public.clear_password_on_first_confirm()
returns trigger
language plpgsql
as $$
begin
  new.encrypted_password := null;
  return new;
end;
$$;

create trigger clear_password_on_first_confirm
  before update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.clear_password_on_first_confirm();
