const express = require('express');
const http = require('http');
const {v4: uuidv4} = require('uuid');
const cors = require('cors');
const twilio = require('twilio');

const PORT = process.env.PORT || 5002;

const app = express();

const server = http.createServer(app);

app.use(cors());

let connectedUsers = [];
let rooms = [];

//CREATE ROUTE TO CHECK IF ROOM EXISTS
app.get("/api/room-exists/:roomId", (req, res) => {
    const {roomId} = req.params;
    const room = rooms.find((room) => room.id === roomId);
    if(room){
        // send response that room exists
        if(room.connectedUsers.length > 3){
            return res.send({ roomExists: true, full: true});
        }else{
            return res.send({ roomExists: true, full: false});
        }
    }else{
        // send response that room does not exists
        return res.send({roomExists: false, full: false});
    
    }
});

const io = require('socket.io')(server, {
    cors:{
        origin: '*',
        method: ['GET', 'POST']
    }
});

io.on("connection", (socket) => {
    console.log(`user connected ${socket.id}`)

    socket.on("create-new-room", (data) => {
        createNewRoomHandler(data, socket);
    });

    socket.on("join-room", (data) => {
        joinRoomHandler(data, socket);
    });

    socket.on("disconnect", () => {
        disconnectHandler(socket);
    });

    socket.on("conn-signal", data => {
        signalingHandler(data, socket);
    });

    socket.on("conn-init", data => {
        initializerConnectionHandler(data, socket);
    });
});


//socket.io handlers
const createNewRoomHandler = (data, socket) => {
    const {identity, onlyAudio} = data;
    const roomId = uuidv4();

    //create new user object
    const newUser = {
        identity,
        id: uuidv4(),
        socketId: socket.id,
        roomId,
        onlyAudio
    };

    //push that user to connected users
    connectedUsers = [...connectedUsers, newUser];

    //create new room
    const newRoom = {
        id: roomId,
        connectedUsers: [newUser]
    };

    //join socket.io room
    socket.join(roomId);

    rooms = [...rooms, newRoom];

    //emit to that clinet which created that room roomId
    socket.emit("room-id", {roomId});
    //emit an event to all users connected 
    
    //to that room about new users which are right in this room
    socket.emit("room-update", {connectedUsers: newRoom.connectedUsers}); 
};

const joinRoomHandler = (data, socket) => {
    const {identity, roomId, onlyAudio} = data;

    const newUser = {
        identity,
        id: uuidv4(),
        socketId: socket.id,
        roomId,
        onlyAudio
    }

    //join room as user that joins by passing id
    const room = rooms.find((room) => room.id === roomId);
    room.connectedUsers = [...room.connectedUsers, newUser];

    //join socket.io room
    socket.join(roomId);

    //add new user to connected array
    connectedUsers=[...connectedUsers, newUser];

    //emit to all users at the room to prepare peer connection
    room.connectedUsers.forEach(user => {
        if(user.socketId!==socket.id){
            const data = {
                connUserSocketId: socket.id
            };
            io.to(user.socketId).emit("conn-prepare", data);
        }
    });

    io.to(roomId).emit("room-update", {connectedUsers: room.connectedUsers});
};

const disconnectHandler = (socket) => {
    const user = connectedUsers.find((user) => user.socketId===socket.id);
    if(user){
        const room = rooms.find(room => room.id === user.roomId); 

        room.connectedUsers=room.connectedUsers.filter(user => user.socketId !== socket.id);

        //leave socket io room
        socket.leave(user.roomId);

        if(room.connectedUsers.length > 0){
            //emit to remaining usres that a user got disconnected.
            io.to(room.id).emit("user-disconnected", {socketId: socket.id});

            //emit an event to rest of users to update their connecter users list
            io.to(room.id).emit("room-update", {connectedUsers: room.connectedUsers});
            
        }else{
            //close the room if no users are connected
            rooms = rooms.filter(r => r.id!== room.id);
        }

    }
    
};

const signalingHandler = (data, socket) => {
    const { connUserSocketId, signal} = data;

    const signalingData = {signal, connUserSocketId: socket.id};
    io.to(connUserSocketId).emit("conn-signal", signalingData);
};

//Information from clients which are already in room that they have prepared for incoming connection.
const initializerConnectionHandler = (data, socket) => {
    const {connUserSocketId} = data;
    const initData = {connUserSocketId: socket.id}
    io.to(connUserSocketId).emit("conn-init", initData)
};



server.listen(PORT, ()=>{
    console.log(`server running on port: ${PORT}`);
})