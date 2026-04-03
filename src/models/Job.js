const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    companyUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyName: { type: String, required: true, trim: true },

    title: { type: String, required: true, trim: true, index: true },
    location: { type: String, trim: true },
    type: { type: String, enum: ["internship", "part-time", "full-time"], default: "internship", index: true },

    description: { type: String, required: true, trim: true },
    requirements: { type: String, trim: true },
    salaryRange: { type: String, trim: true },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", JobSchema);

