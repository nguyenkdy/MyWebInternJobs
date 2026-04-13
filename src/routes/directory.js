const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Job = require("../models/Job");
const { requireRole } = require("../middleware/auth");
const { getImageUrlFromS3 } = require("../services/s3");

const router = express.Router();

async function hydrateAvatarAndCover(user) {
  const hydrated = { ...user };
  try {
    hydrated.avatar = user.avatarS3Key ? await getImageUrlFromS3(user.avatarS3Key) : null;
  } catch (err) {
    console.error("Failed to get avatar URL:", err);
    hydrated.avatar = null;
  }
  try {
    hydrated.coverPhoto = user.coverPhotoS3Key ? await getImageUrlFromS3(user.coverPhotoS3Key) : null;
  } catch (err) {
    console.error("Failed to get cover photo URL:", err);
    hydrated.coverPhoto = null;
  }
  return hydrated;
}

// Intern -> browse companies
router.get("/companies", async (req, res) => {
  const q = String(req.query.q || "").trim();

  const filter = { role: "company", avatarS3Key: { $exists: true, $ne: null } };
  if (q) {
    filter.$or = [
      { companyName: new RegExp(q, "i") },
      { companyAbout: new RegExp(q, "i") },
      { companyWebsite: new RegExp(q, "i") },
    ];
  }

  const companies = await User.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  const hydrated = await Promise.all(companies.map((c) => hydrateAvatarAndCover(c)));

  res.render("companies/list", { title: "Companies", companies: hydrated, q });
});

router.get("/companies/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(404).render("errors/404", { title: "Not Found" });

  const company = await User.findById(id).lean();
  if (!company || company.role !== "company") return res.status(404).render("errors/404", { title: "Not Found" });

  const hydratedCompany = await hydrateAvatarAndCover(company);
  const jobs = await Job.find({ companyUserId: company._id, isActive: true }).sort({ createdAt: -1 }).limit(50).lean();

  res.render("companies/detail", { title: hydratedCompany.companyName || "Company", company: hydratedCompany, jobs });
});

// Company -> browse interns
router.get("/interns", requireRole("company"), async (req, res) => {
  const q = String(req.query.q || "").trim();

  const filter = { role: "intern" };
  if (q) {
    filter.$or = [
      { fullName: new RegExp(q, "i") },
      { university: new RegExp(q, "i") },
      { major: new RegExp(q, "i") },
      { skills: new RegExp(q, "i") },
    ];
  }

  const interns = await User.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  const hydrated = await Promise.all(interns.map((i) => hydrateAvatarAndCover(i)));

  res.render("interns/list", { title: "Interns", interns: hydrated, q });
});

router.get("/interns/:id", requireRole("company"), async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(404).render("errors/404", { title: "Not Found" });

  const intern = await User.findById(id).lean();
  if (!intern || intern.role !== "intern") return res.status(404).render("errors/404", { title: "Not Found" });

  const hydratedIntern = await hydrateAvatarAndCover(intern);
  res.render("profile/view", { title: "Intern Profile", user: hydratedIntern });
});

module.exports = router;

