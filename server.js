const { Server } = require('socket.io');
const express = require('express');
const http = require('http');
const app = express();
const cors = require('cors');
const server = http.createServer(app);
const PORT = 9000;
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

let users = {}; // Stores username -> socket.id mapping

let responses = {};

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    socket.emit("connection", socket.id);

    // Assign a username to the connected user
    socket.on('set_uname', (username) => {
        users[username] = socket.id; // Map username to socket ID
        io.emit("users", users); // Notify all clients of the updated users list
        console.log(users);
    });

    // Amin message to all users
    socket.on('admin_message', msg => {
        io.emit('admin_message', msg);
    })

    // Targeted message to specific user or group
    socket.on('targeted_message', msg => {
        const user = users[msg.to];
        socket.to(user).emit('targeted_message', msg);
    })

    socket.on('user_response', resp => {
        const user = users[resp.name];
        responses[resp.name] = resp.data;
        console.log(responses);
    })

    socket.on('get_data', () => {
        io.emit('get_data', responses);
    })

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
        console.log(users);
    });
});

app.use(cors());

server.listen(PORT, () => console.log('Listening on port 9000'));
