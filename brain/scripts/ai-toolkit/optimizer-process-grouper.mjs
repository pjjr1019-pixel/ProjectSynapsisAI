/**
 * Optimizer Process Grouper
 *
 * Builds deterministic parent/child process trees from a flat process list.
 */

function normalizeProcess(processEntry) {
  return {
    pid: Number(processEntry?.pid ?? processEntry?.processId ?? 0),
    ppid: Number(processEntry?.ppid ?? processEntry?.parentPid ?? processEntry?.parentProcessId ?? 0),
    name: String(processEntry?.name ?? processEntry?.displayName ?? `pid-${processEntry?.pid ?? 0}`),
    raw: processEntry,
    children: [],
  };
}

export function buildProcessTree(processes = []) {
  const byPid = new Map();
  const roots = [];
  const normalized = Array.isArray(processes) ? processes.map(normalizeProcess) : [];

  for (const node of normalized) {
    if (node.pid > 0) {
      byPid.set(node.pid, node);
    }
  }

  for (const node of normalized) {
    const parent = byPid.get(node.ppid);
    if (parent && parent.pid !== node.pid) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes) => {
    nodes.sort((left, right) => {
      if (left.ppid !== right.ppid) return left.ppid - right.ppid;
      if (left.pid !== right.pid) return left.pid - right.pid;
      return left.name.localeCompare(right.name);
    });
    for (const node of nodes) {
      if (node.children.length > 0) sortNodes(node.children);
    }
    return nodes;
  };

  return {
    roots: sortNodes(roots),
    byPid,
  };
}

export function flattenProcessTree(roots = []) {
  const out = [];
  const walk = (node, depth = 0) => {
    out.push({
      pid: node.pid,
      ppid: node.ppid,
      name: node.name,
      depth,
    });
    for (const child of node.children || []) {
      walk(child, depth + 1);
    }
  };
  for (const root of Array.isArray(roots) ? roots : []) {
    walk(root, 0);
  }
  return out;
}