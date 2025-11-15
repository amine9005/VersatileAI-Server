import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import sql from "../configs/db";
export const getUserCreations = async (req: Request, res: Response) => {
  console.log("getUserCreations called");
  try {
    const { userId } = getAuth(req);
    const creations =
      await sql`SELECT * FROM creations WHERE user_id = ${userId} ORDER BY created_at DESC;`;

    res.status(200).json({ success: true, content: creations });
  } catch (error) {
    console.log("can't get user creations", error);
    res.status(500).json({ success: false, message: error });
  }
};

export const toggleLikedCreations = async (req: Request, res: Response) => {
  console.log("toggleLikedCreations called");
  try {
    const { userId } = getAuth(req);
    const { id } = req.body;
    console.log("id: ", id, "userId: ", userId);
    const [creations] =
      await sql`SELECT * FROM creations WHERE id = ${id} ORDER BY created_at DESC;`;

    if (!creations) {
      return res
        .status(404)
        .json({ success: false, message: "Creation not found" });
    }

    let currentLikes: string[] = creations.likes;
    const userIdString = userId.toString();
    let message = "";

    if (currentLikes.includes(userIdString)) {
      message = "You have disliked this creation";
      currentLikes = currentLikes.filter(
        (user: string) => user !== userIdString
      );
    } else {
      message = "You have liked this creation";
      currentLikes.push(userIdString);
    }

    await sql`UPDATE creations SET likes = ${currentLikes} WHERE id = ${id};`;

    res.status(200).json({ success: true, message: message });
  } catch (error) {
    console.log("can't get user creations", error);
    res.status(500).json({ success: false, message: error });
  }
};

export const getPublishedCreations = async (req: Request, res: Response) => {
  console.log("getPublishedCreations called");
  try {
    const creations =
      await sql`SELECT * FROM creations WHERE publish = true ORDER BY created_at DESC;`;

    res.status(200).json({ success: true, content: creations });
  } catch (error) {
    console.log("can't get user creations", error);
    res.status(500).json({ success: false, message: error });
  }
};
