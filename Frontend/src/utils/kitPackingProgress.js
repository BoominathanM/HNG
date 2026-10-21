// Kit Packing completion for ONE kit group's Separate/Personalized Kit Packing tasks.
// Mirrors the backend rule (tasks.controller.js buildKitPackingDoneMap /
// kitComponentCoveredByKitTask) so the Task Assignment cards never say "Done" while the
// dispatch gate / Today's Checklist still treat the kit as unpacked.
//
// Kit-packing qty is a KIT COUNT tracked per task name — the Kit Packing modal shows e.g.
// "Assembly: 50 / 100 units" and caps same-name batches at the kit count — so every task
// name used for the kit must add up to the kit count. Qty is optional in that modal: a name
// group with any task saved without a qty can't be judged by count and is skipped.
export function kitPackingProgress(tasks = [], kitCount = 0) {
  const list = tasks || [];
  const allDone = list.length > 0 && list.every((t) => t.status === 'Done');
  const byName = new Map();
  list.forEach((t) => {
    const name = (t.taskName || '').trim().toLowerCase();
    const g = byName.get(name) || { qty: 0, doneQty: 0, hasUnsized: false };
    const qty = Number(t.qty) || 0;
    if (qty > 0) {
      g.qty += qty;
      if (t.status === 'Done') g.doneQty += qty;
    } else g.hasUnsized = true;
    byName.set(name, g);
  });
  const groups = [...byName.values()];
  const sized = groups.filter((g) => !g.hasUnsized);
  const count = Number(kitCount) || 0;
  // Fewest kits covered by any one task name — the kit is only as far along as its least-covered step.
  const assignedKits = sized.length ? Math.min(...sized.map((g) => g.qty)) : null;
  // Same, counting only Done qty. null when a task saved without a qty makes it uncountable.
  const doneKits = groups.length && sized.length === groups.length ? Math.min(...sized.map((g) => g.doneQty)) : null;
  const short = count > 0 && sized.some((g) => g.qty < count);
  return { allDone, short, assignedKits, doneKits, complete: allDone && !short };
}

export const isKitPackingComplete = (tasks, kitCount) => kitPackingProgress(tasks, kitCount).complete;

// How many of this kit's units are finished at THIS packing step and so can move on to the
// NEXT one (Separate Kit Packing → Personalized Kit Packing) right now — batch by batch, not
// only once all of them are done (e.g. 500 of 1000 separate kits Done → 500 personalized
// kits can be packed). Fully complete → the whole kit count (Infinity when it's unknown, i.e.
// no cap). Uncountable (a task saved without a qty) → 0 until complete, the old all-Done rule.
export function kitsReadyForNextStep(tasks = [], kitCount = 0) {
  const p = kitPackingProgress(tasks, kitCount);
  const count = Number(kitCount) || 0;
  if (p.complete) return count > 0 ? count : Infinity;
  if (p.doneKits == null) return 0;
  return count > 0 ? Math.min(p.doneKits, count) : p.doneKits;
}

// Kits still assignable under one task name for a step capped at `readyCap` (see
// kitsReadyForNextStep) — the cap minus what existing tasks with that name already cover.
export function kitsLeftUnderCap(existingTasks = [], taskName = '', readyCap = Infinity) {
  const norm = (v) => (v || '').trim().toLowerCase();
  const already = (existingTasks || [])
    .filter((t) => norm(t.taskName) === norm(taskName))
    .reduce((sum, t) => sum + (Number(t.qty) || 0), 0);
  return Math.max(0, readyCap - already);
}
