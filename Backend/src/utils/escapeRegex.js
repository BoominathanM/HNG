// Search terms are user-typed text, not regexes — escape them so characters like "+" (e.g. "+91"
// phone prefixes), "(" or "[" can't throw an invalid-pattern error or trigger catastrophic backtracking.
module.exports = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
