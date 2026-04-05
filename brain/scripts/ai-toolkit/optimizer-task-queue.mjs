/**
 * Optimizer Task Queue
 *
 * Deterministic FIFO priority queue for optimizer and brain-side sequencing.
 * Higher priority values are dequeued first; ties preserve insertion order.
 */

function normalizeTask(task, sequence) {
  if (!task || typeof task !== "object") {
    throw new Error("createTaskQueue: task must be an object");
  }

  return {
    id: task.id ?? `task-${sequence + 1}`,
    type: task.type ?? "task",
    payload: task.payload ?? null,
    priority: Number.isFinite(task.priority) ? Number(task.priority) : 0,
    createdAt: task.createdAt ?? new Date().toISOString(),
    sequence,
  };
}

function sortQueue(queue) {
  queue.sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }
    return left.sequence - right.sequence;
  });
}

export function createTaskQueue(initialTasks = []) {
  const queue = [];
  let sequence = 0;

  function enqueue(task) {
    const entry = normalizeTask(task, sequence);
    sequence += 1;
    queue.push(entry);
    sortQueue(queue);
    return entry;
  }

  function dequeue() {
    return queue.shift() ?? null;
  }

  function peek() {
    return queue[0] ?? null;
  }

  function size() {
    return queue.length;
  }

  function drain() {
    return queue.splice(0, queue.length);
  }

  function clear() {
    queue.length = 0;
  }

  for (const task of initialTasks) {
    enqueue(task);
  }

  return Object.freeze({
    enqueue,
    dequeue,
    peek,
    size,
    drain,
    clear,
  });
}

export function compareTaskPriority(left, right) {
  return (Number(right?.priority) || 0) - (Number(left?.priority) || 0);
}