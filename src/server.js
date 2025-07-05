import express from "express";
import "dotenv/config";
import sequelize from "./config/db.js";
import bcrypt from "bcrypt";
import User from "./models/User.js";
import jwt from "jsonwebtoken";
import { authMiddleWare } from "./middleware/auth.js";
import { checkPasswordChange } from "../src/middleware/checkPasswordChange.js";
import checkRole from "../src/middleware/checkRole.js";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello, sequelize with Express");
});

app.get("/users", authMiddleWare, async (req, res) => {
  try {
    const users = await User.findAll();
    res.status(200).json(users);
  } catch (error) {
    res.send(500).json(error);
  }
});

app.get("/admin", authMiddleWare, checkRole, async (req, res) => {
  try {
    const users = await User.findAll();
    res.status(200).json({ message: "Welcome to admin area", users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(404).json({ message: "All fields are required" });
    }
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email has already registered" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    res.status(201).json({ message: "User successfully registered" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/login", checkPasswordChange, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "All fields are required" });
    }
    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "Invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.mustChangePassword) {
      return res.status(403).json({ message: "Please change password" });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.status(200).json({ message: "Login successfully", token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/change-password", async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    if (!email || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email and new password are required" });
    }
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.mustChangePassword = false;
    await user.save();
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/change-email", authMiddleWare, async (req, res) => {
  const { newEmail, currentPassword } = req.body;
  const userId = req.user.id;
  try {
    if (!newEmail || !currentPassword) {
      return res
        .status(400)
        .json({ message: "New email and current password are required" });
    }
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }
    const existingUser = await User.findOne({ where: { email: newEmail } });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }
    user.email = newEmail;
    await user.save();
    return res.status(500).json({
      message: "Email changed successfully",
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/delete-account", authMiddleWare, async (req, res) => {
  const { password } = req.body;
  const userId = req.user.id;
  try {
    if (!password) {
      return res.status(400).json({ message: "Current password is required" });
    }
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }
    await User.destroy({ where: { id: userId } });
    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log("Connectio to database has been established successfully");
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
});
