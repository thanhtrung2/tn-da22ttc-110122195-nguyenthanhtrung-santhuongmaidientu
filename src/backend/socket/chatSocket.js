const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const onlineUsers = new Map();

const initSocket = (io) => {
    // Auth middleware for socket
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 User ${socket.userId} connected`);
        onlineUsers.set(socket.userId, socket.id);

        // Broadcast online status
        io.emit('user_online', { userId: socket.userId });

        // Join personal room
        socket.join(`user_${socket.userId}`);

        // Send message
        socket.on('send_message', async (data) => {
            try {
                const { nguoi_nhan_id, noi_dung } = data;

                // Save to database
                const [result] = await pool.query(
                    'INSERT INTO tin_nhan (nguoi_gui_id, nguoi_nhan_id, noi_dung) VALUES (?, ?, ?)',
                    [socket.userId, nguoi_nhan_id, noi_dung]
                );

                // Get sender info
                const [sender] = await pool.query(`
                    SELECT nd.ho_ten, nd.avatar, gh.ten_gian_hang 
                    FROM nguoi_dung nd 
                    LEFT JOIN gian_hang gh ON nd.id = gh.nguoi_ban_id AND nd.vai_tro = 'seller'
                    WHERE nd.id = ?`, [socket.userId]);

                const message = {
                    id: result.insertId,
                    nguoi_gui_id: socket.userId,
                    nguoi_nhan_id,
                    noi_dung,
                    da_doc: false,
                    ngay_tao: new Date(),
                    ten_nguoi_gui: sender[0].ten_gian_hang || sender[0].ho_ten,
                    avatar_nguoi_gui: sender[0].avatar
                };

                // Send to receiver
                io.to(`user_${nguoi_nhan_id}`).emit('new_message', message);
                // Send back to sender
                socket.emit('message_sent', message);
            } catch (error) {
                console.error('Socket send message error:', error);
                socket.emit('error', { message: 'Lỗi gửi tin nhắn' });
            }
        });

        // Typing indicator
        socket.on('typing', (data) => {
            io.to(`user_${data.nguoi_nhan_id}`).emit('user_typing', {
                userId: socket.userId,
                typing: data.typing
            });
        });

        // Mark messages as read
        socket.on('mark_read', async (data) => {
            try {
                await pool.query(
                    'UPDATE tin_nhan SET da_doc = TRUE WHERE nguoi_gui_id = ? AND nguoi_nhan_id = ?',
                    [data.nguoi_gui_id, socket.userId]
                );
                io.to(`user_${data.nguoi_gui_id}`).emit('messages_read', { userId: socket.userId });
            } catch (error) {
                console.error('Mark read error:', error);
            }
        });

        // Delete a single message
        socket.on('delete_message', async (data) => {
            try {
                const { messageId, nguoi_nhan_id } = data;
                if (!messageId) return;

                // Delete from DB only if the sender is the one deleting (unsend/delete message)
                const [result] = await pool.query(
                    'DELETE FROM tin_nhan WHERE id = ? AND nguoi_gui_id = ?',
                    [messageId, socket.userId]
                );

                if (result.affectedRows > 0) {
                    // Notify recipient
                    if (nguoi_nhan_id) {
                        io.to(`user_${nguoi_nhan_id}`).emit('message_deleted', { messageId });
                    }
                    // Notify sender
                    socket.emit('message_deleted', { messageId });
                }
            } catch (error) {
                console.error('Socket delete message error:', error);
            }
        });

        // Delete/clear entire conversation
        socket.on('delete_conversation', async (data) => {
            try {
                const { otherUserId } = data;
                if (!otherUserId) return;

                // Delete all messages between both users
                await pool.query(
                    'DELETE FROM tin_nhan WHERE (nguoi_gui_id = ? AND nguoi_nhan_id = ?) OR (nguoi_gui_id = ? AND nguoi_nhan_id = ?)',
                    [socket.userId, otherUserId, otherUserId, socket.userId]
                );

                // Notify both users' socket rooms
                io.to(`user_${otherUserId}`).emit('conversation_deleted', { userId: socket.userId });
                socket.emit('conversation_deleted', { userId: otherUserId });
            } catch (error) {
                console.error('Socket delete conversation error:', error);
            }
        });

        // Get online users
        socket.on('get_online_users', () => {
            socket.emit('online_users', Array.from(onlineUsers.keys()));
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log(`🔌 User ${socket.userId} disconnected`);
            onlineUsers.delete(socket.userId);
            io.emit('user_offline', { userId: socket.userId });
        });
    });
};

module.exports = { initSocket, onlineUsers };
