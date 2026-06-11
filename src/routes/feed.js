const express = require("express");
const User = require("../models/User");
const Post = require("../models/Post");
const { requireAuth } = require("../middleware/auth");
const { getImageUrlFromS3 } = require("../services/s3");

const router = express.Router();

async function loadRecentPosts() {
  return Post.find().sort({ createdAt: -1 }).limit(40).lean();
}

function getAuthorName(user) {
  return user.role === "company" ? user.companyName || user.email : user.fullName || user.email;
}

async function attachAuthorAvatar(user) {
  if (!user?.avatarS3Key) return null;
  try {
    return await getImageUrlFromS3(user.avatarS3Key);
  } catch (err) {
    console.error("Failed to get author avatar URL:", err);
    return null;
  }
}

router.get("/", requireAuth, async (req, res) => {
  const posts = await loadRecentPosts();
  res.render("feed", { title: "News feed", posts, error: null, form: {} });
});

router.post("/", requireAuth, async (req, res) => {
  const content = String(req.body.content || "").trim();
  const form = { content };

  if (!content) {
    const posts = await loadRecentPosts();
    return res.status(400).render("feed", { title: "News feed", posts, error: "Post content is required.", form });
  }

  const user = await User.findById(req.session.user.id).lean();
  if (!user) {
    return res.redirect("/auth/login");
  }

  const authorAvatarUrl = await attachAuthorAvatar(user);

  await Post.create({
    authorUserId: user._id,
    authorRole: user.role,
    authorName: getAuthorName(user),
    authorAvatarUrl,
    content,
  });

  return res.redirect("/feed");
});

module.exports = router;
