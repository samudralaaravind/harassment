const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

/**
 * Generates a JWT for the user.
 * @param {object} claims - An object containing the user's id and role.
 * @param {string} claims.id - The user's unique identifier.
 * @param {string} claims.role - The user's role.
 * @returns {string} The generated JWT.
 */
function generateToken(claims) {
  return jwt.sign(claims, process.env.JWT_SECRET_KEY, { expiresIn: "4Weeks" });
}

module.exports = { generateToken };
