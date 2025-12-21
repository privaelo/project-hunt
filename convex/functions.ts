import { Triggers } from "convex-helpers/server/triggers";
import { customCtx, customMutation } from "convex-helpers/server/customFunctions";
import { internalMutation as rawMutation } from "./_generated/server";
import { DataModel } from "./_generated/dataModel";

const triggers = new Triggers<DataModel>();

triggers.register("projects", async (ctx, change) => {
  if (change.newDoc) {
    // Get team name if teamId exists
    let teamName = "";
    if (change.newDoc.teamId) {
      const team = await ctx.db.get(change.newDoc.teamId);
      teamName = team?.name ?? "";
    }

    const allFields = `${change.newDoc.name} ${change.newDoc.summary || ""} ${teamName}`.trim();

    if (change.newDoc.allFields !== allFields) {
      await ctx.db.patch(change.id, { allFields });
    }
  }
});

export const internalMutation = customMutation(rawMutation, customCtx(triggers.wrapDB));