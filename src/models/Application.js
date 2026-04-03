const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    internUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
    resumeUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

ApplicationSchema.index({ jobId: 1, internUserId: 1 }, { unique: true });

module.exports = mongoose.model("Application", ApplicationSchema);

