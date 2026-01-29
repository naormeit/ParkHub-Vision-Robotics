const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    slotId: {
        type: Number,
        required: false,
        default: null,
        min: [0, 'Slot ID must be at least 0'],
        max: [99, 'Slot ID cannot exceed 99']
    },
    robotId: {
        type: String,
        required: false,
        default: null,
        enum: ['R1', 'R2', 'R3', 'R4', 'R5', null]
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    checkInTime: {
        type: Date,
        default: Date.now
    },
    checkOutTime: {
        type: Date,
        default: null
    },
    vehicleInfo: {
        licensePlate: { type: String, default: null },
        make: { type: String, default: null },
        model: { type: String, default: null },
        color: { type: String, default: null }
    }
}, {
    timestamps: true,
    collection: 'users'
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ slotId: 1 });
userSchema.index({ status: 1 });
userSchema.index({ robotId: 1 });

// Virtual for session duration
userSchema.virtual('sessionDuration').get(function () {
    if (!this.checkOutTime) return null;
    const duration = this.checkOutTime - this.checkInTime;
    const minutes = Math.floor(duration / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
});

// Method to check if slot is available
userSchema.statics.isSlotAvailable = async function (slotId) {
    const activeReservation = await this.findOne({ slotId, status: 'active' });
    return !activeReservation;
};

// Method to get available robot
userSchema.statics.getAvailableRobot = async function () {
    const robots = ['R1', 'R2', 'R3', 'R4', 'R5'];
    const busyRobots = await this.find({
        status: 'active',
        robotId: { $ne: null }
    }).distinct('robotId');

    const availableRobots = robots.filter(r => !busyRobots.includes(r));
    return availableRobots.length > 0 ? availableRobots[0] : null;
};

module.exports = mongoose.model('User', userSchema);
