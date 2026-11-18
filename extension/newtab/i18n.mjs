export async function messagesFor(i18n, loadTraditionalChinese) {
  const language = i18n.getUILanguage();
  // Chrome's extension catalogs have zh_TW, but no zh_HK or zh_MO.
  const usesTraditionalChinese = /^zh-(?:Hant(?:-|$)|HK$|MO$)/i.test(language.replaceAll("_", "-"));
  const traditional = usesTraditionalChinese ? await loadTraditionalChinese() : null;
  return (key) => traditional?.[key]?.message ?? i18n.getMessage(key);
}
