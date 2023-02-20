const Job = require("../models/Job")

const createJob = async (req, res) => {
  try {
    const job = new Job({
      ...req.body
    })
    await job.save()
    const _job = await Job.findOne({ _id: job._id }).populate("machine").populate("part").populate("user")
    res.send({ job: _job })
  } catch (err) {
    console.log(err)
    res.sendStatus(500)
  }
}

const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find({}).populate("machine").populate("part").populate("user")
    res.send({ jobs })
  } catch (err) {
    res.sendStatus(500)
  }
}

const updateJob = async (req, res) => {
  try {
    const job = await Job.findOneAndUpdate({
      _id: req.body.id
    }, {
      ...req.body.update
    }, {
      new: true
    }).populate("machine").populate("user").populate("part")
    res.send({ job })
  } catch(err) {
    res.sendStatus(500)
  }
}

const deleteJob = async (req, res) => {
  try {
    await Job.findOneAndDelete({
      _id: req.body.id
    })
    res.sendStatus(200)
  } catch(err) {
    res.sendStatus(500)
  }
}

module.exports = { createJob, getJobs, updateJob, deleteJob }