import { clerkClient, getAuth } from "@clerk/express";
import { NextFunction, Response } from "express";

// Middleware to check if the user is has premium plan
export const auth = async (req: any, res: Response, next: NextFunction) => {
  try {
    // const { userId, has } = req.auth();
    const { userId, has } = getAuth(req);
    const isPremium = await has({ plan: "premium" });
    const user = await clerkClient.users.getUser(userId);

    if (!isPremium && user.privateMetadata.free_usage) {
      req.free_usage = user.privateMetadata.free_usage;
    } else {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: 0,
        },
      });
      req.free_usage = 0;
    }
    req.plan = isPremium ? "premium" : "free";
    next();
  } catch (error) {
    console.log("Error in auth middleware", error);
    res
      .status(500)
      .json({ success: false, message: "Error in auth middleware: ", error });
  }
};
