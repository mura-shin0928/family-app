import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { TERMS_SECTIONS } from "@/content/terms";

export const metadata: Metadata = { title: "利用規約 | Family App" };

export default function TermsPage() {
  return <LegalDocument title="利用規約" sections={TERMS_SECTIONS} />;
}
