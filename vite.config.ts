import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import treeSitterPlugin from "./vite-plugin-tree-sitter";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    treeSitterPlugin(["tree-sitter-javascript", "tree-sitter-jsdoc"]),
  ],
});
