const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    slotId: {
        type: Number,
        required: true
    },
    robotId: {
        type: String,
        required: false
    },
    checkInTime: {
        type: Date,
        required: true
    },
    checkOutTime: {
        type: Date,
        default: null
    },
    duration: {
        type: Number, // Duration in minutes
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    }
}, {
    timestamps: true
});

reservationSchema.index({ userId: 1 });
reservationSchema.index({ slotId: 1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Reservation', reservationSchema);
