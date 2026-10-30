// Borra la base de datos local; se regenera con el catálogo demo en la siguiente petición.
import { rmSync } from "node:fs";

rmSync("data/db.json", { force: true });
console.log("data/db.json eliminado. Se regenerará con el catálogo de demostración al iniciar.");
