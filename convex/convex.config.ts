// convex/convex.config.ts
import { defineApp } from "convex/server";
import rag from "@convex-dev/rag/convex.config";
import workOSAuthKit from "@convex-dev/workos-authkit/convex.config";
import agent from "@convex-dev/agent/convex.config";


const app = defineApp();
app.use(rag);
app.use(workOSAuthKit);
app.use(agent);
export default app;
