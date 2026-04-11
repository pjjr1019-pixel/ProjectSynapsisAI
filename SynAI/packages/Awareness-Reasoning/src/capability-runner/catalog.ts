import { mkdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import type {
  CapabilityCatalogEntry,
  CapabilityCatalogStatus,
  CapabilityExpandedCase,
  CapabilityPromptVariant,
  CapabilityRunnerCatalogSummary,
  CapabilityRunnerDomain
} from "../contracts/capability-runner";
import { writeAtomicTextFile } from "./report";

export interface CapabilityRunnerCatalogPaths {
  root: string;
  inventoryPath: string;
  sourceCatalogPaths: string[];
  sourceVariantPath: string;
  expandedCaseSourcePath: string;
}

export interface CapabilityPromptVariantConfig {
  variant_order: string[];
  default_variant_ids: Partial<Record<CapabilityRunnerDomain, string[]>>;
  variants: CapabilityPromptVariant[];
}

export interface CapabilityRunnerCatalogBundle {
  paths: CapabilityRunnerCatalogPaths;
  entries: CapabilityCatalogEntry[];
  variants: CapabilityPromptVariantConfig;
  expandedCases: CapabilityExpandedCase[];
  summary: CapabilityRunnerCatalogSummary;
}

const DOMAIN_LABELS: Record<CapabilityRunnerDomain, string> = {
  "windows-capability-tests": "Windows Capability Tests",
  "app-feature-tests": "App Feature Tests",
  "agent-task-tests": "Agent Task Tests",
  "safety-refusal-tests": "Safety / Refusal Tests"
};

const readStructuredFile = async <T>(filePath: string): Promise<T> => {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
};

const renderPromptVariant = (
  entry: CapabilityCatalogEntry,
  variant: CapabilityPromptVariant
): string => {
  const templateKey = variant.use_template_key?.trim() || variant.id;
  const basePrompt =
    entry.prompt_templates[templateKey] ??
    entry.prompt_templates.base ??
    entry.prompt_templates.direct ??
    Object.values(entry.prompt_templates)[0] ??
    entry.title;

  let rendered = variant.template
    ? variant.template.replace(/\{base\}/g, basePrompt)
    : `${variant.prefix ?? ""}${basePrompt}${variant.suffix ?? ""}`;

  if (variant.force_lowercase) {
    rendered = rendered.toLowerCase();
  }

  for (const replacement of variant.typo_map ?? []) {
    rendered = rendered.replaceAll(replacement.from, replacement.to);
  }

  return rendered.replace(/\s+/g, " ").trim();
};

export const resolveCapabilityRunnerCatalogPaths = (
  workspaceRoot: string
): CapabilityRunnerCatalogPaths => {
  const root = path.join(workspaceRoot, "packages", "Capability-Catalog", "unified-capability-runner");
  return {
    root,
    inventoryPath: path.join(root, "repo-inventory.yaml"),
    sourceCatalogPaths: [
      path.join(root, "windows-capability-catalog.yaml"),
      path.join(root, "app-feature-catalog.yaml"),
      path.join(root, "agent-task-catalog.yaml"),
      path.join(root, "safety-refusal-catalog.yaml")
    ],
    sourceVariantPath: path.join(root, "prompt-variants.yaml"),
    expandedCaseSourcePath: path.join(root, "capability-expanded-cases.json")
  };
};

export const validateCapabilityCatalogEntries = (
  entries: CapabilityCatalogEntry[]
): CapabilityCatalogEntry[] => {
  const seenIds = new Set<string>();

  for (const entry of entries) {
    if (!entry.id?.trim()) {
      throw new Error("Capability catalog entry is missing id.");
    }
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate capability catalog id: ${entry.id}`);
    }
    seenIds.add(entry.id);
    if (!entry.domain || !entry.category?.trim() || !entry.title?.trim()) {
      throw new Error(`Capability catalog entry ${entry.id} is missing required fields.`);
    }
    if (!entry.prompt_templates || Object.keys(entry.prompt_templates).length === 0) {
      throw new Error(`Capability catalog entry ${entry.id} has no prompt templates.`);
    }
  }

  return entries;
};

export const validateCapabilityPromptVariants = (
  config: CapabilityPromptVariantConfig
): CapabilityPromptVariantConfig => {
  const ids = new Set<string>();
  for (const variant of config.variants ?? []) {
    if (!variant.id?.trim()) {
      throw new Error("Prompt variant is missing id.");
    }
    if (ids.has(variant.id)) {
      throw new Error(`Duplicate prompt variant id: ${variant.id}`);
    }
    ids.add(variant.id);
  }

  for (const variantId of config.variant_order ?? []) {
    if (!ids.has(variantId)) {
      throw new Error(`Variant order references unknown variant ${variantId}.`);
    }
  }

  return config;
};

export const expandCapabilityCatalogs = (
  entries: CapabilityCatalogEntry[],
  variants: CapabilityPromptVariantConfig
): CapabilityExpandedCase[] => {
  const variantIndex = new Map(variants.variants.map((entry) => [entry.id, entry] as const));
  const orderedEntries = [...entries].sort((left, right) => {
    if (left.domain !== right.domain) {
      return left.domain.localeCompare(right.domain);
    }
    if (left.category !== right.category) {
      return left.category.localeCompare(right.category);
    }
    return left.id.localeCompare(right.id);
  });

  const expanded: CapabilityExpandedCase[] = [];

  for (const entry of orderedEntries) {
    const variantIds = variants.default_variant_ids[entry.domain] ?? variants.variant_order;
    for (const variantId of variantIds) {
      const variant = variantIndex.get(variantId);
      if (!variant) {
        continue;
      }

      expanded.push({
        id: `${entry.id}__${variant.id}`,
        domain: entry.domain,
        category: entry.category,
        capability_id: entry.id,
        title: entry.title,
        description: entry.description,
        status: entry.status,
        task_type: entry.task_type,
        difficulty: entry.difficulty,
        expected_route: entry.expected_route,
        prompt_variant: variant.id,
        prompt_text: renderPromptVariant(entry, variant),
        expected_contains: [...(entry.expected_contains ?? [])],
        expected_not_contains: [...(entry.expected_not_contains ?? [])],
        notes: [...(entry.notes ?? [])],
        source_refs: [...(entry.source_refs ?? [])]
      });
    }
  }

  return expanded;
};

export const buildCapabilityRunnerCatalogSummary = (
  paths: CapabilityRunnerCatalogPaths,
  entries: CapabilityCatalogEntry[],
  expandedCases: CapabilityExpandedCase[]
): CapabilityRunnerCatalogSummary => {
  const statuses = {
    implemented: 0,
    partial: 0,
    stubbed: 0,
    planned: 0
  } satisfies Record<CapabilityCatalogStatus, number>;

  for (const entry of entries) {
    statuses[entry.status] += 1;
  }

  const domains = Object.entries(DOMAIN_LABELS).map(([domain, label]) => {
    const domainEntries = entries.filter((entry) => entry.domain === domain);
    const domainCases = expandedCases.filter((entry) => entry.domain === domain);
    const categories = [...new Set(domainEntries.map((entry) => entry.category))].sort().map((category) => ({
      category,
      capability_count: domainEntries.filter((entry) => entry.category === category).length,
      expanded_case_count: domainCases.filter((entry) => entry.category === category).length
    }));

    return {
      domain: domain as CapabilityRunnerDomain,
      label,
      capability_count: domainEntries.length,
      expanded_case_count: domainCases.length,
      categories
    };
  });

  return {
    inventory_path: paths.inventoryPath,
    source_catalog_paths: [...paths.sourceCatalogPaths],
    source_variant_path: paths.sourceVariantPath,
    expanded_case_source_path: paths.expandedCaseSourcePath,
    generated_at: new Date().toISOString(),
    capability_count: entries.length,
    expanded_case_count: expandedCases.length,
    domains,
    statuses
  };
};

export const loadCapabilityRunnerCatalogBundle = async (
  workspaceRoot: string
): Promise<CapabilityRunnerCatalogBundle> => {
  const paths = resolveCapabilityRunnerCatalogPaths(workspaceRoot);
  const catalogLists = await Promise.all(
    paths.sourceCatalogPaths.map((filePath) => readStructuredFile<CapabilityCatalogEntry[]>(filePath))
  );
  const entries = validateCapabilityCatalogEntries(catalogLists.flat());
  const variants = validateCapabilityPromptVariants(
    await readStructuredFile<CapabilityPromptVariantConfig>(paths.sourceVariantPath)
  );
  const expandedCases = expandCapabilityCatalogs(entries, variants);
  const summary = buildCapabilityRunnerCatalogSummary(paths, entries, expandedCases);

  await mkdir(path.dirname(paths.expandedCaseSourcePath), { recursive: true });
  await writeAtomicTextFile(paths.expandedCaseSourcePath, `${JSON.stringify(expandedCases, null, 2)}\n`);

  return {
    paths,
    entries,
    variants,
    expandedCases,
    summary
  };
};
