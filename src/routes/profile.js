const express = require("express");
const User = require("../models/User");
const { requireRole } = require("../middleware/auth");
const multer = require("multer");
const {
  uploadImageToS3,
  getImageUrlFromS3,
  deleteFromS3,
  buildS3Key,
} = require("../services/s3");

const router = express.Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !String(file.mimetype).startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed."));
    }
    cb(null, true);
  },
});

async function attachS3Urls(user) {
  try {
    if (user.avatarS3Key) user.avatar = await getImageUrlFromS3(user.avatarS3Key);
    else user.avatar = null;
  } catch (err) {
    console.error("Failed to get avatar URL:", err);
    user.avatar = null;
  }

  try {
    if (user.coverPhotoS3Key) user.coverPhoto = await getImageUrlFromS3(user.coverPhotoS3Key);
    else user.coverPhoto = null;
  } catch (err) {
    console.error("Failed to get cover photo URL:", err);
    user.coverPhoto = null;
  }
  return user;
}

// Profile view
router.get("/", requireRole("intern"), async (req, res) => {
  const user = await User.findById(req.session.user.id).lean();
  if (!user) return res.status(404).render("errors/404", { title: "Not Found" });

  const hydrated = await attachS3Urls(user);
  res.render("profile/view", { title: "My Profile", user: hydrated });
});

// Edit profile form
router.get("/edit", requireRole("intern"), async (req, res) => {
  const user = await User.findById(req.session.user.id).lean();
  if (!user) return res.status(404).render("errors/404", { title: "Not Found" });

  const hydrated = await attachS3Urls(user);
  res.render("profile/edit", { title: "Edit Profile", error: null, form: hydrated });
});

// Update profile
router.post("/", requireRole("intern"), avatarUpload.fields([{ name: "avatar", maxCount: 1 }, { name: "coverPhoto", maxCount: 1 }]), async (req, res) => {
  const user = await User.findById(req.session.user.id);
  if (!user) return res.status(404).render("errors/404", { title: "Not Found" });

  const avatarFile = req.files?.avatar?.[0] || null;
  const coverFile = req.files?.coverPhoto?.[0] || null;

  const fullName = String(req.body.fullName || "").trim();
  const aboutMe = String(req.body.aboutMe || "").trim();
  const university = String(req.body.university || "").trim();
  const major = String(req.body.major || "").trim();
  const graduationYear = req.body.graduationYear ? Number(req.body.graduationYear) : null;
  const skills = String(req.body.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s);
  const experience = String(req.body.experience || "")
    .split("\n")
    .map((e) => e.trim())
    .filter((e) => e);
  const projects = String(req.body.projects || "")
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p);

  if (!fullName) {
    const form = await attachS3Urls({ ...user.toObject(), fullName });
    return res.status(400).render("profile/edit", { title: "Edit Profile", error: "Full name is required.", form });
  }

  user.fullName = fullName;
  user.aboutMe = aboutMe;
  user.university = university;
  user.major = major;
  user.graduationYear = graduationYear;
  user.skills = skills;
  user.experience = experience;
  user.projects = projects;

  // Avatar is optional for updates
  if (avatarFile) {
    const newKey = buildS3Key({
      userId: String(user._id),
      kind: "avatar",
      originalName: avatarFile.originalname,
    });

    const uploaded = await uploadImageToS3({
      buffer: avatarFile.buffer,
      key: newKey,
      contentType: avatarFile.mimetype,
    });

    // Best-effort delete old avatar to reduce storage cost.
    if (user.avatarS3Key && user.avatarS3Key !== newKey) {
      try {
        await deleteFromS3(user.avatarS3Key);
      } catch (_) {
        // Ignore delete failures; new image is already uploaded.
      }
    }

    user.avatarS3Key = newKey;
    if (uploaded.url) user.avatar = uploaded.url;
  }

  // Cover photo is optional.
  if (coverFile) {
    const newKey = buildS3Key({
      userId: String(user._id),
      kind: "cover",
      originalName: coverFile.originalname,
    });

    const uploaded = await uploadImageToS3({
      buffer: coverFile.buffer,
      key: newKey,
      contentType: coverFile.mimetype,
    });

    if (user.coverPhotoS3Key && user.coverPhotoS3Key !== newKey) {
      try {
        await deleteFromS3(user.coverPhotoS3Key);
      } catch (_) {
        // Ignore delete failures.
      }
    }

    user.coverPhotoS3Key = newKey;
    if (uploaded.url) user.coverPhoto = uploaded.url;
  }

  await user.save();

  // Update session
  req.session.user.fullName = fullName;

  return res.redirect("/profile");
});

module.exports = router;