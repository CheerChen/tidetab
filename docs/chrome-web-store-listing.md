# TideTab · Chrome 网上应用店商品详情草稿

## 产品详情

| 后台字段 | 首发填写 |
| --- | --- |
| 软件包中的标题 | TideTab（从 manifest 读取，保留） |
| 软件包中的摘要 | 从 `extension/_locales/<locale>/messages.json` 的 `extension_description` 读取。 |
| 类别 | **功能与界面（Functionality & UI）**。TideTab 替换 Chrome 新标签页，主要用途是快速打开链接。 |
| 语言 | 默认 **英语**；为简体中文、繁體中文、日本語和한국어分别填写详细说明。香港和台湾共用繁中界面及商店文案，不单独建香港语言条目。 |

### 简体中文详细说明（复制下方纯文本）

```text
打开新标签页，就能回到最近在跟进的 Jira 工单、GitHub PR 和 Confluence 文档。不用手动收藏：TideTab 根据 Chrome 浏览历史，把近期常打开的链接排在前面。不再常用的链接会逐渐往下排。

• 三栏显示 Jira、GitHub 和 Confluence 的常用链接。
• GitHub PR 和仓库分别排列。同一个 PR 的 Files 和 Commits 页面合并为一个入口。
• 按 / 开始搜索，可输入页面标题、工单编号、PR 编号或网址。按 Enter 打开第一条结果。

TideTab 会替换 Chrome 的新标签页。它读取浏览历史来排列链接，仅在当前 Chrome 配置中处理和保存这些数据，不会上传。无需注册 TideTab 账号。
```

### English

```text
Open a new tab to get back to the Jira issue, GitHub pull request, or Confluence page you were working on. TideTab ranks links from your Chrome browsing history, so pages you visit often and recently appear first. You don’t have to bookmark them.

• Find your frequently visited Jira, GitHub, and Confluence links in three columns.
• See pull requests alongside repositories in the GitHub column. The Files and Commits views of the same pull request count toward one link.
• Press / to search by title, issue key, PR number, or URL. Press Enter to open the first result.

TideTab replaces Chrome’s new tab page. It reads your browsing history to rank links and keeps that data in your Chrome profile. It does not upload the data or require a TideTab account.
```

### 繁體中文

```text
開啟新分頁，就能回到最近在追蹤的 Jira 議題、GitHub PR 和 Confluence 文件。不必手動加書籤：TideTab 根據 Chrome 瀏覽記錄排序，讓近期常開啟的連結排在前面。

• 以三欄顯示 Jira、GitHub 和 Confluence 的常用連結。
• GitHub PR 和儲存庫各自排序。同一個 PR 的 Files 和 Commits 頁面會合併為一個連結。
• 按 / 開始搜尋，可輸入頁面標題、議題編號、PR 編號或網址。按 Enter 開啟第一筆結果。

TideTab 會取代 Chrome 的新分頁。擴充功能會讀取瀏覽記錄來排列連結，只在目前的 Chrome 設定檔中處理與儲存這些資料，不會上傳。不必註冊 TideTab 帳號。
```

### 日本語

```text
新しいタブを開くだけで、最近見ていた Jira の課題や GitHub のプルリクエスト、Confluence のページに戻れます。TideTab は Chrome の閲覧履歴をもとに、最近よく開いたリンクを上に表示します。ブックマークに登録する必要はありません。

・Jira、GitHub、Confluence のリンクを3つの列に分けて表示します。
・GitHub のプルリクエストはリポジトリとは別に表示します。同じプルリクエストの Files や Commits は1つのリンクにまとめます。
・/ キーで検索欄に移動し、ページ名、課題キー、PR 番号、URL で検索できます。Enter キーで最初の結果を開きます。

TideTab は Chrome の新しいタブページを置き換える拡張機能です。リンクの並び順を決めるために閲覧履歴を読み取ります。データの処理と保存は Chrome のプロファイル内で行い、外部には送信しません。TideTab のアカウント登録は不要です。
```

### 한국어

```text
새 탭에서 최근에 보던 Jira 이슈, GitHub 풀 리퀘스트, Confluence 문서로 돌아갈 수 있습니다. TideTab은 Chrome 방문 기록을 바탕으로 최근에 자주 열었던 링크를 위에 표시합니다. 북마크를 따로 추가할 필요가 없습니다.

• Jira, GitHub, Confluence에서 자주 여는 링크를 세 열로 나눠 보여 줍니다.
• GitHub 풀 리퀘스트와 저장소는 별도로 표시합니다. 같은 풀 리퀘스트의 Files와 Commits 페이지는 링크 하나로 묶습니다.
• / 키를 눌러 제목, 이슈 키, PR 번호 또는 URL을 검색하세요. Enter 키를 누르면 첫 번째 결과가 열립니다.

TideTab은 Chrome의 새 탭 페이지를 대체하는 확장 프로그램입니다. 링크를 정렬하기 위해 방문 기록을 읽으며, 데이터는 현재 Chrome 프로필에서만 처리하고 저장합니다. 외부로 업로드하지 않으며 TideTab 계정도 필요하지 않습니다.
```

## 图片资源

| 后台字段 | 首发处理 |
| --- | --- |
| 商店图标 | 上传 [蓝色潮汐标签图标](../extension/icons/icon-128.png)，128 × 128 PNG。 |
| 屏幕截图 | **至少 1 张，最多 5 张。待制作。** 优先用 1280 × 800，也接受 640 × 400。使用 JPEG 或无透明通道的 24 位 PNG，直角、不额外留边。 |
| YouTube 视频 | 可选，首发留空。 |
| 小型宣传图块 | 可选，首发可留空。若补做，尺寸为 440 × 280，JPEG 或无透明通道的 24 位 PNG。 |
| 顶部宣传图块 | 可选，首发留空。若补做，尺寸为 1400 × 560，JPEG 或无透明通道的 24 位 PNG。 |

截图建议按以下顺序上传。只用虚构数据，按实际打包版本截图，不用原型对比页或原型中的 40 行冒充正式界面。

1. **新标签页全貌**：居中的 TideTab Logo、全宽搜索框、三栏真实布局和示例链接。首图用这一张。
2. **快速查找**：搜索一个虚构工单编号或 PR 标题，展示筛选结果。
3. **本地数据说明**：右上角 ⓘ 展开，展示浏览历史用途。

## 其他字段

| 后台字段 | 首发填写 |
| --- | --- |
| 官方网址 | 暂留空。仅在有通过 Google Search Console 验证、由你控制的项目网站时选择。 |
| 首页网址 | 有无需登录的公开项目首页再填；如果没有，先留空。 |
| 支持信息页面网址 | 有公开、可提交问题的 Issues 或支持页再填；如果没有，先留空。 |
| 成人内容 | **关闭**。 |
| 商品支持 | 建议**开启**商店内的商品支持，并在后台查看反馈。与扩展的公开范围分开设置。 |
| 公开范围 | 当前只保存草稿，不送审。准备正式首发时，在「分发」页选择「公开」。 |

隐私政策 URL 属于「隐私权」页，不要填到首页网址或支持网址一栏。送审前将 [PRIVACY.md](../PRIVACY.md) 发布为无需登录的公开链接。权限和数据披露的填写内容见[首发清单](chrome-web-store.md#privacy-practices-fields)。

参考：[商品详情最佳实践](https://developer.chrome.com/docs/webstore/best-listing?hl=zh-cn) · [后台字段说明](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) · [图片规范](https://developer.chrome.com/docs/webstore/images) · [类别指南](https://developer.chrome.com/docs/webstore/best-practices#choose-your-extensions-category-well)
