import test from "node:test";
import assert from "node:assert";

import { imagePrompt } from "../../src/utils/prompt.js";

test("test imagePrompt", async () => {
  const res = imagePrompt({ imagePrompt: "Blue sky in Hawaii" });
  assert.equal(res, "Blue sky in Hawaii\n");

  const res2 = imagePrompt({ text: "Blue sky in Hawaii" });
  assert.equal(res2, "generate image appropriate for the text. text: Blue sky in Hawaii\n");

  const res3 = imagePrompt({ text: "Blue sky in Hawaii" }, "Style appropriate for business environment.");
  assert.equal(res3, "generate image appropriate for the text. text: Blue sky in Hawaii\nStyle appropriate for business environment.");
});
