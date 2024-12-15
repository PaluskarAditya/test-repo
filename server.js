const { Server } = require('socket.io');
const express = require('express');
const http = require('http');
const cors = require('cors');
const winston = require('winston'); // For logging

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Restrict to specific domain(s)
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 9000;
const users = {}; // Stores username -> socket.id mapping
const responses = []; // Stores responses in memory (Consider DB for production)

const logger = winston.createLogger({
    level: 'info',
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
            )
        })
    ]
});

// Middleware to handle errors globally
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).send('Something went wrong!');
});

io.on("connection", (socket) => {
    logger.info(`User connected: ${socket.id}`);
    socket.emit("connection", socket.id);

    // Assign a username to the connected user
    socket.on('set_uname', (username) => {
        try {
            if (username && !users[username]) {
                users[username] = socket.id; // Map username to socket ID
                io.emit("users", Object.keys(users)); // Notify all clients of the updated users list
                logger.info(`Username ${username} set for socket ${socket.id}`);
            } else {
                socket.emit("error", "Username already taken or invalid.");
            }
        } catch (err) {
            logger.error(`Error setting username for socket ${socket.id}: ${err}`);
        }
    });

    // Admin message to all users
    socket.on('admin_message', (msg) => {
        if (msg && msg.trim()) {
            io.emit('admin_message', msg);
        } else {
            socket.emit("error", "Invalid message");
        }
    });

    // Targeted message to a specific user or group
    socket.on('targeted_message', (msg) => {
        try {
            const userSocketId = users[msg.to];
            if (userSocketId) {
                socket.to(userSocketId).emit('targeted_message', msg);
            } else {
                socket.emit("error", "Targeted user does not exist.");
            }
        } catch (err) {
            logger.error(`Error sending targeted message: ${err}`);
        }
    });

    // User response
    socket.on('user_response', (resp) => {
        try {
            if (resp && resp.campaignId) {
                responses.push(resp); // Consider using a DB for storing responses
                logger.info(`User response received for campaignId: ${resp.campaignId}`);
            } else {
                socket.emit("error", "Invalid response data.");
            }
        } catch (err) {
            logger.error(`Error saving response: ${err}`);
        }
    });

    // Get filtered data
    socket.on('get_data', (param) => {
        try {
            const filteredResponses = responses.filter(el => el.campaignId === param);
            logger.info(`Filtered responses for campaignId: ${param}`);
            socket.emit('get_data', filteredResponses);
        } catch (err) {
            logger.error(`Error filtering responses: ${err}`);
        }
    });

    // Remove user from the list when they disconnect
    socket.on('disconnect', () => {
        try {
            const username = Object.keys(users).find(key => users[key] === socket.id);
            if (username) {
                delete users[username]; // Remove the user from the users list
                io.emit("users", Object.keys(users)); // Notify all clients of the updated users list
                logger.info(`User ${username} disconnected`);
            }
        } catch (err) {
            logger.error(`Error handling disconnect: ${err}`);
        }
    });
});

app.use(cors());

server.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
});
