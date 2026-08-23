import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import Pages from "vite-plugin-pages";
import getRepoName from "git-repo-name";

const resolveRepoName = () => {
  try {
    return getRepoName.sync();
  } catch {
    return 'prescription';
  }
};

export default defineConfig(({ command, mode }) => {
    const isGitHubPages = mode === 'github-pages'
    const base = isGitHubPages ? `/${resolveRepoName()}/` : '/'
  
    return {
      plugins: [react(), Pages()],
      base: base,
      build: {
        outDir: isGitHubPages ? 'dist-github' : 'dist'
      },
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src"),
        },
      },
    }
  })