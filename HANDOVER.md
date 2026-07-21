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
- **帳號密碼機制已實作完成**（為了部署到雲端常駐服務，使用者無法自己提供穩定開機的 server）：單一帳號、session-based 登入，涵蓋所有頁面與 API 路由，詳見下方關鍵設定
- **已實際部署到 Render**（https://newsnovelcrawer.onrender.com ，免費方案）：帳密機制在雲端環境驗證正常
- **發現並解法 czbooks.net 在 Render 上抓不到小說章節的問題**：Render 的機房 IP 被 Cloudflare 視為「已知雲端/機房來源」，回傳的是 `Just a moment...` JS 人機驗證頁而非真正內容（不是 curl 消失、也不是程式邏輯錯誤，是 IP 信譽層級的阻擋，比先前繞過的 TLS 指紋辨識更難處理）；此問題**尚未真正解決**，見下方「目前的瓶頸」
- **新增小說來源 `tw.hjwzw.com`（黃金屋）的完整 parser**（`parsers/hjwzw.js`）：章節目錄單頁列完（1450章），本機 Node fetch 即可正常存取（不像 czbooks.net 需要 curl 繞過），已通過本機測試
- **評估後放棄新增 `www.quanben.io`（全本小說）來源**：該站章節目錄頁的 HTML 只直接放出前24章與後24章，中間章節需呼叫帶自訂加密簽章參數的 JSONP API 才能取得（刻意的反爬蟲設計），逆向工程該簽章邏輯後仍回傳「參數錯誤」；考量到 target.txt 裡這三個小說來源其實是同一本小說（絕頂唐門），czbooks.net 與 hjwzw.com 已能完整涵蓋，經與使用者確認後決定放棄此來源，已從 target.txt 移除
- **`server.js` 已改為依來源網址自動選擇對應 parser**（`getNovelSite` 函式，依 hostname 判斷），不再寫死呼叫 czbooks，novel 相關的兩支 API 路由（`/api/novel/chapters`、`/api/novel/chapter`）都已改用這個機制
- 使用者已在 Render 上實測確認 `tw.hjwzw.com` 章節列表與內文都能正確讀取；`czbooks.net` 使用者已在 target.txt 該筆標題加註「反爬未處理」，明確表示**暫不處理**，非本輪待辦
- **小說閱讀頁新增字體大小調整功能**：`novel-reader.html` 新增 A-/A+ 按鈕（14px～28px，每次±2px），設定存 LocalStorage（key: `novel-reader-font-size`），跳章不會重置；本機已檢查程式邏輯與既有風格一致，但**這個 session 沒有瀏覽器自動化工具，未做過實際畫面截圖驗證**，待使用者本機確認
- **PWA「加入主畫面」基礎建設已完成**（僅此功能，不含離線快取/推播，使用者明確表示範圍只要這個）：
  - `public/manifest.json`：name/short_name「文章閱讀器」、`start_url: "/"`、`display: standalone`、theme_color `#2f6feb`（比照網站既有主色）
  - 圖示：`public/icons/icon-192.png`、`icon-512.png`、`apple-touch-icon.png`，用 PowerShell + .NET `System.Drawing` 產生（環境內沒有 ImageMagick 等圖片工具，改用 `scripts/generate-icons.ps1` 這支一次性腳本畫「閱」字白字+品牌藍底），如需重新產生圖示可重跑這支腳本
  - `server.js` 新增 `/manifest.json`、`/icons/*` 兩個**不需登入**即可存取的路由（比照 `login.html`／`style.css` 的例外處理）——因為瀏覽器判斷「可否加入主畫面」時，會在使用者尚未登入、還停留在 `/login.html` 的當下就去抓 manifest 與圖示，這兩者若被 `requireAuth` 擋住，安裝功能會偵測不到
  - 6 個前端頁面的 `<head>` 都補上 `<link rel="manifest">`、`theme-color`、`apple-touch-icon` 與 `apple-mobile-web-app-*` 系列 meta tag（iOS Safari 不吃 web manifest，需要這組 meta tag 才能「加入主畫面」時有正確圖示與全螢幕模式）
  - 這部分也尚未經瀏覽器實測（無自動化工具），待使用者在手機瀏覽器上實際「加入主畫面」驗證圖示與啟動效果

## 目前的瓶頸或停頓點 (Current Blocker/Status)
字體調整功能與 PWA 加入主畫面功能都已寫完並通過程式碼層級檢查，但**都還沒經過使用者實機測試、也還沒推送**（這個 session 沒有瀏覽器自動化工具可用，無法自行截圖驗證 UI）。等使用者確認兩項功能實際運作正常，再一起推送。

czbooks.net 在 Render 上的 Cloudflare 阻擋問題，使用者已表態暫不處理（target.txt 已加註），非目前待辦，但解法選項還是先記錄著，之後有需要可以直接接續：
- A. 在 Render 上加 headless 瀏覽器（如 Puppeteer）自動解 JS 驗證頁——免費但變慢、吃記憶體，免費方案 512MB 可能不夠、得升級付費方案
- B. 付費 residential proxy 服務轉發 czbooks.net 的請求——簡單可靠但有持續性月費
- C. 雲端版只提供新聞 + hjwzw.com 小說，czbooks.net 只在本機用——不用額外花錢，但雲端版看不到 czbooks.net 這個來源

## 下一步行動 (Next Steps)
1. 下次開始工作時，先檢查 target.txt 是否有新增項目（新的類型/自訂標題/網址）；如有，先與使用者確認是否要建立對應的新 parser，再動工
2. 請使用者測試字體調整按鈕與「加入主畫面」功能，確認無誤後推送到 GitHub（Render 會自動重新部署）
3. 使用者已表示 PWA 下一步可能想加離線閱讀或其他功能，但目前只確認要「加入主畫面」這一項，其餘功能待使用者明確提出後再討論架構（離線快取會牽涉到 Service Worker 如何處理已登入內容的快取邊界，需要先討論清楚再動工，見 CHATLOG）
4. 本專案後續工作一律推送至 https://github.com/jamessun0919-ops/NewsNovelCrawer

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
- **帳號密碼機制**（為部署到雲端常駐服務而建立，單一帳號、非多使用者系統）：
  - 套件：`express-session`（session 管理）、`bcryptjs`（密碼雜湊，純JS版本免雲端編譯原生模組）、`express-rate-limit`（登入防暴力破解）、`dotenv`（本機讀取 `.env`）
  - 帳密存放：不寫在程式碼或 git 中，透過環境變數 `AUTH_USERNAME`、`AUTH_PASSWORD_HASH`（bcrypt hash，非明文）設定；產生 hash 用 `node scripts/hash-password.js "密碼"`，本機 `.env`（已加入 `.gitignore`）與 Render 上的環境變數目前都已換成使用者自己設定的帳號 `admin` 與密碼（非測試用的 test1234），`SESSION_SECRET` 本機與雲端各自獨立設定
  - 保護範圍：`server.js` 中 `requireAuth` middleware 擋在 `express.static` 與所有 `/api/*` 路由之前，未登入存取頁面會 302 導向 `/login.html`，未登入呼叫 API 會回 401 JSON；只有 `GET /login.html`、`GET /style.css`、`POST /api/login`、`POST /api/logout` 這四個路由不需要登入即可存取
  - Session：cookie 設定 `httpOnly`、`secure: 'auto'`（搭配 `app.set('trust proxy', 1)`，讓 express-session 自動依連線是否為 https 判斷，雲端平台在自己的 proxy 終止 TLS 時仍能正確運作）、`sameSite: 'lax'，有效期限 7 天；session store 用 express-session 預設的記憶體儲存（in-memory），這是刻意的取捨——單一使用者、少量 session 不需要額外引入 Redis，缺點是 server 重啟後所有登入狀態會清空，需重新登入，使用者已知悉此取捨
  - Rate limit：`/api/login` 15分鐘內最多5次請求（成功與失敗皆計入次數），超過回 429
  - 登出：首頁右上角「登出」連結（`public/index.html`），呼叫 `POST /api/logout` 銷毀 session 後導回登入頁；其餘頁面目前未放登出按鈕（可從首頁返回登出，未來如需要可再加到每頁 header）
  - 已實測 Render 免費方案的容器環境有內建系統 curl（`fetchHtmlViaCurl` 在 Render 上執行不會噴 command not found），czbooks.net 抓不到內容是 Cloudflare IP 信譽阻擋，不是 curl 缺失問題（詳見上方「目前的瓶頸」）
- **多來源小說 parser 派發機制**：`server.js` 的 `getNovelSite(url)` 依網址 hostname 決定要用哪個 parser 與哪種 fetch 方式（czbooks.net → `czbooks.js` + `fetchHtmlViaCurl`；hjwzw.com → `hjwzw.js` + 一般 `fetchHtml`，此站沒有 Cloudflare 這類機器人防護，不需要繞過），novel 相關的兩支 API 路由都透過這個函式取得對應 parser，不再寫死；新增小說來源時要在這裡加一個 hostname 判斷分支
- **`parsers/hjwzw.js` 清洗規則**：章節列表用 `#tbchapterlist a` 選取；章節內文的容器是 `div[style*="text-indent: 2em"]`，但頁面下方另有一個內容相同 inline style 的短 div（「請記住本站域名」廣告字樣），要取 `.first()` 才是真正內文；內文開頭還有兩段站方樣板文字混在正文容器內（一段是純文字＋`<b>`標籤的域名提醒、不包在`<p>`裡；一段是包在第一個`<p>`裡的書名+章節標題重複），需要各自移除，見程式內註解；「上一章」連結在第一章時會指向章節ID為`,0`的死連結（需判斷過濾掉，回傳null），「下一章」連結在最後一章直接不存在`<a>`標籤（純文字「末頁」）
