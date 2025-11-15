import express from "express";
import { auth } from "../middlewares/auth";
import {
  generateArticle,
  generateBlogTitles,
  generateImage,
  removeImageBackground,
  removeObjectFromImage,
  reviewResume,
} from "../controllers/aiController";
import { upload } from "../configs/multer";

const router = express.Router();

router.post("/write-article", auth, generateArticle);
router.post("/generate-blog-titles", auth, generateBlogTitles);
router.post("/generate-image", auth, generateImage);
router.post(
  "/remove-image-background",
  upload.single("image"),
  auth,
  removeImageBackground
);
router.post(
  "/remove-object-from-image",
  upload.single("image"),
  auth,
  removeObjectFromImage
);
router.post("/review-resume", upload.single("resume"), auth, reviewResume);

export default router;
