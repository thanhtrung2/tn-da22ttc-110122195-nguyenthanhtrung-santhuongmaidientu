const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('🔄 Đang cập nhật schema database...');

        // Kiểm tra và thêm từng cột cho bảng nguoi_dung
        const columns = [
            { name: 'cccd_mat_truoc', type: 'VARCHAR(500)' },
            { name: 'cccd_mat_sau', type: 'VARCHAR(500)' },
            { name: 'giay_phep_kinh_doanh', type: 'VARCHAR(500)' },
            { name: 'anh_guong_mat', type: 'VARCHAR(500)' },
            { name: 'trang_thai_xac_thuc', type: "ENUM('pending', 'verified', 'rejected') DEFAULT NULL" },
            { name: 'ly_do_tu_choi', type: 'TEXT' },
            { name: 'ngay_xac_thuc', type: 'TIMESTAMP NULL' }
        ];

        for (const col of columns) {
            try {
                const [rows] = await connection.query(
                    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'nguoi_dung' AND COLUMN_NAME = ?`,
                    [process.env.DB_NAME, col.name]
                );
                
                if (rows.length === 0) {
                    await connection.query(`ALTER TABLE nguoi_dung ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`✅ Đã thêm cột ${col.name} vào bảng nguoi_dung`);
                } else {
                    console.log(`ℹ️  Cột ${col.name} đã tồn tại`);
                }
            } catch (err) {
                console.error(`❌ Lỗi khi thêm cột ${col.name}:`, err.message);
            }
        }

        // Kiểm tra và thêm cột cho bảng san_pham
        const productColumns = [
            { name: 'trang_thai_duyet', type: "ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'" },
            { name: 'ly_do_tu_choi', type: 'TEXT' }
        ];

        for (const col of productColumns) {
            try {
                const [rows] = await connection.query(
                    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'san_pham' AND COLUMN_NAME = ?`,
                    [process.env.DB_NAME, col.name]
                );
                
                if (rows.length === 0) {
                    await connection.query(`ALTER TABLE san_pham ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`✅ Đã thêm cột ${col.name} vào bảng san_pham`);
                } else {
                    console.log(`ℹ️  Cột ${col.name} đã tồn tại`);
                }
            } catch (err) {
                console.error(`❌ Lỗi khi thêm cột ${col.name}:`, err.message);
            }
        }

        // Cập nhật tất cả sản phẩm hiện tại thành approved
        try {
            await connection.query(`UPDATE san_pham SET trang_thai_duyet = 'approved' WHERE trang_thai_duyet = 'pending'`);
            console.log('✅ Đã cập nhật trạng thái duyệt cho sản phẩm hiện có');
        } catch (err) {
            console.log('ℹ️  Không cần cập nhật sản phẩm');
        }

        console.log('\n✅ Cập nhật schema hoàn tất!');
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật schema:', error);
    } finally {
        await connection.end();
    }
}

updateSchema();
