# NewsNovelCrawer

**[線上使用 →](https://newsnovelcrawer.onrender.com)**（Render 免費方案部署，需登入；免費方案閒置後會 spin down，首次開啟可能要等待約 30-50 秒冷啟動）

爬蟲文章閱讀網頁：選擇「看新聞」或「看小說」，從設定好的來源清單挑選網站，抓取標題列表，點擊標題進入下一層抓取內文並顯示。

本機啟動方式：複製 `.env.example` 為 `.env` 並設定帳密 → `npm install` → `npm start` → 開啟 http://localhost:3000

## 專案目標

讓使用者輸入/設定目標網址後，依網站類型（新聞／小說）以不同的瀏覽方式，抓取標題列表與內文並閱讀，不需要自己開原始網站點來點去。

## 計畫架構

```
target.txt          # 來源設定檔：類型(NEWS/Novel)、自訂標題、網址
targetParser.js      # 解析 target.txt
server.js            # Express 伺服器、API 路由、帳號密碼驗證
scripts/
  hash-password.js     # 一次性工具：產生密碼的 bcrypt hash
  generate-icons.ps1    # 一次性工具：產生 PWA 圖示
parsers/
  technews.js         # technews.tw 新聞列表/內文解析
  czbooks.js           # czbooks.net 小說章節列表/內文解析
  hjwzw.js              # tw.hjwzw.com 小說章節列表/內文解析
public/
  manifest.json          # PWA manifest（加入主畫面）
  icons/                  # PWA 圖示（192/512/apple-touch-icon）
  login.html            # 登入頁
  index.html           # 首頁：看新聞／看小說
  sources.html          # 來源選擇（依類型篩選 target.txt）
  news.html              # 新聞：標題列表＋內文左右分欄，RWD 768px 斷點
  novel-list.html         # 小說：章節列表，分頁＋跳章
  novel-reader.html        # 小說：閱讀頁，上一章/下一章，LocalStorage 記錄進度，字體大小調整
```

啟動前需設定環境變數（複製 `.env.example` 為 `.env` 並填入自己的帳密）：`AUTH_USERNAME`、`AUTH_PASSWORD_HASH`（用 `node scripts/hash-password.js "密碼"` 產生）、`SESSION_SECRET`。

技術棧：Node.js + Express + Cheerio（後端）＋ 純 HTML/JS 前端（無框架）。

解析策略採 per-site adapter：每個網站一個獨立 parser，新增網站需先確認再建立對應規則。

## 已完成進度

- [x] 首頁類型選擇（看新聞／看小說）→ 來源選擇（讀取 target.txt）
- [x] 新聞：列表＋內文左右分欄，支援分頁（只抓當頁＋下一頁按鈕），內文伺服器端記憶體快取
- [x] 新聞：RWD 768px 斷點，手機版整畫面切換（列表／內文）
- [x] 新聞：過濾「延伸閱讀」與網站預設隱藏的廣告/贊助小工具，只保留文章本體
- [x] 小說：章節列表獨立頁面，傳統分頁＋跳到第N章
- [x] 小說：閱讀頁支援上一章/下一章連續閱讀，LocalStorage 記錄閱讀進度
- [x] 錯誤處理：抓取失敗顯示錯誤訊息＋提供重試按鈕
- [x] czbooks.net 的 Cloudflare 防護繞過（改用系統 curl 子行程，本機環境有效）
- [x] Playwright 桌面／模擬手機雙尺寸完整流程驗證
- [x] 帳號密碼機制：單一帳號登入（session-based），涵蓋所有頁面與 API，含登入失敗次數限制，為部署到雲端常駐服務做準備
- [x] 部署到 Render（常駐型服務，免費方案）
- [x] 新增小說來源 tw.hjwzw.com，`server.js` 依來源網址自動派發對應 parser（使用者已在 Render 上實測正常）
- [x] 小說閱讀頁字體大小調整（A-/A+ 按鈕，LocalStorage 記憶設定）
- [x] PWA「加入主畫面」：manifest.json、圖示、iOS 專用 meta tag

## 未完成事項

- **czbooks.net 在 Render 雲端環境無法正常抓取**：Cloudflare 將 Render 的機房 IP 判定為高風險來源，一律回傳 JS 人機驗證頁而非真正內容（本機環境不受影響，正常運作）。使用者已表示暫不處理。待評估解法：(A) 加 headless 瀏覽器自動解驗證頁、(B) 改用付費 residential proxy、(C) 雲端版不提供此來源
- 目前僅支援 target.txt 中已定義的 technews.tw、czbooks.net、tw.hjwzw.com 三個來源；新增其他網站需另外撰寫對應 parser（已評估過 www.quanben.io，因其章節目錄需要繞過自訂反爬蟲簽章機制，複雜度與效益不成比例，故未支援）
- 小說「下一章」目前為即時爬取，未做預爬快取（如需更順暢的翻頁體驗可再評估）
- PWA 目前僅支援加入主畫面，離線閱讀、更新推播等功能尚未討論架構，待使用者提出需求後再評估
