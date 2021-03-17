import { Request, Response } from "express";
import { Redis } from "ioredis";
import { createUpvoteLoader, createUserLoader } from "./util/createLoaders";

export type MyContext = {
  req: Request;
  redis: Redis;
  res: Response;
  userLoader: ReturnType<typeof createUserLoader>;
  upvoteLoader: ReturnType<typeof createUpvoteLoader>;
};
