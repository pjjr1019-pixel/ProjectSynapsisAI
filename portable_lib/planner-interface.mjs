import { updateCanonicalTask } from "./task-model.mjs";

export class PlannerInterface {
  constructor({ plannerId = "planner.unknown", planTask } = {}) {
    if (typeof planTask !== "function") {
      throw new Error("PlannerInterface requires a planTask(task, context) implementation.");
    }
    this.plannerId = plannerId;
    this._planTask = planTask;
  }

  planTask(task, context = {}) {
    return this._planTask(updateCanonicalTask(task, { plannerId: this.plannerId }), context);
  }
}

export function createPlannerInterface(config = {}) {
  return new PlannerInterface(config);
}
