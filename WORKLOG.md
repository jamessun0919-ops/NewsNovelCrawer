# 工作日誌 (Worklog)

## 2026-07-22（下半場）
- 使用者回報：全知讀者視角（xbanxia.cc）本機正常，Render雲端手機端章節目錄載入失敗HTTP403
- 依debug原則，先確認情境（Render雲端版 vs 本機區網）、列出可能原因（IP信譽封鎖/共享IP池已被拉黑/header差異/暫時性巧合）不預設是程式問題，經使用者確認後加暫時性debug log（記錄fetchHtml非200時的status/headers/body片段）推送
- 使用者回報Render Logs：確認`server: cloudflare`、`cf-mitigated: challenge`、body為`Just a moment...`，與czbooks.net同類型IP信譽阻擋，改用curl大概率無效
- 提出三選項（雲端版移除此來源／加headless瀏覽器／付費residential proxy／先不處理待下次），使用者選擇「自行修改target.json換一個新來源（52書庫 www.52shuku.net），請建立對應parser」
- 查證52shuku.net結構：書籍介紹頁本身即完整章節目錄（`ul.list.clearfix li.mulu a`，1310筆單頁列完）；章節內文頁以頁碼命名非章節（如`h74i_2.html`=第1章），UTF-8編碼，Cloudflare僅作CDN快取非阻擋；每頁內文夾帶站方推廣文字需濾除；首章「上一頁」連結指回書籍介紹頁（非真章節，需判斷過濾）、末章無「下一頁」連結（乾淨邊界，非自我循環bug）
- 與使用者確認兩點後動工：章節標題由站方原始「第N頁」改標為「第N章」與其他來源一致；xbanxia.cc既已替換，同步刪除`parsers/xbanxia.js`與dispatch
- 建立`parsers/52shuku.js`，對照實際抓取的頁面（第1章/第499章/第1310章）做單元測試，章節數、標題格式、上下頁邊界判斷、推廣文字濾除皆正確；移除已診斷完成的暫時性debug log
- 使用者於瀏覽器完成端對端測試確認52書庫來源正常，結束本階段工作
- 使用者交代下次工作項目：**簡體來源轉換繁體顯示**（目前52書庫等簡體來源直接顯示簡體字，需討論轉換方案）

## 2026-07-22
- 需求：將 target.txt 轉換為 JSON 格式，並解析 target 檔內新增的小說來源後補齊對應 parser
- 確認轉換範圍：與使用者確認「target.json 取代 target.txt 作為唯一資料來源」（非僅備份快照），`targetParser.js` 改為讀取 `target.json` 並用 JSON.parse 取代原本的文字區塊解析；轉換後 `target.txt` 依使用者指示直接刪除（git 有紀錄可復原）
- target.txt 比對交接文件，發現新增 3 個小說來源（半夏小說 xbanxia.cc、熾天使書城 angelibrary.com、嗶哩輕小說 tw.linovelib.com），依專案規則先與使用者確認要建立對應 parser 才動工
- 逐一查證三站實際結構後建立 parser：
  - `xbanxia.cc`：無反爬蟲防護，內文需濾除站方尾綴廣告文字與重複標題
  - `angelibrary.com`：首次遇到 Big5 編碼來源（其餘皆UTF-8），新增 `iconv-lite` 套件解碼；章節目錄無分頁但章節標籤重複（每卷都是「第一章~第二十章」），需組合卷名+章名才有意義；網站本身沒有「上一章」連結，且每卷最後一章的「下一章」連結是網站自己的死連結（非我方問題，出錯時走現有錯誤處理機制）
  - `tw.linovelib.com`：查證後發現單一章節會被拆成多個實體分頁（如 xxx.html / xxx_2.html / xxx_3.html），與現有架構「一個parser呼叫對應一個HTML頁面」衝突；與使用者確認後決定只抓第一頁、不做跨分頁拼接，也不加下一頁按鈕
- 使用者實測期間將「我獨自升級」來源改為筆仙閣（bxg123.cc），改查證此站：GB2312編碼（第二個非UTF-8來源）、591節全部列在單一目錄頁無分頁、無反爬蟲驗證，但發現此網域的 **HTTPS 連線在TLS交握階段會被重置**（http完全正常，判斷是網路層級的SNI過濾而非網站自身機制），與使用者確認後 target.json 該筆來源改用 `http://`，程式端不做協定轉換的特殊處理；同時使用者決定移除已無來源指向的 `parsers/linovelib.js` 與對應 dispatch
- 三支新 parser（xbanxia、angelibrary、bxg123）皆已對正式網站做過章節列表筆數、內文清洗、上下章連結（含邊界情況：angelibrary每卷最後一章死連結、bxg123最後一節自我循環連結）的直接測試，皆正確
- 使用者自行於瀏覽器完成本機端對端測試，確認功能正常後關閉本機測試用 server，推送至 GitHub

## 2026-07-21
- 背景：使用者無法提供穩定開機的 server，需部署到雲端才能用手機等裝置存取，因此決定先做帳號密碼機制再考慮部署
- 動工前先確認方案架構：討論部署平台類型對架構的影響（czbooks.net 依賴系統 curl 子行程繞過 Cloudflare、內文快取存在記憶體中，這兩點在 serverless 平台可能失效），使用者確認方向為「常駐型服務」(Render/Railway/Fly.io)，帳號規模確認為「單一帳號」
- 確認並實作方案：
  - 新增套件 express-session、bcryptjs、express-rate-limit、dotenv
  - 帳密以環境變數存放（AUTH_USERNAME、AUTH_PASSWORD_HASH bcrypt雜湊、SESSION_SECRET），不寫入程式碼或git；建立 `scripts/hash-password.js` 一次性小工具產生密碼雜湊
  - `.env` 加入 `.gitignore`，建立 `.env.example` 供部署參考欄位
  - `server.js` 新增 `requireAuth` middleware，擋在所有頁面與 API 路由前；新增 `/api/login`、`/api/logout`；PORT 改讀 `process.env.PORT` 以配合雲端平台
  - session cookie 設定 `secure: 'auto'` 搭配 `trust proxy`，因應雲端平台在自己的 proxy 終止 TLS 的情境
  - `/api/login` 加上 express-rate-limit（15分鐘5次），防止暴力破解密碼
  - 新增 `public/login.html` 登入頁與對應 CSS，樣式比照現有頁面風格；首頁新增「登出」連結
- 本機測試（curl 逐項驗證，非開瀏覽器）：未登入存取首頁會302導向登入頁、未登入呼叫API回401、密碼錯誤回401、連續失敗5次後觸發429、正確登入後可正常存取頁面與API、登出後再次存取又被擋下，皆正常
- 測試完成後已關閉本機測試用 server
- 更新 HANDOVER.md 記錄帳號密碼機制的完整技術細節，待辦事項改為「選定雲端平台並實際部署」
- 使用者密碼含特殊符號「@」，確認程式無字元限制（純字串比對），協助產生新密碼雜湊並更新本機 `.env`
- 使用者確認前後端不需分開部署（GitHub Pages 之類），因現有架構已是前後端同服務，拆開反而會破壞同源session保護機制、需額外處理CORS，沒有效益
- 提供 Render 部署設定流程（Build/Start指令、環境變數清單、免費方案spin down限制對現有記憶體快取/session架構的影響）
- 使用者實際部署到 Render（https://newsnovelcrawer.onrender.com）後回報：小說章節列表空白（無錯誤訊息）
- 排查：先自行用curl重新驗證czbooks.net本機仍可正常抓取解析（1468章），排除程式邏輯問題；請使用者提供瀏覽器DevTools Network截圖，確認API回傳200但`chapters:[]`；加入暫時性debug log（印HTML長度與片段）推送重新部署，請使用者重現問題後回報Render Logs內容
- 從Render Logs確認：czbooks.net回傳的是Cloudflare `Just a moment...` JS人機驗證頁（非TLS指紋問題，是IP信譽層級阻擋，比先前解決的問題更難處理），此問題影響範圍只限czbooks.net（雲端機房IP被歸類為高風險來源），非curl本身失效
- 提出三個解法方向讓使用者選擇：A.加headless瀏覽器自動解驗證頁（免費但吃資源）B.付費residential proxy（穩定但有月費）C.雲端版只留新聞+其他小說來源，czbooks.net只在本機用；使用者尚未決定，待下次討論
- 使用者提出要推送修改過的target.txt（新增了 tw.hjwzw.com、www.quanben.io 兩個小說來源，其中一筆czbooks.net標題也有更動）；依專案規則發現新來源沒有對應parser，先詢問使用者要怎麼處理，使用者選擇「先建立parser再一起推送」
- 查證兩個新網站實際結構：
  - tw.hjwzw.com：章節目錄單頁列完（1450章），內文容器需濾除頭尾站方樣板文字（域名廣告、書名重複），「上一章」在首章有死連結sentinel(`,0`)需判斷過濾，成功建立parser並通過測試
  - www.quanben.io：發現該站章節目錄頁只静態顯示前24章與後24章，中間章節藏在需要自訂JS加密簽章才能呼叫的JSONP API後面（刻意反爬蟲），嘗試逆向重現該簽章邏輯但持續回傳「參數錯誤」；因這三個小說來源其實是同一本小說（絕頂唐門），czbooks.net與hjwzw.com已可完整涵蓋，與使用者確認後放棄此來源，從target.txt移除
- 實作 `server.js` 的 `getNovelSite()` 派發機制，依網址hostname自動選擇對應parser與抓取方式（czbooks.net用curl繞過、hjwzw.com用一般fetch即可），取代原本寫死呼叫czbooks的邏輯；同時移除先前為排查Cloudflare問題加入的暫時性debug log
- 本機端對端測試czbooks.net與hjwzw.com兩個來源皆正常（含regression確認czbooks.net未被新邏輯影響）
- 使用者實測確認 tw.hjwzw.com 在 Render 雲端環境章節列表與內文都正常；czbooks.net 使用者已在target.txt標題加註「反爬未處理」，明確表示暫不處理
- 新增小說閱讀頁字體調整功能：`novel-reader.html` 新增 A-/A+ 按鈕，14px~28px範圍每次±2px，設定存LocalStorage（key: novel-reader-font-size），跳章不重置
- 新增 PWA「加入主畫面」基礎建設（使用者明確表示這階段只要這個功能，離線快取/推播另外討論）：
  - 環境內沒有ImageMagick等圖片工具，改用PowerShell + .NET System.Drawing寫一次性腳本`scripts/generate-icons.ps1`產生App圖示（藍底白色「閱」字，色系比照網站主色#2f6feb），中途PowerShell腳本內嵌中文字元導致解析錯誤（Windows PowerShell 5.1讀取無BOM的UTF-8檔案編碼問題），改用`[char]0x95B1`code point寫法解決
  - 建立`public/manifest.json`（standalone顯示模式、start_url根目錄）與三種尺寸圖示；6個前端頁面`<head>`都補上manifest連結與iOS專用的`apple-mobile-web-app-*` meta tag（iOS Safari不支援標準web manifest）
  - `server.js`新增`/manifest.json`、`/icons/*`兩個不需登入的例外路由（比照style.css的處理方式），因為瀏覽器判斷能否安裝時會在使用者尚未登入、停留在登入頁時就讀取這些檔案，若被`requireAuth`擋住會偵測不到可安裝
  - 這個session沒有瀏覽器自動化工具，僅能透過curl驗證路由回應與程式碼檢查，請使用者自行本機/Render上實測UI效果
- 使用者確認測試完成，請求推送
- 使用者回報：字體大小功能正確，但要求預設字體大小改22px（原17px）；PWA圖示沒看到，詢問「加入主畫面」按鈕在哪個頁面
- 排查圖示問題：檢查PNG的IHDR color type，發現初版圖示帶alpha色版（color type 6），這是iOS Safari的apple-touch-icon常見的破圖/空白顯示成因；修改`generate-icons.ps1`明確指定`Format24bppRgb`（無alpha色版）重新產生三個圖示並驗證color type改為2
- 調整`novel-reader.html`的`DEFAULT_FONT_SIZE`常數為22px
- 推送圖示修正與字體預設值調整，並提醒使用者：如果先前已加入過主畫面的舊版（破圖）捷徑，手機會快取當時圖示，需要先移除舊捷徑再重新加入才會看到修正後圖示
- 使用者反映找不到「加入主畫面」按鈕，誤以為是網站內的功能；澄清這是瀏覽器原生功能（iOS走Safari分享選單、Android走Chrome選單/自動安裝提示），我們做的manifest與圖示只負責讓瀏覽器偵測到「可安裝」，並說明如果要在網頁內加自訂引導按鈕，Android可用`beforeinstallprompt`事件、iOS Safari沒有對應API做不到真正按鈕
- 使用者結束本階段工作，請求完成交接文件後推送並關閉；確認無本機測試server在執行，更新HANDOVER/WORKLOG/CHATLOG/README後推送
- 使用者詢問 tw.hjwzw.com 爬蟲時用了哪種驗證機制：實測（不同UA組合逐一curl測試）確認是nginx層的UA名單檢查（空UA/curl UA會403，python-requests預設UA跟瀏覽器UA都能通過），非Cloudflare等級防護，`server.js`現有的一般fetch+瀏覽器UA做法已足夠
- 使用者請求整理四個網站（含新聞technews.tw）的防護等級與反爬對策，先實測technews.tw確認完全無防護（空UA/curl UA/瀏覽器UA皆200，只掛CloudFront CDN），整理成表格：

| 網站 | 防護等級 | 防護機制 | 採取的反爬操作 |
|---|---|---|---|
| technews.tw（新聞） | 無 | 無任何驗證，只掛CloudFront CDN | 不需要，一般fetch即可 |
| tw.hjwzw.com（黃金屋） | 低 | nginx層UA名單檢查（擋空UA、curl等已知工具字串，其餘皆放行） | 一般fetch + 瀏覽器UA字串即可通過 |
| czbooks.net（小說狂人） | 中高 | Cloudflare機器人防護，本機端用TLS指紋辨識擋Node fetch但curl可過；雲端機房IP則用IP信譽判斷一律擋下，回傳JS人機驗證頁 | 本機：改用系統curl子行程（`fetchHtmlViaCurl`）已落地；雲端：僅提出三個方案建議（headless瀏覽器/付費proxy/雲端版不提供），使用者選擇暫不處理，未實際執行 |
| www.quanben.io（全本小說，已放棄） | 高 | 章節目錄僅靜態顯示前後各24章，中間章節需呼叫帶自訂加密簽章的JSONP API | 曾嘗試逆向重現簽章邏輯但失敗（回傳參數錯誤），因另兩個來源已完整涵蓋同一本小說，與使用者確認後放棄，未真正繞過 |

## 2026-07-15
- 完成 NEWScrawer 專案整體架構討論（尚未寫程式碼）
- 確認技術棧：Node.js + Express + Cheerio + 純 HTML/JS 前端
- 確認 target.txt 新格式（新增「類型」欄位：NEWS/Novel），並改為純下拉選單來源，取消自由輸入網址欄位
- 確認頁面流程：首頁類型選擇 → 來源清單 → 標題列表+內文左右分欄(RWD)
- 確認新聞/小說各自的爬取規則差異：
  - 新聞：列表頁分頁處理(只抓當頁+下一頁按鈕)、內文伺服器端記憶體快取
  - 小說：章節目錄單頁列完、上一章/下一章導覽、讀取進度用LocalStorage
- 確認錯誤處理方式(訊息+重試按鈕)、部署情境(純本機工具，不對外開放)
- 用 WebFetch 查證兩個目標網站實際結構：technews.tw 有1323頁分頁；czbooks.net 章節目錄單頁近2000章
- 完成版面規劃討論（5項細節）：小說標題完整顯示、小說改跳轉頁導覽(新聞維持左右分欄)、小說章節分頁+跳章輸入框、新聞RWD斷點768px、小說下一章即時爬取
- 完成程式撰寫：Express+Cheerio後端、target.txt解析、technews/czbooks per-site parser、5個前端頁面(首頁/來源選擇/新聞分欄/小說章節列表/小說閱讀頁)
- 技術問題排除：czbooks.net有Cloudflare機器人防護會擋下Node fetch(403)，改用系統curl子行程繞過(TLS指紋辨識問題，非header問題)
- 用 Playwright 對本機伺服器跑過完整流程驗證(桌面1280x800 + 模擬手機390x844)，截圖確認新聞分欄/RWD切換、小說分頁/跳章/上下章導覽/讀取進度LocalStorage皆正常，無console錯誤
- 修正新聞內文夾帶廣告內容問題：裁切「延伸閱讀」區塊、移除網站CSS/JS預設隱藏(display:none)的咖啡贊助彈窗、AI Q&A小工具、newsletter推廣、推薦小工具等非文章本體內容
- 建立 GitHub 遠端倉庫連結並推送首版程式碼：https://github.com/jamessun0919-ops/NewsNovelCrawer （倉庫維持Public，使用者確認風險後選擇不轉Private）
- 討論手機使用方式（不公開部署的前提下）：
  - 同 Wi-Fi 區網直連（用電腦區網IP+port，需開防火牆），或裝 Tailscale 私人網路（可跨網路使用）；兩者都需要電腦保持開機、server持續執行
  - 手機本身跑server：Android可用Termux安裝Node.js+curl執行，但背景省電機制可能中斷；iOS因背景執行限制嚴格，不實用
  - 討論公開部署風險：不公開網址不等於安全（掃描器/CT log可發現），主要風險是無驗證濫用(消耗資源、被爬取目標網站封鎖)而非資料外洩(無伺服器端使用者資料)
  - Agent 建議：若要公開部署，應加上登入機制(帳號密碼)降低匿名濫用風險，但需注意登入本身要做對(密碼雜湊、登入失敗次數限制、強制HTTPS)，否則會引入新漏洞；純私人使用情境下，Tailscale比自建登入機制更簡單且風險更低
- 已將「帳號密碼機制」列入 README.md 未完成事項
- 待辦：帳號密碼機制（如未來要公開部署再實作）
