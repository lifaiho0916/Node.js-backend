const mongoose = require("mongoose")
const Schema = mongoose.Schema

const machineSchema = new Schema({
  city: String,
  facotry: String,
  name: String,
  details: String,
  preview: String,
  weight: Number,
  productionTime: Number,
  preview: String
})

const Machine = mongoose.model("Machines", machineSchema)

module.exports = Machine