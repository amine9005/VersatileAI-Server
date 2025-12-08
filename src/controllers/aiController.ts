import { Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { GoogleGenAI, Modality } from "@google/genai";
import sql from "../configs/db";
import { RequestWithClerk } from "../lib/types";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import * as fs from "node:fs";
import pdf from "pdf-parse-new";
import { InferenceClient } from "@huggingface/inference";

dotenv.config();

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({});
const client = new InferenceClient(process.env.HUGGING_FACE_API_KEY);

/**
 * Generates an article based on the provided prompt and length.
 * Requires the user to have a valid plan and not have exceeded their free usage limit.
 * If the user has a premium plan, the free usage limit is ignored.
 * If the user does not have a premium plan, the free usage limit is incremented by 1 after successful generation.
 * Returns a JSON response with the generated article content and a success flag.
 * If the user has exceeded their free usage limit, returns a JSON response with a 403 status code and a message indicating that the free usage limit has been reached.
 * If an error occurs during generation, returns a JSON response with a 500 status code and the error message.
 * @param {RequestWithClerk} req - The request object with the Clerk middleware.
 * @param {Response} res - The response object.
 * @returns {Promise<Response>} - A promise resolving to the response object.
 */
export const generateArticle = async (req: RequestWithClerk, res: Response) => {
  console.log("generateArticle called");
  try {
    const { userId } = getAuth(req);
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    const command = `generate an detailed article based on this: ${prompt}`;
    if (plan !== "premium" && free_usage >= 10) {
      return res.status(403).json({
        success: false,
        message: "You have reached your free usage limit.",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemma-3-27b-it",
      contents: command,
      config: {
        temperature: 0.7,
        maxOutputTokens: length,
      },
    });
    // console.log("AI response: ", response.text);

    // console.log("plan: ", plan, "free_usage: ", free_usage);

    await sql` INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${command}, ${response.text},'article');`;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    return res.status(200).json({ success: true, content: response.text });
  } catch (error) {
    console.log("Error in generateArticle ", error);
    return res.status(500).json({ success: false, message: error });
  }
};

/**
 * Generates blog titles based on the provided prompt.
 * Requires the user to have a valid plan and not have exceeded their free usage limit.
 * If the user has a premium plan, the free usage limit is ignored.
 * If the user does not have a premium plan, the free usage limit is incremented by 1 after successful generation.
 * Returns a JSON response with the generated blog titles content and a success flag.
 * If the user has exceeded their free usage limit, returns a JSON response with a 403 status code and a message indicating that the free usage limit has been reached.
 * If an error occurs during generation, returns a JSON response with a 500 status code and the error message.
 * @param {RequestWithClerk} req - The request object with the Clerk middleware.
 * @param {Response} res - The response object.
 * @returns {Promise<Response>} - A promise resolving to the response object.
 */
export const generateBlogTitles = async (
  req: RequestWithClerk,
  res: Response
) => {
  console.log("generateBlogTitles called");
  try {
    const { userId } = getAuth(req);
    const { prompt } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;
    const command = `generate titles for this subject: ${prompt}`;

    if (plan !== "premium" && free_usage >= 10) {
      return res.status(403).json({
        success: false,
        message: "You have reached your free usage limit.",
      });
    }
    //google gemini api
    const response = await ai.models.generateContent({
      model: "gemma-3-27b-it",
      contents: command,
      config: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });
    console.log("AI response: ", JSON.stringify(response));
    // const candidates = response.candidates;
    // const content = candidates[0].content;

    // console.log("AI text: ", content);

    // console.log("plan: ", plan, "free_usage: ", free_usage);

    //add to database 'neon'
    await sql` INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${response.text},'blog-title');`;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    return res.status(200).json({ success: true, content: response.text });
  } catch (error) {
    console.log("Error in generateArticle ", error);
    return res.status(500).json({ success: false, message: error });
  }
};

export const generateImage = async (req: RequestWithClerk, res: Response) => {
  console.log("generateImage called");
  try {
    const { userId } = getAuth(req);
    const { prompt, publish } = req.body;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.status(403).json({
        success: false,
        message: "Become a premium user to generate images :).",
      });
    }

    const response = await client.textToImage({
      provider: "auto",
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: prompt,
      parameters: { num_inference_steps: 5 },
    });

    const image = response as unknown as Blob;

    const arrayBuffer = await image.arrayBuffer();

    const base64Image = `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;

    const { secure_url } = await cloudinary.uploader.upload(base64Image);

    await sql` INSERT INTO creations (user_id, prompt, content, type, publish) VALUES (${userId}, ${prompt}, ${secure_url},'image',${publish ?? false});`;

    return res.status(200).json({ success: true, content: secure_url });
  } catch (error) {
    console.log("Error in Generate Image ", error);
    return res.status(500).json({ success: false, message: error });
  }
};

export const removeImageBackground = async (
  req: RequestWithClerk,
  res: Response
) => {
  console.log("Remove Image Background called");
  try {
    const { userId } = getAuth(req);
    const image = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.status(403).json({
        success: false,
        message: "Become a premium user to generate images :).",
      });
    }

    // fs.writeFileSync("gemini-native-image.png", base64Image);
    // console.log("Image saved as gemini-native-image.png");

    const { secure_url } = await cloudinary.uploader.upload(image.path, {
      transformation: [
        {
          effect: "background_removal",
          background_removal: "remove_the_background",
        },
      ],
    });

    await sql` INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, 'Remove background from image', ${secure_url},'image');`;

    // if (plan !== "premium") {
    //   await clerkClient.users.updateUserMetadata(userId, {
    //     privateMetadata: {
    //       free_usage: free_usage + 1,
    //     },
    //   });
    // }

    return res.status(200).json({ success: true, content: secure_url });
  } catch (error) {
    console.log("Error in generateArticle ", error);
    return res.status(500).json({ success: false, message: error });
  }
};

export const removeObjectFromImage = async (
  req: RequestWithClerk,
  res: Response
) => {
  console.log("Remove Object From Image called");
  try {
    const { userId } = getAuth(req);
    const image = req.file;
    const plan = req.plan;
    const { prompt } = req.body;

    if (plan !== "premium") {
      return res.status(403).json({
        success: false,
        message: "Become a premium user to generate images :).",
      });
    }

    // fs.writeFileSync("gemini-native-image.png", base64Image);
    // console.log("Image saved as gemini-native-image.png");

    const { public_id } = await cloudinary.uploader.upload(image.path);

    const secure_url = await cloudinary.url(public_id, {
      transformation: [
        {
          effect: `gen_remove:${prompt}`,
        },
      ],
      resourceType: "image",
    });
    const prompt2 = `Remove the ${prompt} from image`;
    await sql` INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt2}, ${secure_url},'image');`;

    // if (plan !== "premium") {
    //   await clerkClient.users.updateUserMetadata(userId, {
    //     privateMetadata: {
    //       free_usage: free_usage + 1,
    //     },
    //   });
    // }

    return res.status(200).json({ success: true, content: secure_url });
  } catch (error) {
    console.log("Error in generateArticle ", error);
    return res.status(500).json({ success: false, message: error });
  }
};
export const reviewResume = async (req: RequestWithClerk, res: Response) => {
  console.log("review Resume called");
  try {
    const { userId } = getAuth(req);
    const resume = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.status(403).json({
        success: false,
        message: "Become a premium user to generate images :).",
      });
    }

    if (resume.size > 5 * 1024 * 1024) {
      res.status(400).json({
        success: false,
        message: "Resume file size exceeds allowed size 5MB",
      });
    }

    const dataBuffer = fs.readFileSync(resume.path);

    const pdfData = await pdf(dataBuffer);
    const prompt = `Review the following resume and provide constructive feedback on its strengths , weaknesses and areas for improvement. Resume Content\n\n: ${pdfData.text}`;
    // console.log({ prompt });

    // fs.writeFileSync("gemini-native-image.png", base64Image);
    // console.log("Image saved as gemini-native-image.png");

    const response = await ai.models.generateContent({
      model: "gemma-3-27b-it",
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    });

    await sql` INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${"review the uploaded resume"}, ${response.text},'resume-review');`;

    // if (plan !== "premium") {
    //   await clerkClient.users.updateUserMetadata(userId, {
    //     privateMetadata: {
    //       free_usage: free_usage + 1,
    //     },
    //   });
    // }

    return res.status(200).json({ success: true, content: response.text });
  } catch (error) {
    console.log("Error in generateArticle ", error);
    return res.status(500).json({ success: false, message: error });
  }
};
