import { defineApp } from "convex/server";
import rag from "@convex-dev/rag/convex.config";
import agent from "@convex-dev/agent/convex.config";
import migrations from "@convex-dev/migrations/convex.config.js";

const app = defineApp();
app.use(rag);
app.use(agent);
app.use(migrations);
export default app;
