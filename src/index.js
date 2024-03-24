const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

//update profile image library
const fileUpload = require('express-fileupload');
app.use(fileUpload());

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {
    console.log('New WebSocket connection')

   socket.on('join', (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
        return callback(error);
    }

    socket.join(user.room);

    // Fetch previous messages from the database
    db.query('SELECT * FROM messages WHERE room = ? ORDER BY created_at ASC', [user.room], (error, results) => {
        if (error) {
            return callback(error);
        }
        // Emit previous messages to the user who just joined
        results.forEach((row) => {
            socket.emit('message', generateMessage(row.username, row.message));
        });
    });

    // Insert user data into MySQL database
    db.query('INSERT INTO users (username, room) VALUES (?, ?)', [user.username, user.room], (error, results) => {
        if (error) {
            return callback(error);
        }
        // Emit events or perform other actions if needed
    });

    socket.emit('message', generateMessage('Admin', 'Welcome!'));
    socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`));
    io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room)
    });

    callback();
});


     socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();

    if (filter.isProfane(message)) {
        return callback('Profanity is not allowed!');
    }

    // Insert message into MySQL database
    db.query('INSERT INTO messages (username, room, message) VALUES (?, ?, ?)', [user.username, user.room, message], (error, results) => {
        if (error) {
            console.error('Error inserting message into database:', error);
            return callback('Error sending message');
        }

        // Emit the message to all clients in the room
        io.to(user.room).emit('message', generateMessage(user.username, message));
        callback(); // Callback to acknowledge message sent
    });
});


    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
        // Remove user data from MySQL database
        db.query('DELETE FROM users WHERE id = ?', [user.id], (error, results) => {
            if (error) {
                console.error('Error removing user from database:', error);
            }
        });

        io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });
    }
});
//update profile image 
app.post('/update-profile-picture', (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    let profilePicture = req.files.profilePicture;
    let username = req.body.username; // Retrieve the username from the form data

    // Use a unique identifier for the filename to avoid conflicts
    let filename = username + '-' + Date.now() + path.extname(profilePicture.name);

    // Save the file to your server's file system or preferred storage
    profilePicture.mv(path.join(__dirname, '/chat_app/upload/', filename), function(err) {
        if (err)
            return res.status(500).send(err);

        // Update user's profile picture path in the database
        db.query('UPDATE chat_users SET profile_picture = ? WHERE username = ?', [filename, username], (error, results) => {
            if (error) {
                console.error('Error updating the database:', error);
                return res.status(500).send('Database update failed');
            }
            res.send('Profile picture updated successfully');
        });
    });
});



})

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})


const mysql = require('mysql');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'chatapp',
    password: 'w!!8WvYMT%Uj',
    database: 'chatapp'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});