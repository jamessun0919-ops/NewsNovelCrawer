# Handover — NEWScrawer

## 專案目標 (Project Goal)
建立一個爬蟲文章閱讀網頁：使用者選擇「新聞」或「小說」類別 → 從 target.json 定義的來源清單挑選網站 → 抓取標題列表 → 點擊標題抓取內文並顯示。

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
- **小說閱讀頁字體大小調整功能已完成並經使用者確認**：`novel-reader.html` 新增 A-/A+ 按鈕（14px～28px，每次±2px），設定存 LocalStorage（key: `novel-reader-font-size`），跳章不會重置；預設字體大小依使用者要求從17px調整為22px（已有儲存設定的使用者不受影響，只影響未設定過的初次使用情境）
- **PWA「加入主畫面」基礎建設已完成**（僅此功能，不含離線快取/推播，使用者明確表示範圍只要這個）：
  - `public/manifest.json`：name/short_name「文章閱讀器」、`start_url: "/"`、`display: standalone`、theme_color `#2f6feb`（比照網站既有主色）
  - 圖示：`public/icons/icon-192.png`、`icon-512.png`、`apple-touch-icon.png`，用 PowerShell + .NET `System.Drawing` 產生（環境內沒有 ImageMagick 等圖片工具，改用 `scripts/generate-icons.ps1` 這支一次性腳本畫「閱」字白字+品牌藍底），如需重新產生圖示可重跑這支腳本
  - `server.js` 新增 `/manifest.json`、`/icons/*` 兩個**不需登入**即可存取的路由（比照 `login.html`／`style.css` 的例外處理）——因為瀏覽器判斷「可否加入主畫面」時，會在使用者尚未登入、還停留在 `/login.html` 的當下就去抓 manifest 與圖示，這兩者若被 `requireAuth` 擋住，安裝功能會偵測不到
  - 6 個前端頁面的 `<head>` 都補上 `<link rel="manifest">`、`theme-color`、`apple-touch-icon` 與 `apple-mobile-web-app-*` 系列 meta tag（iOS Safari 不吃 web manifest，需要這組 meta tag 才能「加入主畫面」時有正確圖示與全螢幕模式）
  - **修正過圖示破圖問題**：初版圖示是帶 alpha（透明）色版的 PNG（.NET Bitmap 預設格式 Format32bppArgb），iOS Safari 對有透明色版的 apple-touch-icon 常顯示異常；已改用 `Format24bppRgb`（無透明色版）重新產生三個圖示，色版格式已用程式驗證（PNG IHDR color type從6改為2）
  - 使用者詢問「加入主畫面」按鈕在哪個頁面，已澄清：這不是網站自己畫的 UI，是瀏覽器原生功能（iOS Safari走分享選單、Android Chrome走三點選單或自動安裝提示），manifest/圖示只是讓瀏覽器「偵測到可安裝」，本次未額外做網頁內的引導按鈕或`beforeinstallprompt`自訂安裝流程
- **target.txt 已轉換為 target.json**：改為結構化 JSON 陣列（每筆含 `type`/`website`/`title`/`url`），`targetParser.js` 改用 `JSON.parse` 讀取，取代原本的文字區塊解析；`target.txt` 已依使用者指示直接刪除（git 有紀錄可復原），**target.json 現在是唯一資料來源**，新增/修改來源直接編輯此檔
- **新增 3 個小說來源的完整 parser**：
  - `xbanxia.cc`（半夏小說，全知讀者視角）：無反爬蟲防護，一般 fetch 即可
  - `angelibrary.com`（熾天使書城，太歲）：**首次遇到 Big5 編碼來源**（其餘皆UTF-8），新增 `iconv-lite` 套件解碼；章節目錄無分頁但章節標籤在每卷都重複（「第一章」~「第二十章」），parser 組合「卷名+章名」成有意義標題；網站本身沒有「上一章」連結，且每卷最後一章的「下一章」連結是網站自己的死連結（非我方問題，觸發時走現有「抓取失敗＋重試按鈕」機制即可，使用者手動回列表點下一卷）
  - 曾嘗試新增 `tw.linovelib.com`（嗶哩輕小說，我獨自升級）：查證後發現單一章節會被拆成多個實體分頁（如`xxx.html`/`xxx_2.html`），與現有「一個parser呼叫對應一個HTML頁面」架構衝突；與使用者確認後選擇「只抓第一頁、不做跨分頁拼接、不加下一頁按鈕」的簡化方案並完成過；**之後使用者將此來源改為筆仙閣，此 parser 與 dispatch 已依使用者指示刪除**，如未來想換回或重新評估，設計決策記錄在 CHATLOG 2026-07-22
- **新增筆仙閣（bxg123.cc）parser 取代嗶哩輕小說**：**第二個非UTF-8來源**，GB2312編碼；591節全部列在單一目錄頁無分頁，無反爬蟲防護；最後一節的「下一節」連結會指回自己（網站bug，非我方問題），parser 已判斷過濾避免卡在原地；**此網域的 HTTPS 連線在 TLS 交握階段會被重置**（http完全正常，判斷是網路層級的SNI過濾而非網站自身機制，不確定是否為特定網路環境限定），因此 target.json 該筆來源網址直接用 `http://`，程式端未做協定轉換的特殊處理，如果部署後發現連不上，優先檢查是不是雲端環境的網路路徑對這個網域的 https 反而是通的（跟本機情況相反）
- 三支新 parser（xbanxia、angelibrary、bxg123）皆已對正式網站直接測試過章節列表筆數、內文清洗、上下章連結（含邊界情況），使用者也已自行在瀏覽器完成端對端測試確認正常

## 目前的瓶頸或停頓點 (Current Blocker/Status)
本輪工作（target.json 轉換＋新增小說來源）已完成並推送，無已知阻塞。PWA 圖示驗證（上一輪遺留事項）仍待使用者回報。

czbooks.net 在 Render 上的 Cloudflare 阻擋問題，使用者已表態暫不處理（target.txt 已加註），非目前待辦，但解法選項還是先記錄著，之後有需要可以直接接續：
- A. 在 Render 上加 headless 瀏覽器（如 Puppeteer）自動解 JS 驗證頁——免費但變慢、吃記憶體，免費方案 512MB 可能不夠、得升級付費方案
- B. 付費 residential proxy 服務轉發 czbooks.net 的請求——簡單可靠但有持續性月費
- C. 雲端版只提供新聞 + hjwzw.com 小說，czbooks.net 只在本機用——不用額外花錢，但雲端版看不到 czbooks.net 這個來源

## 下一步行動 (Next Steps)
1. 下次開始工作時，先檢查 target.json 是否有新增項目（新的類型/自訂標題/網址）；如有，先與使用者確認是否要建立對應的新 parser，再動工
2. 確認使用者是否已驗證修正後的 PWA 圖示（手機上重新「加入主畫面」，記得提醒使用者要先移除舊的主畫面捷徑，否則舊圖示會被快取）
3. 使用者已表示 PWA 下一步可能想加離線閱讀或其他功能，但目前只確認要「加入主畫面」這一項，其餘功能待使用者明確提出後再討論架構（離線快取會牽涉到 Service Worker 如何處理已登入內容的快取邊界，需要先討論清楚再動工，見 CHATLOG）
4. 本專案後續工作一律推送至 https://github.com/jamessun0919-ops/NewsNovelCrawer

## 關鍵設定與上下文 (Key Context & Rules)
- **技術棧**：Node.js + Express + Cheerio（後端）＋ 純 HTML/JS 前端（不用框架）
- **解析策略**：per-site adapter，不做通用啟發式解析；新網站一律先與使用者確認再建立規則
- **target.json 讀取規則**：每次開工先檢查有無新增項目，發現新網站要先詢問使用者是否建立解析規則，不可自行擅自新增；`target.json` 是結構化陣列（每筆含 `type`/`website`/`title`/`url` 四個欄位），`targetParser.js` 用 `JSON.parse` 讀取後過濾出 `type`/`title`/`url` 都存在的項目（`website` 目前僅供人閱讀識別用，前端未使用）；原本的文字格式 `target.txt` 已於 2026-07-22 停用並刪除
- **頁面流程（共同）**：首頁(看新聞/看小說按鈕) → 來源選擇頁(讀取target.json依類型篩選，純下拉選單/清單，**已取消**自由輸入網址欄位)
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
- **多來源小說 parser 派發機制**：`server.js` 的 `getNovelSite(url)` 依網址 hostname 決定要用哪個 parser 與哪種 fetch 方式，novel 相關的兩支 API 路由都透過這個函式取得對應 parser，不再寫死；新增小說來源時要在這裡加一個 hostname 判斷分支。目前對應表：
  - czbooks.net → `czbooks.js` + `fetchHtmlViaCurl`（繞Cloudflare TLS指紋辨識）
  - hjwzw.com → `hjwzw.js` + 一般 `fetchHtml`（無防護）
  - xbanxia.cc → `xbanxia.js` + 一般 `fetchHtml`（無防護）
  - angelibrary.com → `angelibrary.js` + `fetchHtmlBig5`（無防護，但Big5編碼需解碼）
  - bxg123.cc → `bxg123.js` + `fetchHtmlGb2312`（無防護，但GB2312編碼需解碼；**target.json裡這筆來源網址須用`http://`**，https在此網域會在TLS交握階段被重置）
  - novel/chapter 兩支 API 路由呼叫 parser 時會多傳一個 `url` 參數（`parser.parseChapterList(html, url)`／`parser.parseChapter(html, url)`），供需要用來源網址解析相對連結的 parser 使用（目前只有 angelibrary.js、bxg123.js 用到，其餘 parser 可忽略此參數）
- **`parsers/hjwzw.js` 清洗規則**：章節列表用 `#tbchapterlist a` 選取；章節內文的容器是 `div[style*="text-indent: 2em"]`，但頁面下方另有一個內容相同 inline style 的短 div（「請記住本站域名」廣告字樣），要取 `.first()` 才是真正內文；內文開頭還有兩段站方樣板文字混在正文容器內（一段是純文字＋`<b>`標籤的域名提醒、不包在`<p>`裡；一段是包在第一個`<p>`裡的書名+章節標題重複），需要各自移除，見程式內註解；「上一章」連結在第一章時會指向章節ID為`,0`的死連結（需判斷過濾掉，回傳null），「下一章」連結在最後一章直接不存在`<a>`標籤（純文字「末頁」）
- **`parsers/xbanxia.js` 清洗規則**：章節列表用 `div.book-list ul li a`；內文容器 `#nr1` 開頭有一個空的佔位 `div[style*="height: 0"]`要移除、開頭還有重複標題的純文字節點+`<br>`要移除，結尾有站方標語「半夏小說，快樂很多」的`<span>`要移除；上一章/下一章用 `li.prev a[rel="prev"]` / `li.next a[rel="next"]`，href可能帶前後空白需trim
- **`parsers/angelibrary.js` 清洗規則**：這是 Big5 編碼站，`server.js` 的 `fetchHtmlBig5` 用 `iconv-lite` 解碼；章節目錄選擇器**必須**用 `table[border="1"][cellspacing="0"]`（多加`cellspacing="0"`排除頁面最外層同樣有`border="1"`的包裝表格，否則章節數會翻倍算重）；內文在 `<pre>` 純文字區塊（無`<p>`/`<br>`標籤），parser 用正則`【(.+?)】`找標題行、`踴躍購買`字樣找內文結尾，逐行手動escape後用`<br>`拼接；此站沒有「上一章」連結，`prevUrl`固定回傳null；「下一章」連結在每卷最後一章是網站自己的死連結（指向不存在的頁面），parser照樣回傳，觸發時走現有錯誤處理機制即可，非bug
- **`parsers/bxg123.js` 清洗規則**：GB2312編碼站，`server.js`的`fetchHtmlGb2312`用`iconv-lite`解碼；章節目錄`div.catalog ul li a`（整本591節單頁列完，無分頁）；內文`h1`是標題、`#mycontent`是內文（第1節會夾帶作品簡介文字，是網站原有排版非廣告，不需濾除）；上一節/下一節連結文字比對`上一节`/`下一节`；最後一節的「下一節」連結會指回自己（網站bug），parser比對`nextUrl === sourceUrl`後回傳null過濾掉，避免閱讀卡在原地
- **曾評估但已放棄的小說來源**：`tw.linovelib.com`（嗶哩輕小說）——單一章節被拆成多個實體分頁，與現有「一個parser呼叫對應一頁HTML」架構衝突，且目錄有VIP付費章節的假連結需濾除；使用者後來把「我獨自升級」這本書的來源改為筆仙閣，此站的 parser 與 dispatch 已刪除，如未來想重新評估或恢復，技術細節記錄在 CHATLOG 2026-07-22
- **小說閱讀頁字體大小**：`novel-reader.html` 內常數 `DEFAULT_FONT_SIZE`（現為22px）、`MIN_FONT_SIZE`(14)、`MAX_FONT_SIZE`(28)、`FONT_SIZE_STEP`(2)，設定存於 LocalStorage key `novel-reader-font-size`；套用方式是設定`contentArea`（`#content-area`容器本身）的inline style，不是套在innerHTML內容上，所以`loadChapter()`換章節替換innerHTML時不會遺失字體設定，不需要每次換章重新套用
- **PWA 圖示產生注意事項**：環境沒有ImageMagick等圖片工具，用PowerShell + .NET `System.Drawing`（`scripts/generate-icons.ps1`）產生；.NET Bitmap預設是`Format32bppArgb`（含alpha色版），存成PNG會被iOS Safari的apple-touch-icon顯示異常（破圖/空白），已改用建構子明確指定`Format24bppRgb`（不含alpha色版）；腳本內文字元（中文字「閱」跟中文註解）曾因Windows PowerShell 5.1讀取無BOM的UTF-8檔案編碼誤判導致整份腳本解析失敗，之後把中文字元改用`[char]0x95B1`這類unicode code point寫法、註解全部改英文，才穩定執行——之後如果要修改這支腳本，避免直接在.ps1檔案裡寫中文字元
- **「加入主畫面」是瀏覽器原生功能，不是網站自畫的按鈕**：manifest.json + 圖示只是讓瀏覽器偵測「這個網站可安裝」，iOS走Safari分享選單、Android走Chrome選單或自動彈出的安裝提示；如果之後要在網頁內加自訂的安裝引導按鈕，Android可監聽`beforeinstallprompt`事件做一鍵安裝，但iOS Safari沒有對應API，只能顯示操作說明文字，無法做成真正的一鍵按鈕
