import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import netlifyFunctions from "vite-plugin-netlify-functions";

export default defineConfig({
    plugins: [react(), netlifyFunctions()],
});
