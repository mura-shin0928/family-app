import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { LinkButton } from "@/components/LinkButton";
import { AcceptInvitationScreen } from "@/features/invitations/components/AcceptInvitationScreen";
import { previewInvitation } from "@/features/invitations/queries";
import { hashInvitationToken } from "@/features/invitations/token";
import { createClient } from "@/lib/supabase/server";

export default async function InvitePage({
  params,
}: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Box
        component="main"
        sx={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          p: 4,
          textAlign: "center",
        }}
      >
        <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
          Family App
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 320 }}
        >
          招待の内容を確認するには、招待されたメールアドレスでログインしてください。
        </Typography>
        <LinkButton
          href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
          variant="contained"
          sx={{ width: 1, maxWidth: 320 }}
        >
          ログインする
        </LinkButton>
      </Box>
    );
  }

  const preview = await previewInvitation(hashInvitationToken(token));

  return <AcceptInvitationScreen token={token} preview={preview} />;
}
