
--- on met les import ---
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";

const app = Fastify({ logger: true });

--- definition du static pour trouver le repertoir des fichier html front ---
app.register(fastifyStatic, {
  root: path.join(__dirname, "..", "public"),
});

--- par example le /yann es la page que on met apres l'url et on lui renvoi le fichier html a afficher
ce sont des fonction en gros et on peut y faire des calcul ou interagir avec le backend pour ensuite le envoyer au front ---
app.get("/yann", async (req, reply) => {
  return reply.sendFile("index.html");
});

--- vous pouvez copier la fonction de dessus et changer le /yann par login par exemple et ensuite renvoyer la page de login ---

--- boucle while en gros pour faire tourner le programme ---
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

