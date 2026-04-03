function requireAuth(req, res, next) {
  if (!req.session?.user) return res.redirect("/auth/login");
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session?.user) return res.redirect("/auth/login");
    if (req.session.user.role !== role) return res.status(403).render("errors/403", { title: "Forbidden" });
    next();
  };
}

function attachCurrentUser(req, res, next) {
  res.locals.currentUser = req.session?.user || null;
  next();
}

module.exports = { requireAuth, requireRole, attachCurrentUser };

