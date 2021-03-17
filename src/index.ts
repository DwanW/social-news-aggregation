import "reflect-metadata"; // typeorm needs this
import "dotenv-safe/config";
import { COOKIE_NAME, __prod__ } from "./constants";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import cors from "cors";
import { User } from "./entities/User";
import { Post } from "./entities/Post";
import { createConnection } from "typeorm";
import path from "path";
import { Upvote } from "./entities/Upvote";
import { createUpvoteLoader, createUserLoader } from "./util/createLoaders";

// session custom variable type merging
declare module "express-session" {
  export interface Session {
    userId?: number;
  }
}

const main = async () => {
  const conn = await createConnection({
    type: "postgres",
    entities: [Post, User, Upvote],
    url: process.env.DATABASE_URL,
    logging: true,
    // synchronize: true,
    migrations: [path.join(__dirname, "./migrations/*")],
  });

  await conn.runMigrations();

  // await Post.delete({})

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis(process.env.REDIS_URL);
  app.set("trust proxy", 1)
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    })
  );

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
        disableTTL: true,
      }),
      cookie: {
        maxAge: 1000 * 3600 * 24,
        httpOnly: true,
        sameSite: "lax",
        secure: __prod__, //cookie only works in https
        // domain: __prod__ ? "mydomain" : undefined,
      },
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET, // make this env var
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      upvoteLoader: createUpvoteLoader(),
    }),
  });

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(parseInt(process.env.PORT), () => {
    console.log("server started on http://localhost:4000");
    console.log("graphql started on http://localhost:4000/graphql");
  });
};

main().catch((err) => {
  console.error(err);
});
