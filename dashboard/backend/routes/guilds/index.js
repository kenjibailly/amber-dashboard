const express = require("express");
const router = express.Router();

router.use("/", require("./discord"));
router.use("/", require("./modules"));
router.use("/", require("./reactionRoles"));
router.use("/", require("./customCommands"));
router.use("/", require("./messages"));
router.use("/", require("./changeLogs"));
// router.use("/", require("./economy"));

module.exports = router;
