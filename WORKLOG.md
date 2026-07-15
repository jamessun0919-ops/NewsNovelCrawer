# 工作日誌 (Worklog)

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
- 待辦：無，本輪功能已完整實作並驗證
