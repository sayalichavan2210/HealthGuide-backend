const express = require("express");
const router  = express.Router();
const {
  createProfile,
  getLatestProfile,
  getHistory,
  getProfileById,
  updateRiskScores,
  deleteProfile,
  sendReport,
} = require("../controllers/healthController");
const { protect } = require("../middlewares/authMiddleware");

// All routes protected — login required
router.use(protect);

router.post  ("/",              createProfile);     // New assessment
router.get   ("/latest",        getLatestProfile);  // Latest profile
router.get   ("/history",       getHistory);        // All past records
router.get   ("/:id",           getProfileById);    // Single by ID
router.patch ("/:id/risk",      updateRiskScores);  // ML service updates here
router.delete("/:id",           deleteProfile);     // Delete record
router.post("/send-report", sendReport);
module.exports = router;