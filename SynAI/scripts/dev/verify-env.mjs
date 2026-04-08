const required = ["LOCAL_AI_PROVIDER", "OLLAMA_BASE_URL", "OLLAMA_MODEL"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (process.env.LOCAL_AI_PROVIDER !== "ollama") {
  console.error("LOCAL_AI_PROVIDER must be 'ollama' in phase 1.");
  process.exit(1);
}

console.log("Environment looks good for SynAI phase-1 chat testing.");
