import fastifyStatic from "@fastify/static";
import path from "path";

export default async function (app: any) {
  app.register(fastifyStatic, {
    root: path.join(__dirname, "..", "..", "public"),
  });
}

