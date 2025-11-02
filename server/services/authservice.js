const User = require("../models/User");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const { generateToken } = require("./jwtservice");
dotenv.config();

// 12:00 -> 1675 (expiry is 30min)
// 12:30 -> expires

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

function sendOtpEmail(email, otp) {
  return transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: "Login for harassment & Injustice reporting app.",
    html: `
        <p>Below is the OTP for your login which will be valid for the next 30mins</p>
        <h2>${otp}</h2>
    `,
  });
}

// Sends an OTP to the specified email address.
const sendOtp = async (email, res) => {
  try {
    const user = await User.findOne({ email });
    const currentTimestamp = parseInt(new Date().getTime() / 1000);
    if (user && user.otpExpiry && user.otpExpiry > currentTimestamp) {
      return res
        .status(400)
        .json({ message: "An OTP already sent to your email address" });
    }
    // User may not exist
    // User exists but otp got expired.
    // 0.374399494
    const otp = parseInt(Math.random() * 10000);
    const otpExpiry = currentTimestamp + 1800;
    await sendOtpEmail(email, otp);
    // Once the OTP is sent we need record that otp in our database.
    if (user) {
      console.log("OTP sent for existing user", otp);
      user.otp = otp;
      // 30 * 60 = 1800
      user.otpExpiry = otpExpiry;
      await user.save();
    } else {
      console.log("OTP sent for new user", otp);
      await User.create({
        email,
        otp,
        otpExpiry,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
      });
    }
    res.status(200).json({ message: "OTP sent successfully!" });
  } catch (error) {
    console.log("An error occurred while sending OTP", error.message);
    res.status(500).json({ message: error.message });
  }
};

// { statusCode: 404, message: "", token?: }
const verifyOtp = async (email, otp) => {
  try {
    const user = await User.findOne({ email });
    if (!user) return { statusCode: 404, message: "User not found" };
    if (!user.otp)
      return { statusCode: 404, message: "OTP not found, please send an OTP." };

    const currentTimestamp = Math.floor(new Date().getTime() / 1000);
    if (user.otpExpiry < currentTimestamp) {
      return {
        statusCode: 410,
        message: "OTP expired, please send another one.",
      };
    }
    if (user.otp !== otp) return { statusCode: 400, message: "Invalid OTP" };
    // Valid otp: verification is success.
    // 1. Delete OTP & otpExpiry from database.
    // 2. Generate JWT with the user's details.

    await User.updateOne(
      { _id: user._id },
      { $unset: { otp: "", otpExpiry: "" } }
    );
    const token = generateToken({ id: user._id, role: user.role });
    return { statusCode: 200, message: "Login success", token };
  } catch (error) {
    return { statusCode: 500, message: error.message };
  }
};

module.exports = { sendOtp, verifyOtp };
