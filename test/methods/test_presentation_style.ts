import test from "node:test";
import assert from "node:assert";

import { MulmoPresentationStyleMethods } from "../../src/methods/mulmo_presentation_style.js";

test("defaultSpeaker isDefault", async () => {
  const presentationStyle = {
    speechParams: {
      provider: "openai",
      speakers: {
        Presenter: {
          displayName: {
            en: "Presenter",
          },
          voiceId: "shimmer",
          isDefault: true,
        },
      },
    },
  };
  const result = MulmoPresentationStyleMethods.getDefaultSpeaker(presentationStyle);
  assert.equal(result, "Presenter");
});

test("defaultSpeaker no isDefault", async () => {
  const presentationStyle = {
    speechParams: {
      provider: "openai",
      speakers: {
        Presenter: {
          displayName: {
            en: "Presenter",
          },
          voiceId: "shimmer",
        },
      },
    },
  };
  const result = MulmoPresentationStyleMethods.getDefaultSpeaker(presentationStyle);
  assert.equal(result, "Presenter");
});

test("defaultSpeaker no isDefault two speaker", async () => {
  const presentationStyle = {
    speechParams: {
      provider: "openai",
      speakers: {
        Presenter1: {
          displayName: {
            en: "Presenter",
          },
          voiceId: "shimmer",
        },
        Presenter2: {
          displayName: {
            en: "Presenter",
          },
          voiceId: "shimmer",
        },
      },
    },
  };
  const result = MulmoPresentationStyleMethods.getDefaultSpeaker(presentationStyle);
  assert.equal(result, "Presenter1");
});

test("defaultSpeaker isDefault two speaker", async () => {
  const presentationStyle = {
    speechParams: {
      provider: "openai",
      speakers: {
        Presenter2: {
          displayName: {
            en: "Presenter",
          },
          voiceId: "shimmer",
          isDefault: true,
        },
        Presenter1: {
          displayName: {
            en: "Presenter",
          },
          voiceId: "shimmer",
          isDefault: true,
        },
      },
    },
  };
  const result = MulmoPresentationStyleMethods.getDefaultSpeaker(presentationStyle);
  assert.equal(result, "Presenter1");
});

test("defaultSpeaker error no speaker", async () => {
  const presentationStyle = {
    speechParams: {
      provider: "openai",
      speakers: {},
    },
  };
  await assert.rejects(async () => {
    MulmoPresentationStyleMethods.getDefaultSpeaker(presentationStyle);
  });
});
