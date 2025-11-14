import { Request } from "express";
import {} from "multer";

export interface RequestWithClerk extends Request {
  plan: string;
  free_usage: number;
}
