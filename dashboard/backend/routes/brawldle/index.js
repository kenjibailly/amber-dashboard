const express = require("express");
const router = express.Router();

router.use("/", require("./brawldle"));

module.exports = router;
