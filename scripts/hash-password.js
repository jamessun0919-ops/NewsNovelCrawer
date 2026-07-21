// 一次性工具：產生密碼的 bcrypt hash，用來設定 AUTH_PASSWORD_HASH 環境變數
// 用法：node scripts/hash-password.js "你的密碼"
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('用法：node scripts/hash-password.js "你的密碼"');
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log(hash);
});
