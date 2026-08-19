import { describe, expect, it } from "vitest";
import { deriveInvitationListStatus } from "@/features/invitations/status";

const NOW = new Date("2026-08-19T00:00:00Z");
const FUTURE = "2026-08-26T00:00:00Z";
const PAST = "2026-08-12T00:00:00Z";

describe("deriveInvitationListStatus", () => {
  it("is pending when not accepted/revoked and not yet expired", () => {
    expect(
      deriveInvitationListStatus(
        { expiresAt: FUTURE, acceptedAt: null, revokedAt: null },
        NOW,
      ),
    ).toBe("pending");
  });

  it("is expired once past expiresAt", () => {
    expect(
      deriveInvitationListStatus(
        { expiresAt: PAST, acceptedAt: null, revokedAt: null },
        NOW,
      ),
    ).toBe("expired");
  });

  it("is accepted once acceptedAt is set, even past expiresAt", () => {
    expect(
      deriveInvitationListStatus(
        {
          expiresAt: PAST,
          acceptedAt: "2026-08-13T00:00:00Z",
          revokedAt: null,
        },
        NOW,
      ),
    ).toBe("accepted");
  });

  it("is revoked when revokedAt is set, taking priority over accepted", () => {
    expect(
      deriveInvitationListStatus(
        {
          expiresAt: FUTURE,
          acceptedAt: "2026-08-13T00:00:00Z",
          revokedAt: "2026-08-14T00:00:00Z",
        },
        NOW,
      ),
    ).toBe("revoked");
  });

  it("treats expiresAt exactly equal to now as expired", () => {
    expect(
      deriveInvitationListStatus(
        { expiresAt: NOW.toISOString(), acceptedAt: null, revokedAt: null },
        NOW,
      ),
    ).toBe("expired");
  });
});
