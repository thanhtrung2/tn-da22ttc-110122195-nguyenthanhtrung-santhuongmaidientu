const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    const [rows] = await conn.query('SELECT id, ho_ten, vai_tro, trang_thai_xac_thuc FROM nguoi_dung WHERE ho_ten LIKE "%test_seller%" OR email LIKE "%test_seller%"');
    console.log(rows);
    await conn.end();
}
check();
