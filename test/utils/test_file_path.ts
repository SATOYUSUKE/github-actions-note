import { getBaseDirPath, getFullPath } from "../../src/utils/file.js";

import test from "node:test";
import assert from "node:assert";

test("test getBaseDirPath pwd", async () => {
  const path = getBaseDirPath();
  assert.deepStrictEqual(path, process.cwd());
});

test("test getBaseDirPath absolute", async () => {
  const path = getBaseDirPath("/foo//aa");
  assert.deepStrictEqual(path, "/foo/aa");
});

test("test getBaseDirPath related", async () => {
  const path = getBaseDirPath("foo//aa");
  assert.deepStrictEqual(path, process.cwd() + "/foo/aa");
});

// arg1 = related(foo), full(/foo//aa), undefined,  / arg2 = related(bar) full(//bar/bb)

test("test getFullPath 1", async () => {
  // join path based on cwd
  const path = getFullPath("foo", "bar");
  assert.deepStrictEqual(path, process.cwd() + "/foo/bar");
});

test("test getFullPath 2", async () => {
  // arg2
  const path = getFullPath("foo", "//bar/bb");
  assert.deepStrictEqual(path, "/bar/bb");
});

test("test getFullPath 3", async () => {
  // join path
  const path = getFullPath("/foo//aa", "bar");
  assert.deepStrictEqual(path, "/foo/aa/bar");
});

test("test getFullPath 4", async () => {
  // arg2
  const path = getFullPath("/foo//aa", "//bar/bb");
  assert.deepStrictEqual(path, "/bar/bb");
});

test("test getFullPath 5", async () => {
  // arg2 based on cwd
  const path = getFullPath(undefined as unknown as string, "bar");
  assert.deepStrictEqual(path, process.cwd() + "/bar");
});

test("test getFullPath 6", async () => {
  // arg2
  const path = getFullPath(undefined as unknown as string, "//bar/bb");
  assert.deepStrictEqual(path, "/bar/bb");
});
