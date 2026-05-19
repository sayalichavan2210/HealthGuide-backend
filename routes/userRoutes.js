const express = require("express");
const router  = express.Router();
const { getProfile, updateProfile, changePassword } = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware");

router.get ("/profile",         protect, getProfile);
router.put ("/profile",         protect, updateProfile);
router.patch("/change-password", protect, changePassword);

module.exports = router;