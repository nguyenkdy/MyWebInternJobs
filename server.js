const path = require("path");
const express = require("express");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
require("dotenv").config();

const { connectDb } = require("./src/db");
const { attachCurrentUser } = require("./src/middleware/auth");

const authRoutes = require("./src/routes/auth");
const jobRoutes = require("./src/routes/jobs");
const companyRoutes = require("./src/routes/company");
const profileRoutes = require("./src/routes/profile");
const directoryRoutes = require("./src/routes/directory");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("Missing SESSION_SECRET. Create a .env file (see .env.example).");
}

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
    }),
  })
);

app.use(attachCurrentUser);

app.get("/", (req, res) => {
  if (req.session.user) {
    return res.render("index", { title: "Welcome", currentUser: req.session.user });
  } else {
    return res.render("welcome", { title: "Welcome", currentUser: null, error: null, form: {} });
  }
});

app.use("/auth", authRoutes);
app.use("/jobs", jobRoutes);
app.use("/company", companyRoutes);
app.use("/profile", profileRoutes);
app.use("/", directoryRoutes);

app.use((req, res) => res.status(404).render("errors/404", { title: "Not Found" }));

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exitCode = 1;
  });

