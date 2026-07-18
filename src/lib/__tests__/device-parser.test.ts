import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseIPAddress } from "../device-parser";

describe("tracking IP enrichment", () => {
  it("does not infer geography for an absent or public address", async () => {
    assert.deepEqual(await parseIPAddress("unknown"), {
      countryCode: "Unknown",
      countryName: "Unknown",
      region: "Unknown",
      city: "Unknown",
    });
    assert.deepEqual(await parseIPAddress("203.0.113.10"), {
      countryCode: "Unknown",
      countryName: "Unknown",
      region: "Unknown",
      city: "Unknown",
    });
  });

  it("keeps local development traffic identifiable without a provider call", async () => {
    assert.deepEqual(await parseIPAddress("127.0.0.1"), {
      countryCode: "LOCAL",
      countryName: "Localhost",
      region: "Development",
      city: "Local",
    });
  });
});
