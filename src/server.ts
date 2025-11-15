import express, { Request, Response } from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import aiRouter from "./routes/aiRouter";
import cors from "cors";
import dotenv from "dotenv";
import connectCloudinary from "./configs/cloudinary";
import userRouter from "./routes/userRouter";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [process.env.ALLOWED_ORIGIN_URL],
  })
);

app.use(express.json());
app.use(clerkMiddleware());

app.use(requireAuth());

app.use("/api/user", userRouter);
app.use("/api/ai", aiRouter);

app.use("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "Server is running" });
});

// app.get("/x", (req: Request, res: Response) => {
//   res.status(404).json({ message: "Resource Not Found " });
// });

connectCloudinary().then(() => {
  app.listen(process.env.PORT, () => {
    console.log("Server is running on port " + process.env.PORT);
  });
});

export default app;
