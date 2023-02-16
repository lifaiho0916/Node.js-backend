const mongoose = require("mongoose")
const Schema = mongoose.Schema

const timerSchema = new Schema({
  city: String,
  facotry: String,
  name: String,
  machine: {
    type: Schema.Types.ObjectId,
    ref: "Machines"
  },
  part: {
    type: Schema.Types.ObjectId,
    ref: "Parts"
  },
  weight: Number,
  productionTime: Number,
  status: {
    type: String,
    default: "Pending"
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

const Timer = mongoose.model("Timers", timerSchema)

module.exports = Timer