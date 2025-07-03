import express from "express";
import "dotenv/config";
import sequelize from "./config/db.js";
import bcrypt from "bcrypt";
import User from "./models/User.js";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello, sequelize with Express");
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
  } catch (error) {
    res.status(400).json({ error: error.message });
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
