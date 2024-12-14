const { Server } = require('socket.io');
const express = require('express');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const PORT = 9000;

let users = {}; // Stores username -> socket.id mapping
let responses = []; // Stores responses in the desired format

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    socket.emit("connection", socket.id);

    // Assign a username to the connected user
    socket.on('set_uname', (username) => {
        if (username) {
            users[username] = socket.id; // Map username to socket ID
            io.emit("users", users); // Notify all clients of the updated users list
            console.log('Users:', users);
        }
    });

    // Admin message to all users
    socket.on('admin_message', (msg) => {
        io.emit('admin_message', msg);
    });

    // Targeted message to a specific user or group
    socket.on('targeted_message', (msg) => {
        const userSocketId = users[msg.to];
        if (userSocketId) {
            socket.to(userSocketId).emit('targeted_message', msg);
        }
    });

    socket.on('user_response', (resp) => {
        responses.push(resp);
        console.log(responses);
    });


    // Get data for a specific user or all users
    socket.on('get_data', (param) => {
        const mails = responses.map(el => campId === param);
    });


    // Remove user from the list when they disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Find the username corresponding to the disconnected socket ID
        for (const [username, id] of Object.entries(users)) {
            if (id === socket.id) {
                delete users[username]; // Remove the user
                break;
            }
        }
        io.emit("users", users); // Notify all clients of the updated users list
        console.log('Users after disconnect:', users);
    });
});

app.use(cors());

server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
