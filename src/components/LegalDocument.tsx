import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { BackButton } from "@/components/BackButton";
import { type LegalSection, TERMS_VERSION } from "@/content/legal";
import { CONTACT_SUBJECT, contactMailto } from "@/lib/contact";

type Props = { title: string; sections: readonly LegalSection[] };

/** 利用規約とプライバシーポリシーの共通の見た目。表は狭い画面でも読めるよう行ごとに縦に並べる。 */
export function LegalDocument({ title, sections }: Props) {
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
            {title}
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Stack
        spacing={3}
        sx={{ p: 2, width: "100%", maxWidth: 640, mx: "auto" }}
      >
        {sections.map((section) => (
          <Box component="section" key={section.heading}>
            <Typography variant="subtitle1" component="h2" sx={{ mb: 1 }}>
              {section.heading}
            </Typography>
            {section.paragraphs?.map((paragraph) => (
              <Typography key={paragraph} variant="body1" sx={{ mb: 1 }}>
                {paragraph}
              </Typography>
            ))}
            {section.items && (
              <Box component="ul" sx={{ m: 0, pl: 3 }}>
                {section.items.map((item) => (
                  <li key={item}>
                    <Typography variant="body1">{item}</Typography>
                  </li>
                ))}
              </Box>
            )}
            {section.table && (
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                {section.table.rows.map((row) => (
                  <Box
                    key={row[0]}
                    component="dl"
                    sx={{
                      m: 0,
                      p: 1.5,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    {section.table?.head.map((label, index) => (
                      <Box key={label} sx={{ mb: 0.5 }}>
                        <Typography
                          component="dt"
                          variant="body2"
                          color="textSecondary"
                        >
                          {label}
                        </Typography>
                        <Typography
                          component="dd"
                          variant="body1"
                          sx={{ m: 0 }}
                        >
                          {row[index]}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        ))}
        <Box component="section">
          <Typography variant="subtitle1" component="h2" sx={{ mb: 1 }}>
            お問い合わせ先
          </Typography>
          <Typography variant="body1">
            {mailto ? (
              <Link href={mailto}>お問い合わせ（メール）</Link>
            ) : (
              "お問い合わせ先は、準備ができしだいここに載せます。"
            )}
          </Typography>
        </Box>
        <Typography variant="body2" color="textSecondary">
          {TERMS_VERSION.replaceAll("-", "/")} 制定
        </Typography>
      </Stack>
    </Box>
  );
}
