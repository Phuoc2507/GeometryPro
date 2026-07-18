// Nạp .env.local TRƯỚC khi các handler được import (ES module hoist imports lên trước
// mọi statement, nên gọi config() giữa các import trong server.js là QUÁ MUỘN — handler
// đã đọc process.env lúc module-load và nhận undefined). Import module này ĐẦU TIÊN.
import { config } from 'dotenv';
config({ path: '.env.local' });
