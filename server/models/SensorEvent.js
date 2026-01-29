const mongoose = require('mongoose');

const sensorEventSchema = new mongoose.Schema({
    slotId: {
        type: Number,
        required: true
    },
    status: {
        type: Boolean,
        required: true
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.95
    },
    eventType: {
        type: String,
        enum: ['VEHICLE_DETECTED', 'VEHICLE_DEPARTED', 'SCAN_COMPLETE', 'ERROR'],
        default: 'VEHICLE_DETECTED'
    },
    robotId: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

sensorEventSchema.index({ slotId: 1 });
sensorEventSchema.index({ createdAt: -1 });
sensorEventSchema.index({ eventType: 1 });

module.exports = mongoose.model('SensorEvent', sensorEventSchema);
