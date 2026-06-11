const express = require("express");
const mongoose = require("mongoose");
const Job = require("../models/Job");
const Application = require("../models/Application");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const type = String(req.query.type || "").trim();

  const filter = { isActive: true };
  if (type && ["internship", "part-time", "full-time"].includes(type)) filter.type = type;
  if (q) filter.$or = [{ title: new RegExp(q, "i") }, { companyName: new RegExp(q, "i") }, { location: new RegExp(q, "i") }];

  const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  res.render("jobs/list", { title: "Find internships", jobs, q, type });
});

router.get("/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(404).render("errors/404", { title: "Not Found" });

  const job = await Job.findById(id).lean();
  if (!job || !job.isActive) return res.status(404).render("errors/404", { title: "Not Found" });

  let alreadyApplied = false;
  if (req.session?.user?.role === "intern") {
    const existing = await Application.findOne({ jobId: job._id, internUserId: req.session.user.id }).lean();
    alreadyApplied = Boolean(existing);
  }

  res.render("jobs/detail", { title: job.title, job, alreadyApplied, error: null, form: {} });
});

router.post("/:id/apply", requireRole("intern"), async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(404).render("errors/404", { title: "Not Found" });

  const job = await Job.findById(id).lean();
  if (!job || !job.isActive) return res.status(404).render("errors/404", { title: "Not Found" });

  const fullName = String(req.body.fullName || "").trim();
  const email = String(req.body.email || "").trim();
  const message = String(req.body.message || "").trim();
  const resumeUrl = String(req.body.resumeUrl || "").trim();
  const form = { fullName, email, message, resumeUrl };

  if (!fullName || !email) {
    return res.status(400).render("jobs/detail", { title: job.title, job, alreadyApplied: false, error: "Full name and email are required.", form });
  }

  try {
    await Application.create({
      jobId: job._id,
      internUserId: req.session.user.id,
      fullName,
      email,
      message,
      resumeUrl,
    });
  } catch (e) {
    if (String(e?.code) === "11000") {
      return res.redirect(`/jobs/${job._id}`);
    }
    throw e;
  }

  return res.redirect(`/jobs/${job._id}`);
});

module.exports = router;

