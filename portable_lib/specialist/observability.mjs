import { appendJsonLine } from "./paths.mjs";

export function nowMs() {
  return Date.now();
}

export function elapsedMs(startMs) {
  return Math.max(0, Date.now() - Number(startMs || Date.now()));
}

export class SpecialistObservability {
  constructor({ paths }) {
    this.paths = paths;
  }

  writeEvent(event) {
    appendJsonLine(this.paths.specialistLogFile, {
      ts: new Date().toISOString(),
      ...event,
    });
  }
}
