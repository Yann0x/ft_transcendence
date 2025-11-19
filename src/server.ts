import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";

const app = Fastify({ logger: true });

app.register(fastifyStatic, {
  root: path.join(__dirname, "..", "public"),
});

app.get("/yann", async (req, reply) => {
  return reply.sendFile("index.html");
});

const start = async () => {
  try {
    await app.listen({ port: 3000 });
    console.log("Server OK on http://localhost:3000");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();

