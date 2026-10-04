import Box from "@mui/material/Box";
import { redirect } from "next/navigation";
import { getIsAppAdmin, requireFamilyMember } from "@/features/auth/guard";
import { ShareCaptureScreen } from "@/features/tasks/components/ShareCaptureScreen";
import {
  isEmptyShareDraft,
  parseShareInput,
} from "@/features/tasks/share-input";
import { AppHeader } from "../../AppHeader";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// 他アプリの共有シート（manifest の share_target）やショートカットから開かれる。
export default async function TaskSharePage({ searchParams }: Props) {
  const [{ member }, isAppAdmin, params] = await Promise.all([
    requireFamilyMember(),
    getIsAppAdmin(),
    searchParams,
  ]);

  const draft = parseShareInput({
    title: params.title,
    text: params.text,
    url: params.url,
  });
  if (isEmptyShareDraft(draft)) {
    redirect("/tasks");
  }

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppHeader
        title="共有から追加"
        displayName={member.displayName}
        isAppAdmin={isAppAdmin}
      />
      <ShareCaptureScreen initial={draft} />
    </Box>
  );
}
