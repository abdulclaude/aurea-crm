import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isPublicIpAddress,
  normalizePublicationDomain,
  verifyPublicationDomain,
  type PublicationDomainNetwork,
} from "@/features/publications/lib/domain-verification";

function network(input?: {
  txt?: readonly (readonly string[])[];
  addresses?: readonly { address: string; family: number }[];
  tlsError?: Error;
}): PublicationDomainNetwork {
  return {
    resolveTxt: async () => input?.txt ?? [["aurea-verification=token"]],
    lookup: async () => input?.addresses ?? [{ address: "8.8.8.8", family: 4 }],
    connectTls: async () => {
      if (input?.tlsError) throw input.tlsError;
    },
  };
}

describe("publication domain verification", () => {
  it("normalizes public internationalized hostnames", () => {
    assert.equal(
      normalizePublicationDomain("  BÜCHER.example. "),
      "xn--bcher-kva.example",
    );
    assert.throws(() => normalizePublicationDomain("localhost"));
    assert.throws(() => normalizePublicationDomain("https://example.com/path"));
  });

  it("rejects private, loopback, link-local, and documentation IPs", () => {
    for (const address of [
      "10.0.0.1",
      "127.0.0.1",
      "169.254.1.1",
      "172.16.0.1",
      "192.168.1.1",
      "::1",
      "fd00::1",
      "fe80::1",
      "2001:db8::1",
      "::ffff:127.0.0.1",
      "::ffff:c0a8:101",
      "::127.0.0.1",
    ]) {
      assert.equal(isPublicIpAddress(address), false, address);
    }
    assert.equal(isPublicIpAddress("8.8.8.8"), true);
    assert.equal(isPublicIpAddress("2606:4700:4700::1111"), true);
    assert.equal(isPublicIpAddress("::ffff:8.8.8.8"), true);
  });

  it("requires the exact TXT challenge", async () => {
    const result = await verifyPublicationDomain(
      { host: "publish.example.com", token: "token" },
      network({ txt: [["different=value"]] }),
    );
    assert.equal(result.ownershipVerified, false);
    assert.equal(result.tlsActive, false);
  });

  it("preserves ownership when a public-address or TLS check fails", async () => {
    const privateResult = await verifyPublicationDomain(
      { host: "publish.example.com", token: "token" },
      network({ addresses: [{ address: "127.0.0.1", family: 4 }] }),
    );
    assert.equal(privateResult.ownershipVerified, true);
    assert.equal(privateResult.tlsActive, false);

    const tlsResult = await verifyPublicationDomain(
      { host: "publish.example.com", token: "token" },
      network({
        addresses: [{ address: "8.8.8.8", family: 4 }],
        tlsError: new Error("certificate unavailable"),
      }),
    );
    assert.equal(tlsResult.ownershipVerified, true);
    assert.equal(tlsResult.tlsActive, false);
    assert.match(tlsResult.error ?? "", /certificate/);
  });

  it("reports verified ownership and TLS for a healthy public endpoint", async () => {
    const result = await verifyPublicationDomain(
      { host: "publish.example.com", token: "token" },
      network({ addresses: [{ address: "8.8.8.8", family: 4 }] }),
    );
    assert.deepEqual(result, {
      ownershipVerified: true,
      tlsActive: true,
      error: null,
    });
  });
});
