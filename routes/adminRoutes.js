const express = require("express");
const router  = express.Router();
const { protect }      = require("../middlewares/authMiddleware");
const { adminProtect } = require("../middlewares/adminMiddleware");
const {
  getStats,
  getAllUsers,
  deleteUser,
  getAllAssessments,
  makeAdmin,
} = require("../controllers/adminController");

// All routes — login + admin required
router.use(protect, adminProtect);

router.get ("/stats",            getStats);
router.get ("/users",            getAllUsers);
router.delete("/users/:id",      deleteUser);
router.get ("/assessments",      getAllAssessments);
router.patch("/users/:id/admin", makeAdmin);

module.exports = router;