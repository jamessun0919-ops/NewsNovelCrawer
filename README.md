# NewsNovelCrawer

爬蟲文章閱讀網頁：選擇「看新聞」或「看小說」，從設定好的來源清單挑選網站，抓取標題列表，點擊標題進入下一層抓取內文並顯示。

> 本專案為純本機工具（不對外部署），無公開 Demo 連結。啟動方式：`npm install` → `npm start` → 開啟 http://localhost:3000

## 專案目標

讓使用者輸入/設定目標網址後，依網站類型（新聞／小說）以不同的瀏覽方式，抓取標題列表與內文並閱讀，不需要自己開原始網站點來點去。

## 計畫架構

```
target.txt          # 來源設定檔：類型(NEWS/Novel)、自訂標題、網址
targetParser.js      # 解析 target.txt
server.js            # Express 伺服器與 API 路由
parsers/
  technews.js         # technews.tw 新聞列表/內文解析
  czbooks.js           # czbooks.net 小說章節列表/內文解析
public/
  index.html           # 首頁：看新聞／看小說
  sources.html          # 來源選擇（依類型篩選 target.txt）
  news.html              # 新聞：標題列表＋內文左右分欄，RWD 768px 斷點
  novel-list.html         # 小說：章節列表，分頁＋跳章
  novel-reader.html        # 小說：閱讀頁，上一章/下一章，LocalStorage 記錄進度
```

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
- [x] czbooks.net 的 Cloudflare 防護繞過（改用系統 curl 子行程）
- [x] Playwright 桌面／模擬手機雙尺寸完整流程驗證

## 未完成事項

- 目前僅支援 target.txt 中已定義的 technews.tw、czbooks.net 兩個來源；新增其他網站需另外撰寫對應 parser
- 小說「下一章」目前為即時爬取，未做預爬快取（如需更順暢的翻頁體驗可再評估）
- 帳號密碼機制：目前無登入驗證，僅限本機或私人網路（區網/Tailscale）使用；若未來要公開部署，需另外設計登入機制
