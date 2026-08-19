import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default function NoAccessPage() {
  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

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
        アクセスできません
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
        このアカウントはまだどのFamilyにも参加していません。Familyのメンバーまたは管理者に招待を依頼してください。
      </Typography>
      <Box component="form" action={signOut}>
        <Button type="submit" size="small" sx={{ textTransform: "none" }}>
          ログアウト
        </Button>
      </Box>
    </Box>
  );
}
