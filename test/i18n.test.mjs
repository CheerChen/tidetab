import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { messagesFor } from "../extension/newtab/i18n.mjs";

const extension = new URL("../extension/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", extension), "utf8"));
const locales = readdirSync(new URL("_locales/", extension));
const catalog = (locale) => JSON.parse(
  readFileSync(new URL(`_locales/${locale}/messages.json`, extension), "utf8"),
);

test("all supported locales translate the UI and provide a store summary within 132 characters", () => {
  assert.deepEqual(locales, ["en", "ja", "ko", "zh_CN", "zh_TW"]);
  assert.equal(manifest.default_locale, "en");
  assert.equal(manifest.description, "__MSG_extension_description__");
  const keys = Object.keys(catalog("en")).sort();
  for (const locale of locales) {
    const messages = catalog(locale);
    assert.deepEqual(Object.keys(messages).sort(), keys, locale);
    for (const key of keys) {
      assert.ok(messages[key].message.trim(), `${locale}: ${key}`);
    }
    assert.ok([...messages.extension_description.message].length <= 132, locale);
  }
});

test("Hong Kong, Macao, and Traditional Chinese UI tags use the bundled Traditional Chinese strings", async () => {
  for (const locale of ["zh-HK", "zh_MO", "zh-Hant", "zh-Hant-HK"]) {
    const native = { getUILanguage: () => locale, getMessage: (key) => catalog("en")[key]?.message };
    const message = await messagesFor(native, () => catalog("zh_TW"));
    assert.equal(message("language_tag"), "zh-Hant");
    assert.equal(message("search_label"), catalog("zh_TW").search_label.message);
  }
});

test("other UI tags use Chrome's native messages without loading the override", async () => {
  for (const locale of ["zh-CN", "zh-TW", "en-US", "ja", "ko", "pt-BR"]) {
    const native = { getUILanguage: () => locale, getMessage: (key) => `native:${key}` };
    const message = await messagesFor(native, () => assert.fail("unneeded override"));
    assert.equal(message("privacy_label"), "native:privacy_label");
  }
});
