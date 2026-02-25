const express = require("express");
const router = express.Router();

router.use("/", require("./modules"));
router.use("/", require("./guildModules"));

module.exports = router;
