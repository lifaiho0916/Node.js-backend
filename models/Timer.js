const mongoose = require("mongoose")
const Schema = mongoose.Schema

const partSchema = new Schema({
  city: String,
  facotry: String,
  name: String,
  pounds: String,
  avgTime: String,
  weight: Number,
  productionTime: Number,
  finishGoodWeight: Number,
  cageWeightScrap: Number,
  caseWeightActuals: Number,
  preview: String
})

const Part = mongoose.model("Parts", partSchema)

module.exports = Part