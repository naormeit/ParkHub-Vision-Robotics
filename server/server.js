const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const User = require('./models/User');
const Reservation = require('./models/Reservation');
const SensorEvent = require('./models/SensorEvent');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Return dock configuration
const RETURN_DOCK = {
    position: { x: 0, y: 0.2, z: 10 },
    name: "Home Dock",
    id: "DOCK_01"
};

// --- API Endpoints ---

// Check-in Endpoint
app.post('/api/checkin', async (req, res) => {
    try {
        const { userName, userEmail, slotId } = req.body;

        // Validation
        if (!userName || !userEmail || slotId === undefined) {
            return res.status(400).json({
                error: 'userName, userEmail, and slotId are required'
            });
        }

        // Check if slot is available
        const isAvailable = await User.isSlotAvailable(slotId);
        if (!isAvailable) {
            return res.status(409).json({
                error: `Slot ${slotId} is already occupied`
            });
        }

        // Get available robot
        const robotId = await User.getAvailableRobot();
        if (!robotId) {
            return res.status(503).json({
                error: 'No robots available. Please try again later.'
            });
        }

        // Find or create user
        let user = await User.findOne({ email: userEmail });

        if (user && user.status === 'active') {
            return res.status(409).json({
                error: 'User already has an active reservation'
            });
        }

        if (!user) {
            user = new User({
                name: userName,
                email: userEmail,
                slotId,
                robotId,
                status: 'active',
                checkInTime: new Date()
            });
        } else {
            user.name = userName;
            user.slotId = slotId;
            user.robotId = robotId;
            user.status = 'active';
            user.checkInTime = new Date();
            user.checkOutTime = null;
        }

        await user.save();

        // Create reservation record
        const reservation = new Reservation({
            userId: user._id,
            slotId,
            robotId,
            checkInTime: user.checkInTime,
            status: 'active'
        });

        await reservation.save();

        console.log(`✅ Check-in: ${userName} → Slot ${slotId} | Robot ${robotId}`);

        res.status(201).json({
            success: true,
            userId: user._id,
            reservationId: reservation._id,
            slotId,
            robotId,
            message: `${userName} checked in to slot ${slotId}`,
            robotDispatchAuthorized: true,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Check-in error:', error);
        res.status(500).json({
            error: 'Check-in failed',
            details: error.message
        });
    }
});

// Checkout Endpoint
app.post('/api/checkout', async (req, res) => {
    try {
        const { slotId } = req.body;

        if (slotId === undefined) {
            return res.status(400).json({
                error: 'slotId is required'
            });
        }

        // Find active reservation for this slot
        const user = await User.findOne({ slotId, status: 'active' });

        if (!user) {
            return res.status(404).json({
                error: `No active reservation found for slot ${slotId}`
            });
        }

        // Calculate session duration
        const checkOutTime = new Date();
        const durationMs = checkOutTime - user.checkInTime;
        const durationMinutes = Math.floor(durationMs / 1000 / 60);

        // Update user
        user.status = 'completed';
        user.checkOutTime = checkOutTime;
        const sessionDuration = user.sessionDuration; // Uses virtual
        await user.save();

        // Update reservation
        await Reservation.findOneAndUpdate(
            { slotId, status: 'active' },
            {
                status: 'completed',
                checkOutTime,
                duration: durationMinutes
            }
        );

        console.log(`🚪 Checkout: Slot ${slotId} | User: ${user.name} | Duration: ${sessionDuration}`);

        res.json({
            success: true,
            slotId,
            userName: user.name,
            sessionDuration,
            message: 'Checkout successful. Robot returning to dock.',
            robotReturnDock: RETURN_DOCK.position,
            timestamp: checkOutTime.toISOString()
        });

    } catch (error) {
        console.error('❌ Checkout error:', error);
        res.status(500).json({
            error: 'Checkout failed',
            details: error.message
        });
    }
});

// Sensor Event Endpoint
app.post('/api/sensor', async (req, res) => {
    try {
        const { type, timestamp, data } = req.body;

        // Create sensor event record
        const sensorEvent = new SensorEvent({
            slotId: data.slotId,
            status: data.status,
            confidence: data.confidence || 0.95,
            eventType: data.status ? 'VEHICLE_DETECTED' : 'VEHICLE_DEPARTED',
            metadata: { type, originalTimestamp: timestamp }
        });

        await sensorEvent.save();

        console.log(`📡 Sensor: Slot ${data.slotId} | Status: ${data.status ? 'Occupied' : 'Free'} | Confidence: ${data.confidence}`);

        res.json({
            status: 'received',
            message: 'Sensor data logged',
            eventId: sensorEvent._id
        });

    } catch (error) {
        console.error('❌ Sensor logging error:', error);
        res.status(500).json({
            error: 'Sensor logging failed',
            details: error.message
        });
    }
});

// Status Endpoint
app.get('/api/status', async (req, res) => {
    try {
        const totalSlots = 10; // Configure as needed

        // Get all active reservations
        const activeUsers = await User.find({ status: 'active' })
            .select('name email slotId robotId checkInTime')
            .lean();

        const occupiedSlots = activeUsers.length;
        const availableSlots = totalSlots - occupiedSlots;

        const occupancyDetails = activeUsers.map(user => ({
            slotId: user.slotId,
            userName: user.name,
            userEmail: user.email,
            robotId: user.robotId,
            checkInTime: user.checkInTime
        }));

        res.json({
            totalSlots,
            occupiedSlots,
            availableSlots,
            occupancyDetails,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Status retrieval error:', error);
        res.status(500).json({
            error: 'Failed to retrieve status',
            details: error.message
        });
    }
});

// Stats Endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeReservations = await User.countDocuments({ status: 'active' });
        const completedSessions = await Reservation.countDocuments({ status: 'completed' });
        const totalSensorEvents = await SensorEvent.countDocuments();

        // Calculate average session duration
        const completedReservations = await Reservation.find({
            status: 'completed',
            duration: { $ne: null }
        }).select('duration');

        const avgDuration = completedReservations.length > 0
            ? completedReservations.reduce((sum, r) => sum + r.duration, 0) / completedReservations.length
            : 0;

        // Get recent activity (last 24 hours)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentCheckIns = await User.countDocuments({
            checkInTime: { $gte: yesterday }
        });

        res.json({
            totalUsers,
            activeReservations,
            completedSessions,
            totalSensorEvents,
            averageSessionDuration: Math.round(avgDuration),
            recentCheckIns24h: recentCheckIns,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Stats retrieval error:', error);
        res.status(500).json({
            error: 'Failed to retrieve statistics',
            details: error.message
        });
    }
});

// Admin Endpoint
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find()
            .sort({ checkInTime: -1 })
            .lean();

        // Add session duration to each user
        const usersWithDuration = users.map(user => {
            if (user.checkOutTime) {
                const duration = user.checkOutTime - user.checkInTime;
                const minutes = Math.floor(duration / 1000 / 60);
                const hours = Math.floor(minutes / 60);
                const remainingMinutes = minutes % 60;

                user.sessionDuration = hours > 0
                    ? `${hours}h ${remainingMinutes}m`
                    : `${minutes}m`;
            }
            return user;
        });

        res.json({
            success: true,
            users: usersWithDuration,
            count: usersWithDuration.length
        });

    } catch (error) {
        console.error('❌ Admin users retrieval error:', error);
        res.status(500).json({
            error: 'Failed to retrieve users',
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`);
});
