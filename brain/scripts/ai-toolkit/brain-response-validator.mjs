function checkFormat(output, format) {
  if (!format) return [];
  const failures = [];
  const text = String(output ?? "");
  if (format === "non-empty" && !text.trim()) failures.push("output must not be empty");
  if (format === "markdown" && !/[#*_`>-]/.test(text)) failures.push("output does not look like markdown");
  if (format === "json" && !/^[\s\[{]/.test(text.trim())) failures.push("output does not look like json");
  return failures;
}

export function validateBrainResponse({ output, criteria = {} } = {}) {
  const failures = [];
  const warnings = [];
  const text = typeof output === "string" ? output : JSON.stringify(output ?? null);

  if (criteria.schema) {
    const required = Array.isArray(criteria.schema.required) ? criteria.schema.required : [];
    if (!output || typeof output !== "object") {
      failures.push("output must be an object for schema validation");
    } else {
      for (const key of required) {
        if (!(key in output)) failures.push(`missing required key: ${key}`);
      }
    }
  }

  for (const assertion of Array.isArray(criteria.assertions) ? criteria.assertions : []) {
    try {
      const passed = typeof assertion === "function" ? assertion(output) : Boolean(assertion?.check?.(output));
      if (!passed) failures.push(String(assertion?.message || "assertion failed"));
    } catch (error) {
      failures.push(String(error?.message || error));
    }
  }

  failures.push(...checkFormat(text, criteria.format));

  if (text.length > 12000) warnings.push("output is very large");

  const valid = failures.length === 0;
  const score = Math.max(0, 100 - failures.length * 25 - warnings.length * 5);

  return { valid, score, failures, warnings };
}

export function assertBrainResponse(result) {
  const validation = validateBrainResponse(result);
  if (!validation.valid) {
    throw new Error(validation.failures.join("; "));
  }
  return validation;
}