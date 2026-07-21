# 工作日誌 (Worklog)

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
