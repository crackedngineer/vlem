import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, process.cwd(), "");

    return {
        plugins: [react()],

        // Define aliases for cleaner imports
        resolve: {
            alias: {
                "@": resolve(__dirname, "./src"),
                "@components": resolve(__dirname, "./src/components"),
                "@utils": resolve(__dirname, "./src/utils"),
                "@assets": resolve(__dirname, "./src/assets"),
            },
        },

        // Build options
        build: {
            outDir: "dist",
            sourcemap: mode !== "production",
            minify: mode === "production",
            // Ensure chunks aren't too large
            rollupOptions: {
                output: {
                    manualChunks: {
                        react: ["react", "react-dom"],
                    },
                },
            },
        },

        // Load labs.json as a module
        optimizeDeps: {
            include: ["react", "react-dom"],
        },

        // Define global constants replaced at build time
        define: {
            __APP_VERSION__: JSON.stringify(
                process.env.VITE_APP_VERSION || "dev"
            ),
            __APP_ENV__: JSON.stringify(env.VITE_APP_ENV || mode),
        },
    };
});
