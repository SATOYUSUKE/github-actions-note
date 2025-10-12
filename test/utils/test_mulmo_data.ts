/*
import { updateMultiLingualTexts } from "../../src/translate.js";

import test from "node:test";
import assert from "node:assert";

const beat = {
  speaker: "",
  text: "123",
  multiLingualTexts: {},
  instructions: "",
  imagePrompt: "",
  image: "",
  filename: "",
};

const data = {
  title: "",
  description: "",
  reference: "",
  speed: 1.666,
  aspectRatio: "9:16",
  tts: "",
  lang: "ja",
  beats: [],
  filename: "",
  speakers: {},
  text2image: {
    model: "",
    size: "",
    aspectRatio: "",
    style: "",
    provider: "",
  },
  imagePath: "",
  omitCaptions: true,
  padding: 1,
};
test("test updateMultiLingualTexts not update", async () => {
  const originalBeat = {
    ...beat,
  };
  const originalData = {
    ...data,
    beats: [originalBeat],
  };

  const updateBeat = {
    ...beat,
  };
  const updateData = {
    ...data,
    beats: [updateBeat],
  };
  const ret = updateMultiLingualTexts(originalData, updateData);
  assert.equal(ret.beats[0].text, "123");
});

test("test updateMultiLingualTexts update", async () => {
  const originalBeat = {
    ...beat,
    text: "123123",
  };
  const originalData = {
    ...data,
    beats: [originalBeat],
  };

  const updateBeat = {
    ...beat,
  };
  const updateData = {
    ...data,
    beats: [updateBeat],
  };
  const ret = updateMultiLingualTexts(originalData, updateData);
  assert.equal(ret.beats[0].text, "123123");
});

test("test updateMultiLingualTexts update len", async () => {
  const originalBeat = {
    ...beat,
    text: "123123",
  };
  const originalData = {
    ...data,
    beats: [originalBeat],
  };

  const updateBeat = {
    ...beat,
  };
  const updateData = {
    ...data,
    beats: [updateBeat, originalBeat],
  };
  const ret = updateMultiLingualTexts(originalData, updateData);
  assert.equal(ret.beats.length, 1);
  assert.equal(ret.beats[0].text, "123123");
  // assert.equal(ret.beats[0].text, "123123");
});

test("test updateMultiLingualTexts update len", async () => {
  const originalBeat = {
    ...beat,
    text: "123123",
    imagePrompt: "imageOriginal",
  };
  const originalData = {
    ...data,
    beats: [originalBeat],
  };

  const updateBeat = {
    ...beat,
    imagePrompt: "imageUpdate",
  };
  const updateData = {
    ...data,
    beats: [updateBeat, originalBeat],
  };
  const ret = updateMultiLingualTexts(originalData, updateData);
  assert.equal(ret.beats.length, 1);
  assert.equal(ret.beats[0].text, "123123");
  assert.equal(ret.beats[0].imagePrompt, "imageOriginal");
  // assert.equal(ret.beats[0].text, "123123");
});
*/
