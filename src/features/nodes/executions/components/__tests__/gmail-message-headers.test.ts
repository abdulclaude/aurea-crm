import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatGmailAddressList,
  formatGmailFromHeader,
  safeGmailHeaderValue,
} from "../gmail-message-headers";

describe("Gmail message headers", () => {
  it("formats ordinary address lists and sender names", () => {
    assert.equal(
      formatGmailAddressList("Recipients", "first@example.com, second@example.com"),
      "first@example.com, second@example.com",
    );
    assert.equal(
      formatGmailFromHeader('Aurea "Studio"', "studio@example.com"),
      'From: "Aurea \\"Studio\\"" <studio@example.com>',
    );
  });

  it("rejects CRLF and null-byte header injection", () => {
    for (const value of [
      "member@example.com\r\nBcc: attacker@example.com",
      "Welcome\nX-Injected: yes",
      "safe@example.com\0hidden",
    ]) {
      assert.throws(() => safeGmailHeaderValue("Header", value));
    }
  });
});
