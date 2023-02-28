const Sequelize = require("sequelize")
const db = require("../config/database.js")

const { DataTypes } = Sequelize.Sequelize

const mongoose = require("mongoose")
const Schema = mongoose.Schema

const userSchema = new Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  refreshToken: String,
  role: String,
  location: String,
  factory: String,
  approved: Boolean,
  admin: Boolean,
  restrict: Boolean
})

module.exports = mongoose.model("Users", userSchema)