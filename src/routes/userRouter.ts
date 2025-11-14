import express from "express";
import {
  getPublishedCreations,
  getUserCreations,
  toggleLikedCreations,
} from "../controllers/userController";
import { auth } from "../middlewares/auth";

const router = express.Router();

router.get("/get-published-creations", auth, getPublishedCreations);
router.get("/get-user-creations", auth, getUserCreations);
router.put("/toggle-liked-creations", auth, toggleLikedCreations);

export default router;
