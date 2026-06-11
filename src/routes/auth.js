const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

function sanitizeRole(role) {
  return role === "company" ? "company" : "intern";
}

router.get("/register", (req, res) => {
  const role = sanitizeRole(req.query.role);
  res.render("auth/register", { title: "Create account", role, error: null, form: {} });
});

router.post("/register", async (req, res) => {
  const role = sanitizeRole(req.body.role);
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const fullName = String(req.body.fullName || "").trim();
  const companyName = String(req.body.companyName || "").trim();

  const form = { email, fullName, companyName };

  if (!email || !password) {
    return res.status(400).render("auth/register", { title: "Create account", role, error: "Email and password are required.", form });
  }
  if (password.length < 6) {
    return res.status(400).render("auth/register", { title: "Create account", role, error: "Password must be at least 6 characters.", form });
  }
  if (role === "intern" && !fullName) {
    return res.status(400).render("auth/register", { title: "Create account", role, error: "Full name is required for interns.", form });
  }
  if (role === "company" && !companyName) {
    return res.status(400).render("auth/register", { title: "Create account", role, error: "Company name is required for companies.", form });
  }

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    return res.status(409).render("auth/register", { title: "Create account", role, error: "Email already in use.", form });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    role,
    email,
    passwordHash,
    fullName: role === "intern" ? fullName : undefined,
    companyName: role === "company" ? companyName : undefined,
  });

  req.session.user = {
    id: String(user._id),
    role: user.role,
    email: user.email,
    fullName: user.fullName || null,
    companyName: user.companyName || null,
  };

  return res.redirect("/");
});

router.get("/login", (req, res) => {
  res.render("welcome", { title: "Log in", error: null, form: {} });
});

router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const form = { email };

  if (!email || !password) {
    return res.render("welcome", { title: "Log in", error: "Email and password are required.", form });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.render("welcome", { title: "Log in", error: "Invalid credentials.", form });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.render("welcome", { title: "Log in", error: "Invalid credentials.", form });
  }

  req.session.user = {
    id: String(user._id),
    role: user.role,
    email: user.email,
    fullName: user.fullName || null,
    companyName: user.companyName || null,
  };

  return res.redirect("/");
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

module.exports = router;

