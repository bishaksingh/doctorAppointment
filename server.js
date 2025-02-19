const express = require("express");
const app = express();
require("dotenv").config()
const dbConfig = require("./config/dbconfig");
app.use(express.json());
const userRoute = require("./routes/userRoute");
const adminRoute = require("./routes/adminRoute");
const doctorRoute = require("./routes/doctorsRoute");
const path = require("path");

app.use('/api/user', userRoute);
app.use('/api/admin', adminRoute);
app.use('/api/doctor', doctorRoute);

// Serve static assets if in production
app.use(express.static(path.join(__dirname, 'client/build')));

app.get('*', function(req,res){
    res.sendFile(path.join(__dirname+'/client/build/index.html'));
})

const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Node server started at port ${port}`));
