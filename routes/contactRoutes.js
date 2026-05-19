// routes/contactRoutes.js
const express = require("express");
const router  = express.Router();
const { submitContact } = require("../controllers/contactController");

// Public route — login required nahi
router.post("/", submitContact);

module.exports = router;