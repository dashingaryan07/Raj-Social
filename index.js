const express = require("express");
const app = express();
const { createServer } = require('node:http');
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const multer = require("multer");
const userRoute = require("./routes/users");
const authRoute = require("./routes/auth");
const postRoute = require("./routes/posts");
const messageRoute = require("./routes/messages");
const conversationRoute = require("./routes/conversations");
const router = express.Router();
const path = require("path");
const cors = require('cors')

const server = createServer(app)

const { Server, socket } = require('socket.io');

const io = new Server(server,{
  cors: {
     origin: "*",
     methods: ["GET", "POST"],
     allowedHeaders: ['Access-Control-Allow-Origin','*'],
     credentials: true
   }
 })
 


app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE');
  res.setHeader('Access-Control-Allow-Methods','Content-Type','Authorization');
  next(); 
})


dotenv.config();

mongoose.connect(
  process.env.MONGO_URL,
  { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify:false },
  () => {
    console.log("Connected to MongoDB");
  }
  );
  app.use("/images", express.static(path.join(__dirname, "public/images")));
  
  

  //middleware
app.use(express.json());
app.use(helmet());
app.use(morgan("common"));

app.get('/', (req, res) => {
  res.send('<h1>Hello world</h1>');
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images");
  },
  filename: (req, file, cb) => {
    cb(null, req.body.name);
  },
});

const upload = multer({ storage: storage });
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    return res.status(200).json("File uploded successfully");
  } catch (error) {
    console.error(error);
  }
});

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/messages", messageRoute);


server.listen(8800, () => {
  console.log("Backend server is running!");
});

io.on('connection', socket => {
  console.log('a user connected');
});

let users = [];

const addUser = (userId, socketId) => {
    !users.some((user) => user.userId === userId) && 
    users.push({userId,socketId})
    
}

const removeUser = (socketId) => {
    users = users.filter((user) => user.socketId !== socketId)
}

const getUser = (userId) => {
    return users.find((user) => user.userId === userId);
}

io.on("connection", (socket) => {
    //on connection
    console.log("a user connected");
    //after every connection take userId and SocketId from User
    socket.on("addUser", (userId) => {
        addUser(userId, socket.id);
        io.emit("getUsers", users)
    })

    //send and get message
    socket.on("sendMessage", ({senderId, receiverId, text}) => {
         const user = getUser(receiverId);
         io.to(user.socketId).emit("getMessage", {
            senderId,
            text
         })
    })
    
    //on disconnection
socket.on("disconnect", () => {
    console.log("a user disconnected");
    removeUser(socket.id)
    io.emit("getUsers", users)
})

  });