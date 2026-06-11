const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    authorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorRole: { type: String, enum: ["intern", "company"], required: true },
    authorName: { type: String, required: true, trim: true },
    authorAvatarUrl: { type: String, trim: true },
    content: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
