const jwt  = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // DEBUG — ye console mein dikhega
    console.log("AUTH HEADER:", authHeader);
    console.log("JWT_SECRET:", process.env.JWT_SECRET);
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    
    // DEBUG
    console.log("TOKEN:", token);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("DECODED:", decoded);
    
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }
    next();
  } catch (err) {
    console.log("JWT ERROR:", err.message); // ← exact error dikhega
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = { protect };