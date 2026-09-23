import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { AcceptInvitationScreen } from "@/features/invitations/components/AcceptInvitationScreen";
import { InviteEmailForm } from "@/features/invitations/components/InviteEmailForm";
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
        <Typography variant="h6" component="h1">
          Family App
        </Typography>
        <InviteEmailForm token={token} />
      </Box>
    );
  }

  const preview = await previewInvitation(hashInvitationToken(token));

  return <AcceptInvitationScreen token={token} preview={preview} />;
}
