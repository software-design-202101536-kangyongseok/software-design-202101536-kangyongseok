require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const mongoURI = process.env.MONGODB_URL;
const stdRouter = require("./routes/stdRoute");
const path = require("path");

const publicPath = path.resolve(__dirname, "public");
app.use("/", express.static(publicPath));

mongoose
  .connect(mongoURI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

app.set("view engine", "ejs");
app.set("views", "./views");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/students", stdRouter);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});