const adminProtect = (req, res, next) => {
  console.log("req.user:", req.user); // ← yeh add karo
  console.log("role:", req.user?.role);
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ success: false, message: "Admin access required" });
  }
};

module.exports = { adminProtect };