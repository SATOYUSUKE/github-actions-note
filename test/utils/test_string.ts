import { splitIntoSentencesJa, recursiveSplitJa, replacePairsJa, replacementsJa } from "../../src/utils/string.js";

import test from "node:test";
import assert from "node:assert";

const text = "あかさたなはまやらわ。東京特許許可局！今日はいい天気ですか？";

test("test splitIntoSentences", async () => {
  const ret = splitIntoSentencesJa(text, "。", 7);
  assert.deepStrictEqual(ret, ["あかさたなはまやらわ。", "東京特許許可局！今日はいい天気ですか？"]);
});

test("test recursiveSplit", async () => {
  const ret = recursiveSplitJa(text);
  const expect = ["あかさたなはまやらわ。", "東京特許許可局！", "今日はいい天気ですか？"];
  assert.deepStrictEqual(ret, expect);
});

test("test replacePairsJa", async () => {
  const ret = replacePairsJa(replacementsJa)("OpenAIはAnthropicではありません");
  const expect = "オープンエーアイはアンスロピックではありません";
  assert.deepStrictEqual(ret, expect);
});
