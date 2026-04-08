import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type {
  AwarenessArea,
  AwarenessContextReason,
  AwarenessDigest,
  AwarenessMode,
  EvidenceRef,
  LastReportedBaseline,
  MachineBaseline,
  PermissionTier,
  PrivacyScope,
  RepoBaseline,
  RepoCommitSummary,
  RepoState,
  SessionBaseline
} from "../../../contracts/src/awareness";
import { buildAwarenessContextSection, createFreshnessMetadata, summarizeAwarenessDigest } from "../context";

export const PHASE_ONE_PERMISSION_TIERS: PermissionTier[] = ["Observe", "Open/Navigate"];

export const PHASE_ONE_ALLOWED_PRIVACY_SCOPE: PrivacyScope = "user-visible local content";

export const DEFAULT_AWARENESS_MODE: AwarenessMode = "observe";

export const DEFAULT_WATCHED_ROOTS = [
  "SynAI",
  "SynAI/apps",
  "SynAI/packages",
  "SynAI/tests",
  "SynAI/docs"
];

export const DEFAULT_IGNORED_ROOTS = [
  ".git",
  ".runtime",
  "SynAI/node_modules",
  "SynAI/out",
  "SynAI/dist",
  "SynAI/dist-electron",
  "SynAI/.vite",
  "SynAI/coverage"
];

const SCORES: Record<PrivacyScope, number> = {
  "public metadata": 0,
  "user-visible local content": 1,
  "sensitive local content": 2,
  "protected/system-sensitive surfaces": 3
};

const digestHash = (value: string): string => createHash("sha256").update(value).digest("hex");
const jsonFingerprint = (value: unknown): string => digestHash(JSON.stringify(value));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export interface GitRunner {
  (args: string[], cwd: string): string | null;
}

export interface RepoCaptureOptions {
  workspaceRoot: string;
  watchedRoots?: string[];
  ignoredRoots?: string[];
  activeFeatureFlags?: string[];
  maxCommits?: number;
  runGit?: GitRunner;
  now?: () => Date;
}

export interface RepoCaptureResult {
  repo: RepoBaseline;
  fallbackMode: boolean;
  evidenceRefs: EvidenceRef[];
}

export interface MachineCaptureOptions {
  now?: () => Date;
  timezone?: string;
  hostname?: string;
  username?: string;
  osVersion?: string;
  osBuild?: string;
  platform?: string;
  arch?: string;
}

export interface SessionBaselineOptions {
  sessionId: string;
  appStartedAt: string;
  workspaceRoot: string;
  runtimeRoot: string;
  currentSessionPath: string;
  previousSessionPath: string;
  lastReportedBaselinePath: string;
  latestDigestPath: string;
  eventsPath: string;
  awarenessMode?: AwarenessMode;
  permissionTier?: PermissionTier;
  privacyScope?: PrivacyScope;
  previousSessionId?: string | null;
  previousSessionRestored?: boolean;
  now?: () => Date;
}

export interface BuildAwarenessDigestOptions {
  session: SessionBaseline;
  repo: RepoBaseline;
  machine: MachineBaseline;
  lastReportedBaseline: LastReportedBaseline | null;
  generatedAt?: string;
  evidenceRefs?: EvidenceRef[];
  blockedScopes?: PrivacyScope[];
  affectedAreas?: AwarenessArea[];
  includeReasonOverride?: AwarenessContextReason;
}

export interface PrivacyScopedValue<T> {
  privacyScope: PrivacyScope;
  value: T;
}

export interface PrivacyScopeFilterResult<T> {
  allowed: T[];
  blockedScopes: PrivacyScope[];
}

export const canUsePermissionTier = (tier: PermissionTier): boolean =>
  PHASE_ONE_PERMISSION_TIERS.includes(tier);

export const canAccessPrivacyScope = (
  requestedScope: PrivacyScope,
  allowedScope = PHASE_ONE_ALLOWED_PRIVACY_SCOPE
): boolean => SCORES[requestedScope] <= SCORES[allowedScope];

export const filterPrivacyScopedValues = <T>(
  items: PrivacyScopedValue<T>[],
  allowedScope = PHASE_ONE_ALLOWED_PRIVACY_SCOPE
): PrivacyScopeFilterResult<T> => {
  const allowed: T[] = [];
  const blockedScopes: PrivacyScope[] = [];

  for (const item of items) {
    if (canAccessPrivacyScope(item.privacyScope, allowedScope)) {
      allowed.push(item.value);
    } else {
      blockedScopes.push(item.privacyScope);
    }
  }

  return {
    allowed,
    blockedScopes
  };
};

const defaultGitRunner: GitRunner = (args, cwd) => {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true
  });

  if (result.status !== 0) {
    return null;
  }

  return (result.stdout ?? "").trim();
};

const formatCommitSummaries = (raw: string | null, maxCommits: number): RepoCommitSummary[] => {
  if (!raw) {
    return [];
  }

  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, maxCommits)
    .map((line) => {
      const [sha = "", shortSha = "", authoredAt = "", subject = ""] = line.split("\t");
      return {
        sha,
        shortSha,
        authoredAt,
        subject
      };
    });
};

export const resolveRepositoryRoot = (startDir: string): string => {
  let current = path.resolve(startDir);

  while (true) {
    if (existsSync(path.join(current, ".git"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }

    current = parent;
  }
};

export const captureRepoBaseline = (options: RepoCaptureOptions): RepoCaptureResult => {
  const now = options.now ?? (() => new Date());
  const workspaceRoot = path.resolve(options.workspaceRoot);
  const runGit = options.runGit ?? defaultGitRunner;
  const watchedRoots = options.watchedRoots ?? DEFAULT_WATCHED_ROOTS;
  const ignoredRoots = options.ignoredRoots ?? DEFAULT_IGNORED_ROOTS;
  const activeFeatureFlags = options.activeFeatureFlags ?? [];
  const maxCommits = options.maxCommits ?? 5;

  const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"], workspaceRoot);
  const headSha = runGit(["rev-parse", "HEAD"], workspaceRoot);
  const dirtyOutput = runGit(["status", "--porcelain"], workspaceRoot);
  const commitOutput = runGit(
    ["log", "--pretty=format:%H%x09%h%x09%ad%x09%s", "--date=iso-strict", "-n", String(maxCommits)],
    workspaceRoot
  );

  const fallbackMode = branch == null && headSha == null && dirtyOutput == null && commitOutput == null;
  const dirtyState: RepoState = dirtyOutput == null ? "unknown" : dirtyOutput.length > 0 ? "dirty" : "clean";
  const dirty = dirtyState === "unknown" ? null : dirtyState === "dirty";
  const recentCommits = formatCommitSummaries(commitOutput, maxCommits);
  const capturedAt = now().toISOString();

  const repo: RepoBaseline = {
    repoRoot: workspaceRoot,
    branch,
    headSha,
    dirtyState,
    dirty,
    recentCommits,
    watchedRoots: clone(watchedRoots),
    ignoredRoots: clone(ignoredRoots),
    activeFeatureFlags: clone(activeFeatureFlags),
    capturedAt,
    fingerprint: jsonFingerprint({
      workspaceRoot,
      branch,
      headSha,
      dirtyState,
      recentCommits,
      watchedRoots,
      ignoredRoots,
      activeFeatureFlags
    })
  };

  const evidenceRefs: EvidenceRef[] = [
    {
      id: `${workspaceRoot}:repo`,
      kind: "git",
      label: branch ?? "git unavailable",
      path: workspaceRoot,
      hash: headSha ?? repo.fingerprint
    }
  ];

  return {
    repo,
    fallbackMode,
    evidenceRefs
  };
};

export const captureMachineBaseline = (options: MachineCaptureOptions = {}): MachineBaseline => {
  const now = options.now ?? (() => new Date());
  const sampleNow = now();
  const capturedAt = sampleNow.toISOString();
  const timezone = options.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "unknown";
  const hostname = options.hostname ?? os.hostname();
  const username = options.username ?? os.userInfo().username;
  const osVersion = options.osVersion ?? os.version();
  const osBuild = options.osBuild ?? os.release();
  const platform = options.platform ?? os.platform();
  const arch = options.arch ?? os.arch();
  const localTime = sampleNow.toString();

  return {
    machineName: hostname,
    osVersion,
    osBuild,
    username,
    platform,
    arch,
    timezone,
    localTime,
    capturedAt,
    fingerprint: jsonFingerprint({
      hostname,
      username,
      osVersion,
      osBuild,
      platform,
      arch,
      timezone
    })
  };
};

export const buildSessionBaseline = (options: SessionBaselineOptions): SessionBaseline => {
  const now = options.now ?? (() => new Date());
  const awarenessMode = options.awarenessMode ?? DEFAULT_AWARENESS_MODE;
  const permissionTier = options.permissionTier ?? "Observe";
  const privacyScope = options.privacyScope ?? "public metadata";
  const capturedAt = now().toISOString();

  return {
    sessionId: options.sessionId,
    appStartedAt: options.appStartedAt,
    capturedAt,
    awarenessMode,
    permissionTier,
    privacyScope,
    previousSessionId: options.previousSessionId ?? null,
    previousSessionRestored: options.previousSessionRestored ?? false,
    workspaceRoot: options.workspaceRoot,
    runtimeRoot: options.runtimeRoot,
    currentSessionPath: options.currentSessionPath,
    previousSessionPath: options.previousSessionPath,
    lastReportedBaselinePath: options.lastReportedBaselinePath,
    latestDigestPath: options.latestDigestPath,
    eventsPath: options.eventsPath
  };
};

export const buildLastReportedBaseline = (input: {
  session: SessionBaseline;
  repo: RepoBaseline;
  machine: MachineBaseline;
  digest: AwarenessDigest;
  now?: () => Date;
}): LastReportedBaseline => {
  const now = input.now ?? (() => new Date());
  const reportedAt = now().toISOString();

  return {
    sessionId: input.session.sessionId,
    reportedAt,
    baselineFingerprint: input.digest.baselineFingerprint,
    repoFingerprint: input.repo.fingerprint,
    machineFingerprint: input.machine.fingerprint,
    sessionFingerprint: jsonFingerprint({
      sessionId: input.session.sessionId,
      appStartedAt: input.session.appStartedAt,
      awarenessMode: input.session.awarenessMode,
      permissionTier: input.session.permissionTier,
      privacyScope: input.session.privacyScope,
      previousSessionId: input.session.previousSessionId,
      previousSessionRestored: input.session.previousSessionRestored
    }),
    digestId: input.digest.id,
    baselinePath: input.session.lastReportedBaselinePath,
    digestPath: input.session.latestDigestPath
  };
};

export const buildAwarenessDigest = (input: BuildAwarenessDigestOptions): AwarenessDigest => {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const baselineFingerprint = jsonFingerprint({
    sessionId: input.session.sessionId,
    appStartedAt: input.session.appStartedAt,
    awarenessMode: input.session.awarenessMode,
    permissionTier: input.session.permissionTier,
    privacyScope: input.session.privacyScope,
    previousSessionId: input.session.previousSessionId,
    previousSessionRestored: input.session.previousSessionRestored,
    repoFingerprint: input.repo.fingerprint,
    machineFingerprint: input.machine.fingerprint
  });

  const reason: AwarenessContextReason =
    input.includeReasonOverride ??
    (input.session.awarenessMode === "debug"
      ? "debug"
      : input.lastReportedBaseline &&
          input.lastReportedBaseline.baselineFingerprint === baselineFingerprint
        ? "not_relevant"
        : input.repo.dirtyState === "unknown" && input.repo.branch === null && input.repo.headSha === null
          ? "fallback"
          : "relevant");

  const includeInContext = reason === "relevant" || reason === "debug" || reason === "fallback";
  const freshness = createFreshnessMetadata(input.session.capturedAt, generatedAt, new Date(generatedAt));
  const digest: AwarenessDigest = {
    id: digestHash(baselineFingerprint).slice(0, 24),
    baselineFingerprint,
    sessionId: input.session.sessionId,
    generatedAt,
    awarenessMode: input.session.awarenessMode,
    permissionTier: input.session.permissionTier,
    privacyScope: input.session.privacyScope,
    freshness,
    includeInContext,
    includeReason: reason,
    relevanceSignals: [
      input.session.previousSessionRestored ? "previous-session-restored" : "fresh-session",
      input.repo.dirtyState,
      input.repo.branch ?? "no-git",
      input.machine.machineName
    ],
    blockedScopes: input.blockedScopes ?? [],
    summary: "",
    repo: {
      branch: input.repo.branch,
      headSha: input.repo.headSha,
      dirtyState: input.repo.dirtyState,
      recentCommits: input.repo.recentCommits,
      watchedRoots: input.repo.watchedRoots,
      ignoredRoots: input.repo.ignoredRoots,
      activeFeatureFlags: input.repo.activeFeatureFlags
    },
    machine: {
      machineName: input.machine.machineName,
      osVersion: input.machine.osVersion,
      osBuild: input.machine.osBuild,
      timezone: input.machine.timezone
    },
    session: {
      appStartedAt: input.session.appStartedAt,
      previousSessionRestored: input.session.previousSessionRestored
    },
    lastReportedBaseline: input.lastReportedBaseline,
    evidenceRefs:
      input.evidenceRefs ??
      [
        {
          id: `${input.session.currentSessionPath}:current-session`,
          kind: "session",
          label: "current session",
          path: input.session.currentSessionPath
        },
        {
          id: `${input.session.latestDigestPath}:latest-digest`,
          kind: "digest",
          label: "latest digest",
          path: input.session.latestDigestPath
        }
      ],
    affectedAreas: input.affectedAreas ?? ["session", "repo", "machine", "context", "journal"]
  };

  digest.summary = summarizeAwarenessDigest(digest);
  return digest;
};

export const buildAwarenessPromptSection = (digest: AwarenessDigest | null | undefined): string | null => {
  return digest && digest.includeInContext ? buildAwarenessContextSection(digest) : null;
};
