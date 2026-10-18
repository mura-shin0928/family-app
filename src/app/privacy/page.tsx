import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { PRIVACY_SECTIONS } from "@/content/privacy";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Family App",
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="プライバシーポリシー" sections={PRIVACY_SECTIONS} />
  );
}
