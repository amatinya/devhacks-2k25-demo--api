import { readFile } from "fs/promises";
import { join } from "path";

export const loadSystemPrompt = ({
  name,
}: {
  name: "chat" | "text-embedding-preparation" | "chat-naming-summary" | "document-naming-summary";
}) => {
  return readFile(join(__dirname.replace("dist/", "src/"), `${name}.md`), "utf-8");
};
