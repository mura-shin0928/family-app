import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { BackButton } from "@/components/BackButton";
import { RELEASE_NOTES } from "@/content/release-notes";
import { CONTACT_SUBJECT, contactMailto } from "@/lib/contact";

export const metadata: Metadata = { title: "更新内容 | Family App" };

export default function ReleaseNotesPage() {
  const mailto = contactMailto(CONTACT_SUBJECT);

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar>
          <BackButton fallbackHref="/tasks" />
          <Typography variant="h6" component="h1">
            更新内容
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Stack
        spacing={3}
        sx={{ p: 2, width: "100%", maxWidth: 480, mx: "auto" }}
      >
        {RELEASE_NOTES.map((note) => (
          <Box component="section" key={note.date}>
            <Typography variant="subtitle1" component="h2" sx={{ mb: 1 }}>
              {note.date.replaceAll("-", "/")}
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 3 }}>
              {note.items.map((item) => (
                <li key={item}>
                  <Typography variant="body1">{item}</Typography>
                </li>
              ))}
            </Box>
          </Box>
        ))}
        {mailto && (
          <Typography variant="body2" color="textSecondary">
            不具合やご要望は<Link href={mailto}>お問い合わせ</Link>
            からお送りください。
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
