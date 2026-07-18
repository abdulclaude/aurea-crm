import assert from "node:assert/strict";
import test from "node:test";

import { parsePublicMediaUrl } from "../public-media-url";

test("accepts only credential-free public HTTPS media URLs", () => {
  assert.equal(
    parsePublicMediaUrl("https://media.example.test/classes/intro.mp4"),
    "https://media.example.test/classes/intro.mp4",
  );
  assert.equal(
    parsePublicMediaUrl("https://media.example.test/video.mp4?token=secret"),
    null,
  );
  assert.equal(
    parsePublicMediaUrl("https://user:secret@media.example.test/video.mp4"),
    null,
  );
  assert.equal(parsePublicMediaUrl("http://media.example.test/video.mp4"), null);
  assert.equal(parsePublicMediaUrl("https://127.0.0.1/video.mp4"), null);
  assert.equal(parsePublicMediaUrl("https://media.internal.local/video.mp4"), null);
});
