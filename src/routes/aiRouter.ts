import express from "express";
import { auth } from "../middlewares/auth";
import {
  generateArticle,
  generateBlogTitles,
  generateImage,
} from "../controllers/aiController";

const router = express.Router();

router.post("/generate-article", auth, generateArticle);
router.post("/generate-blog-titles", auth, generateBlogTitles);
router.post("/generate-image", auth, generateImage);

export default router;
