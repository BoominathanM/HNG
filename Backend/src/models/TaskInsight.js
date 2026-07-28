const mongoose = require('mongoose');

// Singleton doc — persists the last "Get AI Insight" run on Task Management's Today's
// Checklist (the summary bullets + the per-product task recommendations that back it),
// so a page refresh doesn't lose the last analysis. Previously this only lived in
// frontend React state and vanished on reload. Overwritten wholesale on every new run —
// not versioned/history-tracked, there's only ever one "latest" analysis.
const taskInsightSchema = new mongoose.Schema({
  insight: { type: String, default: '' },
  // Keyed by `${orderCode}::${product}` (lowercased) -> ordered array of recommended
  // task names for that specific product line, straight from the AI's response.
  productTasks: { type: mongoose.Schema.Types.Mixed, default: {} },
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('TaskInsight', taskInsightSchema);
