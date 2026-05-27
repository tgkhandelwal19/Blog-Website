const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const Blog = require("./models/Blog");

const app = express();

app.use(cors());
app.use(express.json());

const SECRET = "inkflow_secret";


// ================= MONGODB =================
mongoose.connect("mongodb://127.0.0.1:27017/inkflow")
  .then(() => console.log("MongoDB connected ✅"))
  .catch(err => console.log(err));


// ================= AUTH =================
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
}


// ================= AUTH ROUTES =================

// REGISTER
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: "User exists" });

    const hashed = await bcrypt.hash(password, 10);

    await User.create({ username, email, password: hashed });

    res.json({ msg: "Registered ✅" });

  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});


// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Wrong password" });

    const token = jwt.sign({ id: user._id }, SECRET);

    res.json({ token });

  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});


// ================= PROFILE =================

// GET USER
app.get("/api/profile", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
});

// GET USER BLOGS (LIBRARY)
app.get("/api/myblogs", auth, async (req, res) => {
  const blogs = await Blog.find({ author: req.user.id })
    .sort({ createdAt: -1 });

  res.json(blogs);
});


// ================= BLOG ROUTES =================

// CREATE BLOG
app.post("/api/blogs", auth, async (req, res) => {
  const { title, content, image } = req.body;

  const blog = await Blog.create({
    title,
    content,
    image: image || "",
    author: req.user.id,
    likes: 0,
    bookmarks: [],
    createdAt: new Date()
  });

  res.json(blog);
});


// GET BLOGS (FOR YOU)
app.get("/api/blogs", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;

  const blogs = await Blog.find()
    .populate("author", "username email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json(blogs);
});


// GET SINGLE BLOG
app.get("/api/blogs/:id", async (req, res) => {
  const blog = await Blog.findById(req.params.id)
    .populate("author", "username email");

  if (!blog) return res.status(404).json({ msg: "Not found" });

  res.json(blog);
});


// UPDATE (ONLY OWNER)
app.put("/api/blogs/:id", auth, async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) return res.status(404).json({ msg: "Not found" });

  if (blog.author.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  blog.title = req.body.title;
  blog.content = req.body.content;
  blog.image = req.body.image;

  await blog.save();

  res.json(blog);
});


// DELETE (ONLY OWNER)
app.delete("/api/blogs/:id", auth, async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) return res.status(404).json({ msg: "Not found" });

  if (blog.author.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  await blog.deleteOne();

  res.json({ msg: "Deleted ✅" });
});


// LIKE
app.post("/api/like/:id", auth, async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) return res.status(404).json({ msg: "Not found" });

  blog.likes += 1;
  await blog.save();

  res.json({ likes: blog.likes });
});


// BOOKMARK
app.post("/api/bookmark/:id", auth, async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) return res.status(404).json({ msg: "Not found" });

  const index = blog.bookmarks.indexOf(req.user.id);

  if (index === -1) blog.bookmarks.push(req.user.id);
  else blog.bookmarks.splice(index, 1);

  await blog.save();

  res.json(blog);
});


// ================= START =================
app.listen(5000, () => {
  console.log("Server running on port 5000 🚀");
});