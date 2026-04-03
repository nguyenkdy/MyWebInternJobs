const express = require("express");
const mongoose = require("mongoose");
const Job = require("../models/Job");
const Application = require("../models/Application");
const { requireRole } = require("../middleware/auth");
const User = require("../models/User");
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !String(file.mimetype).startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed."));
    }
    cb(null, true);
  },
});

async function attachS3Urls(user) {
  if (user.avatarS3Key) user.avatar = await getImageUrlFromS3(user.avatarS3Key);
  else user.avatar = null;

  if (user.coverPhotoS3Key) user.coverPhoto = await getImageUrlFromS3(user.coverPhotoS3Key);
  else user.coverPhoto = null;

  return user;
}

async function ensureCompanyHasAvatar(req, res, next) {
  const companyUserId = req.session?.user?.id;
  if (!companyUserId) return res.redirect("/auth/login");
  const u = await User.findById(companyUserId).lean();
  if (!u?.avatarS3Key) return res.redirect("/company/profile/edit");
  next();
}

router.get("/dashboard", requireRole("company"), ensureCompanyHasAvatar, async (req, res) => {
  const companyUserId = req.session.user.id;
  const jobs = await Job.find({ companyUserId }).sort({ createdAt: -1 }).lean();
  res.render("company/dashboard", { title: "Company dashboard", jobs });
});

router.get("/jobs/new", requireRole("company"), ensureCompanyHasAvatar, (req, res) => {
  res.render("company/new-job", { title: "Post a job", error: null, form: {} });
});

router.post("/jobs", requireRole("company"), ensureCompanyHasAvatar, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const location = String(req.body.location || "").trim();
  const type = String(req.body.type || "internship").trim();
  const description = String(req.body.description || "").trim();
  const requirements = String(req.body.requirements || "").trim();
  const salaryRange = String(req.body.salaryRange || "").trim();

  const form = { title, location, type, description, requirements, salaryRange };
  if (!title || !description) {
    return res.status(400).render("company/new-job", { title: "Post a job", error: "Title and description are required.", form });
  }

  const safeType = ["internship", "part-time", "full-time"].includes(type) ? type : "internship";
  await Job.create({
    companyUserId: req.session.user.id,
    companyName: req.session.user.companyName || "Company",
    title,
    location,
    type: safeType,
    description,
    requirements,
    salaryRange,
  });

  return res.redirect("/company/dashboard");
});

// Company profile view
router.get("/profile", requireRole("company"), async (req, res) => {
  const user = await User.findById(req.session.user.id).lean();
  if (!user) return res.status(404).render("errors/404", { title: "Not Found" });
  const hydrated = await attachS3Urls(user);
  res.render("company/profile", { title: "Company Profile", user: hydrated });
});

// Company profile edit
router.get("/profile/edit", requireRole("company"), async (req, res) => {
  const user = await User.findById(req.session.user.id).lean();
  if (!user) return res.status(404).render("errors/404", { title: "Not Found" });
  const hydrated = await attachS3Urls(user);
  res.render("company/edit-profile", { title: "Edit Company Profile", error: null, form: hydrated });
});

// Update company profile (avatar required)
router.post(
  "/profile",
  requireRole("company"),
  avatarUpload.fields([{ name: "avatar", maxCount: 1 }, { name: "coverPhoto", maxCount: 1 }]),
  async (req, res) => {
    const user = await User.findById(req.session.user.id);
    if (!user) return res.status(404).render("errors/404", { title: "Not Found" });

    const avatarFile = req.files?.avatar?.[0] || null;
    const coverFile = req.files?.coverPhoto?.[0] || null;

    const companyName = String(req.body.companyName || "").trim();
    const companyAbout = String(req.body.companyAbout || "").trim();
    const companyWebsite = String(req.body.companyWebsite || "").trim();

    if (!companyName) {
      const form = await attachS3Urls({ ...user.toObject(), companyName });
      return res.status(400).render("company/edit-profile", { title: "Edit Company Profile", error: "Company name is required.", form });
    }

    user.companyName = companyName;
    user.companyAbout = companyAbout;
    user.companyWebsite = companyWebsite;

    // Upload avatar is required (per your requirement).
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

      if (user.avatarS3Key && user.avatarS3Key !== newKey) {
        try {
          await deleteFromS3(user.avatarS3Key);
        } catch (_) {
          // Ignore delete failures
        }
      }

      user.avatarS3Key = newKey;
      if (uploaded.url) user.avatar = uploaded.url;
    } else {
      if (!user.avatarS3Key) {
        const form = await attachS3Urls({ ...user.toObject(), companyName });
        return res.status(400).render("company/edit-profile", { title: "Edit Company Profile", error: "Avatar upload is required.", form });
      }
    }

    // Cover photo optional
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
          // Ignore delete failures
        }
      }

      user.coverPhotoS3Key = newKey;
      if (uploaded.url) user.coverPhoto = uploaded.url;
    }

    await user.save();

    req.session.user.companyName = companyName;
    return res.redirect("/company/profile");
  }
);

router.post("/jobs/:id/toggle", requireRole("company"), ensureCompanyHasAvatar, async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(404).render("errors/404", { title: "Not Found" });

  const job = await Job.findOne({ _id: id, companyUserId: req.session.user.id });
  if (!job) return res.status(404).render("errors/404", { title: "Not Found" });

  job.isActive = !job.isActive;
  await job.save();
  return res.redirect("/company/dashboard");
});

router.get("/jobs/:id/applications", requireRole("company"), ensureCompanyHasAvatar, async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(404).render("errors/404", { title: "Not Found" });

  const job = await Job.findOne({ _id: id, companyUserId: req.session.user.id }).lean();
  if (!job) return res.status(404).render("errors/404", { title: "Not Found" });

  const applications = await Application.find({ jobId: job._id }).sort({ createdAt: -1 }).lean();
  res.render("company/applications", { title: "Applications", job, applications });
});

router.get("/jobs/:id/edit", requireRole("company"), ensureCompanyHasAvatar, async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(404).render("errors/404", { title: "Not Found" });

  const job = await Job.findOne({ _id: id, companyUserId: req.session.user.id }).lean();
  if (!job) return res.status(404).render("errors/404", { title: "Not Found" });

  res.render("company/edit-job", { title: "Edit job", error: null, form: job });
});

router.post("/jobs/:id", requireRole("company"), ensureCompanyHasAvatar, async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(404).render("errors/404", { title: "Not Found" });

  const job = await Job.findOne({ _id: id, companyUserId: req.session.user.id });
  if (!job) return res.status(404).render("errors/404", { title: "Not Found" });

  const title = String(req.body.title || "").trim();
  const location = String(req.body.location || "").trim();
  const type = String(req.body.type || "internship").trim();
  const description = String(req.body.description || "").trim();
  const requirements = String(req.body.requirements || "").trim();
  const salaryRange = String(req.body.salaryRange || "").trim();

  const form = { title, location, type, description, requirements, salaryRange };
  if (!title || !description) {
    return res.status(400).render("company/edit-job", { title: "Edit job", error: "Title and description are required.", form });
  }

  const safeType = ["internship", "part-time", "full-time"].includes(type) ? type : "internship";
  job.title = title;
  job.location = location;
  job.type = safeType;
  job.description = description;
  job.requirements = requirements;
  job.salaryRange = salaryRange;
  await job.save();

  return res.redirect("/company/dashboard");
});

router.post("/jobs/:id/delete", requireRole("company"), ensureCompanyHasAvatar, async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(404).render("errors/404", { title: "Not Found" });

  const job = await Job.findOne({ _id: id, companyUserId: req.session.user.id });
  if (!job) return res.status(404).render("errors/404", { title: "Not Found" });

  // Delete associated applications first
  await Application.deleteMany({ jobId: job._id });
  
  // Delete the job
  await Job.deleteOne({ _id: job._id });

  return res.redirect("/company/dashboard");
});

module.exports = router;

