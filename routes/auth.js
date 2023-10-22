const express = require("express");

const UserController = require("../controllers/auth");
const UserActionController = require("../controllers/userActions");
const TrialController = require("../controllers/trialControls");
const ShyamController = require("../controllers/shyamendpoint");
const NewSL = require("../controllers/newSL")
const UserSchema = require("../validations/validations");
const MultiUserSL = require('../controllers/finalisedSL')
const IsAuth = require("../middlewares/isAuth");
const getKeys = require("../middlewares/isAuth");
const router = express.Router();

router.post(
  "/signup",
  UserSchema.userSignupSchema,
  UserController.createSignup
);

router.post("/login", UserSchema.userLoginSchema, UserController.showLogin);

router.get("/dashboard", IsAuth, UserActionController.getDashboard);
router.post("/getAccessToken", IsAuth, UserActionController.getAccessToken);
router.post("/placeTrade", UserActionController.placeFirstTrade);
router.post("/getAllUsers", UserActionController.getAllUsers);
router.post("/ticksData", TrialController.ticksData)
router.post("/shyamendpoint", ShyamController.shyampoints)
router.post("/executeOrders", MultiUserSL.executeSL)
router.post('/placeOrders',NewSL.placeOrders)

module.exports = router;
