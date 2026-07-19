import assert from "node:assert/strict";
import test from "node:test";

import { findResendDomainByName } from "@/features/communications/server/resend-domain-lookup";

test("finds a Resend domain across paginated results", async () => {
  const requestedAfter: Array<string | undefined> = [];
  const domain = await findResendDomainByName(async ({ after }) => {
    requestedAfter.push(after);
    if (!after) {
      return {
        domains: [
          { id: "domain_1", name: "one.example.com", status: "verified" },
        ],
        hasMore: true,
      };
    }
    return {
      domains: [
        {
          id: "domain_2",
          name: "Mail.Studio.example",
          status: "pending",
        },
      ],
      hasMore: false,
    };
  }, "mail.studio.example");

  assert.equal(domain?.id, "domain_2");
  assert.deepEqual(requestedAfter, [undefined, "domain_1"]);
});

test("returns null when Resend no longer has the domain", async () => {
  const domain = await findResendDomainByName(
    async () => ({
      domains: [],
      hasMore: false,
    }),
    "removed.example.com",
  );

  assert.equal(domain, null);
});
