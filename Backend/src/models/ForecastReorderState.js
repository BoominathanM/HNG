const mongoose = require('mongoose');

// Tracks, per (customer party, product), the moment the Consumption Forecast first
// flipped that product to "Reorder Now" — so the Alert Configuration
// 'consumption_forecast' group can wait a grace period ("Alert After N days") before
// the first alert fires, exactly like InventoryItem.lowStockSince does for 'low_stock'.
// Rows are maintained lazily by utils/alertConfigQueries.js (created when a product is
// first seen "Reorder Now", deleted once it recovers to "Reorder Soon"/"Sufficient
// Stock" or the hotel reorders it).
const forecastReorderStateSchema = new mongoose.Schema({
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  hotelName: { type: String, default: '' },
  productKey: { type: String, required: true },  // lowercase, trimmed product name
  productName: { type: String, default: '' },    // display name as last seen
  reorderNowSince: { type: Date, required: true },
}, { timestamps: true });

forecastReorderStateSchema.index({ partyId: 1, productKey: 1 }, { unique: true });

module.exports = mongoose.model('ForecastReorderState', forecastReorderStateSchema);
