const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URL)

const connection = mongoose.connection;

connection.on("connected" , () =>{
    console.log("Mongoose connected to db");
})

connection.on("error" , (error) =>{
    console.log("Error in mongoDB connection", error);
})

module.exports = mongoose;
