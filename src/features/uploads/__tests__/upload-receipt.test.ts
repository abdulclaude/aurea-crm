import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createUploadReceipt,
  verifyUploadReceipt,
} from "@/features/uploads/upload-receipt";

const upload = {
  key: "waiver-key",
  locationId: "location-a",
  organizationId: "org-a",
  route: "waiverDocument" as const,
  url: "https://app.ufs.sh/f/waiver-key",
  userId: "user-a",
};

test("waiver upload receipts bind object and tenant scope", () => {
  const key = "test-upload-receipt-key-at-least-32-characters";
  const receipt = createUploadReceipt(upload, key);
  assert.equal(verifyUploadReceipt(receipt, upload, key), true);
  assert.equal(
    verifyUploadReceipt(receipt, { ...upload, locationId: "location-b" }, key),
    false,
  );
  assert.equal(
    verifyUploadReceipt(receipt, { ...upload, key: "another-key" }, key),
    false,
  );
});
