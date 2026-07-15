# Handover — NEWScrawer

## 專案目標 (Project Goal)
建立一個爬蟲文章閱讀網頁：使用者選擇「新聞」或「小說」類別 → 從 target.txt 定義的來源清單挑選網站 → 抓取標題列表 → 點擊標題抓取內文並顯示。

## 已完成進度 (Completed)
- 架構、版面規劃討論完成，程式碼已完整實作並通過本機測試
- target.txt 格式已定案：每筆來源含「類型」(NEWS/Novel)、「自訂標題」、「網址」
- 已用 WebFetch 查證兩個測試網站的實際結構：
  - technews.tw/category/ai/：有分頁，共1323頁，每頁約15-18篇文章
  - czbooks.net/n/uep7：章節目錄為單頁列完全部章節（近2000章），無後端分頁需求，但前端顯示需要分頁
- 已完成 Node.js + Express + Cheerio 後端與5個前端頁面（首頁、來源選擇、新聞分欄、小說章節列表、小說閱讀頁），用 Playwright 跑過桌面/手機兩種尺寸的完整流程截圖驗證，無 console 錯誤
- 已修正新聞內文夾帶廣告內容問題（詳見下方關鍵設定）
- 已建立 GitHub 遠端倉庫並推送：https://github.com/jamessun0919-ops/NewsNovelCrawer（Public，使用者已確認風險並選擇維持公開）

## 目前的瓶頸或停頓點 (Current Blocker/Status)
無待解決問題，本輪功能已完整實作、測試並推送。

## 下一步行動 (Next Steps)
1. 下次開始工作時，先檢查 target.txt 是否有新增項目（新的類型/自訂標題/網址）；如有，先與使用者確認是否要建立對應的新 parser，再動工
2. 本專案後續工作一律推送至 https://github.com/jamessun0919-ops/NewsNovelCrawer

## 關鍵設定與上下文 (Key Context & Rules)
- **技術棧**：Node.js + Express + Cheerio（後端）＋ 純 HTML/JS 前端（不用框架）
- **解析策略**：per-site adapter，不做通用啟發式解析；新網站一律先與使用者確認再建立規則
- **target.txt 讀取規則**：每次開工先檢查有無新增項目，發現新網站要先詢問使用者是否建立解析規則，不可自行擅自新增
- **頁面流程（共同）**：首頁(看新聞/看小說按鈕) → 來源選擇頁(讀取target.txt依類型篩選，純下拉選單/清單，**已取消**自由輸入網址欄位)
- **新聞頁面**：標題列表＋內文同一頁面左右分欄；RWD斷點768px，手機版(<768px)改單欄，用整畫面切換（列表/內文）取代並排；列表頁只抓「當頁」+ 若偵測到下一頁連結才顯示「下一頁」按鈕（不可全抓，technews.tw實測共1323頁）；文章內容用伺服器端記憶體快取（同次執行期間有效，重啟後清空）
- **小說頁面**：與新聞導覽邏輯不同，改為「跳轉頁」模式——章節列表獨立成頁（不與內文同框），點擊章節進入獨立內文頁；標題顯示完整文字（編號+內容，如「第123章　風雲驟變」）；章節目錄本身單頁列完（czbooks.net實測近2000章），前端用傳統數字分頁＋「跳到第N章」輸入框呈現；內文頁內建「上一章/下一章」按鈕連續閱讀，不需返回列表（parser需解析出next連結，採即時爬取，沿用伺服器記憶體快取，暫不做預爬）；讀取進度用 LocalStorage 儲存（純前端、單一裝置/瀏覽器使用情境，使用者確認不需跨裝置同步）
- **錯誤處理**：抓取失敗要顯示錯誤訊息＋提供重試按鈕，不可靜默失敗
- **部署情境**：純本機工具，僅使用者本人使用，不對外開放，不需考慮SSRF/多使用者濫用防護；GitHub倉庫目前為Public（曾提醒版權曝光風險，使用者確認後選擇維持公開）
- **czbooks.net 爬取須知**：該站有Cloudflare機器人防護，會依TLS連線指紋擋下Node.js內建fetch（403），但系統curl指令可正常通過；因此`server.js`中小說相關路由改用`fetchHtmlViaCurl`（透過`child_process.execFile`呼叫系統curl），新聞（technews.tw）路由則維持原本的Node fetch，兩者不可互換
- **技術新聞內文清洗規則**：`parsers/technews.js`的`parseArticle`會裁掉「延伸閱讀」區塊（`.extended-reading-section`）及其後內容，並移除所有標記`style="display:none"`的元素（咖啡贊助彈窗、AI Q&A小工具等）——這些在原網站靠CSS/JS預設隱藏，只抓靜態HTML會變成直接顯示，此規則之後若technews.tw改版導致廣告又跑出來，可比照此模式排查
