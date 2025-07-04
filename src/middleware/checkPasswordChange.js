import User from "../models/User.js";

export const checkPasswordChange = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (user && user.mustChangePassword) {
      return res
        .status(403)
        .json({ message: "You must change password before loggin in" });
    }
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
