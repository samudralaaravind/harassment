const { Router } = require("express");
const { emailRegex } = require("../utils/regex");
const { sendOtp, verifyOtp } = require("../services/authservice");

const router = Router();

router.post("/otp/send", (req, res) => {
  const email = req.body.email;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email address" });
  }
  sendOtp(email, res);
});

router.post("/otp/verify", async (req, res) => {
  const { email, otp } = req.body;
  if (!emailRegex.test(email) || otp?.length !== 4 || isNaN(Number(otp))) {
    return res.status(400).json({ message: "Invalid payload" });
  }
  const { statusCode, message, token } = await verifyOtp(email, Number(otp));
  if (token) {
    // 4 weeks => 28 days
    const currentDate = new Date(); // 15 Sept + 28.= 43
    currentDate.setDate(currentDate.getDate() + 28);
    res.cookie("jwt-token", token, { expires: currentDate });
  }
  res.status(statusCode).json({ message });
});

module.exports = router;
