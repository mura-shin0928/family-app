import { requireFamilyMember } from "@/features/auth/guard";
import { AnalyticsIdentity } from "./AnalyticsIdentity";

export async function AnalyticsGate() {
  const { member } = await requireFamilyMember();
  return <AnalyticsIdentity memberId={member.id} familyId={member.familyId} />;
}
