const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["intern", "company"],
      required: true,
      index: true,
    },
    email: { type: String, required: true, unique: true, index: true, trim: true },
    passwordHash: { type: String, required: true },

    // intern profile
    fullName: { type: String, trim: true },
    // Public URL (or signed URL) used by the UI
    avatar: { type: String, trim: true },
    coverPhoto: { type: String, trim: true },

    // Stored S3 object keys so we can generate URLs (public or signed)
    avatarS3Key: { type: String, trim: true, index: true },
    coverPhotoS3Key: { type: String, trim: true, index: true },
    aboutMe: { type: String, trim: true }, // Professional bio
    university: { type: String, trim: true },
    major: { type: String, trim: true },
    graduationYear: { type: Number },
    skills: [{ type: String, trim: true }], // Array of skills
    experience: [{ type: String, trim: true }], // Experience items (one per line)
    projects: [{ type: String, trim: true }], // Project items (one per line)

    // company profile
    companyName: { type: String, trim: true },
    companyAbout: { type: String, trim: true },
    companyWebsite: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);

