import { readJsonFile, writeJsonFile } from "./paths.mjs";

export class SpecialistLearningService {
  constructor({ paths }) {
    this.paths = paths;
    this.state = readJsonFile(paths.specialistLearningFile, {
      version: 1,
      updatedAt: null,
      events: [],
      scriptScores: {},
      phraseMap: {},
    });
  }

  save() {
    this.state.updatedAt = new Date().toISOString();
    if (this.state.events.length > 400) {
      this.state.events = this.state.events.slice(-400);
    }
    writeJsonFile(this.paths.specialistLearningFile, this.state);
  }

  getState() {
    return this.state;
  }

  record(event) {
    const normalized = {
      ts: new Date().toISOString(),
      request: String(event?.request || "").trim(),
      script_id: event?.script_id ? String(event.script_id) : null,
      accepted: event?.accepted === true,
      success: event?.success === true,
      rejected: event?.rejected === true,
      corrected_script_id: event?.corrected_script_id ? String(event.corrected_script_id) : null,
      argument_corrections: event?.argument_corrections && typeof event.argument_corrections === "object"
        ? event.argument_corrections
        : null,
    };

    this.state.events.push(normalized);

    const selectedId = normalized.corrected_script_id || normalized.script_id;
    if (selectedId) {
      if (!this.state.scriptScores[selectedId]) {
        this.state.scriptScores[selectedId] = { success: 0, fail: 0, accepted: 0, rejected: 0 };
      }
      if (normalized.success) this.state.scriptScores[selectedId].success += 1;
      if (!normalized.success && normalized.script_id) this.state.scriptScores[selectedId].fail += 1;
      if (normalized.accepted) this.state.scriptScores[selectedId].accepted += 1;
      if (normalized.rejected) this.state.scriptScores[selectedId].rejected += 1;
    }

    const phrase = normalized.request.toLowerCase();
    if (phrase) {
      if (!this.state.phraseMap[phrase]) this.state.phraseMap[phrase] = {};
      if (selectedId) {
        this.state.phraseMap[phrase][selectedId] = (this.state.phraseMap[phrase][selectedId] || 0) + 1;
      }
    }

    this.save();
  }
}
