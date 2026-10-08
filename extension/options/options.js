// Reads the two exported JSON files and hands them to background.js, which owns the database.
const status = document.querySelector("#status");
document.querySelector("#import").addEventListener("click", async () => {
  const [urlsFile] = document.querySelector("#urls").files;
  const [visitsFile] = document.querySelector("#visits").files;
  if (!urlsFile || !visitsFile) {
    status.textContent = "请同时选择两个文件。";
    return;
  }
  status.textContent = "导入中……";
  const [urls, visits] = [JSON.parse(await urlsFile.text()), JSON.parse(await visitsFile.text())];
  const reply = await chrome.runtime.sendMessage({ type: "import", urls, visits });
  status.textContent = reply.ok ? `已导入 ${visits.length} 条访问，快照已重建。` : `导入失败：${reply.error}`;
});
