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
let responses = {}; // Stores responses in the desired format

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    socket.emit("connection", socket.id);

    // Assign a username to the connected user
    socket.on('set_uname', (username) => {
        if (username) {
            users[username] = socket.id; // Map username to socket ID
            if (!responses[username]) {
                responses[username] = {}; // Initialize response object for the user
            }
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

    // Handle user responses
    socket.on('user_response', (resp) => {
        const { name, id, data } = resp;

        if (name && id && data) {
            // Ensure the username exists in the `responses` object
            if (!responses[name]) {
                responses[name] = {};
            }

            // Store the response using the unique ID
            responses[name][id] = data;
            console.log("Updated Responses:", responses);
        } else {
            console.error("Invalid response structure received:", resp);
        }
    });

    // Get data for a specific user or all users
    socket.on('get_data', (param) => {
        if (param === "all") {
            if (Object.keys(responses).length > 0) {
                const allResponses = { all: responses };
                console.log("Sending all data:", allResponses);
                socket.emit('get_data', allResponses); // Emit all user data to the requesting socket
            } else {
                console.error("No data available for any user.");
                socket.emit('get_data', { error: "No data available for any user." });
            }
        } else if (param && responses[param]) {
            const userResponses = { [param]: responses[param] };
            console.log("Sending data for user:", userResponses);
            socket.emit('get_data', userResponses); // Emit specific user's data to the requesting socket
        } else {
            console.error(`No data found for user: ${param}`);
            socket.emit('get_data', { error: `No data found for user: ${param}` });
        }
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
