import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Html } from '@react-three/drei'

// UI Components
function CheckInModal({ slotId, onSubmit, onCancel, isLoading }) {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userName || !userEmail) {
      setError('Please fill in all fields');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      setError('Invalid email format');
      return;
    }
    onSubmit(userName, userEmail);
  };

  return (
    <Html center zIndexRange={[100, 0]}>
      <div style={{
        background: 'rgba(26, 26, 26, 0.95)',
        backdropFilter: 'blur(10px)',
        padding: '2rem',
        borderRadius: '12px',
        border: '2px solid #2ecc71',
        width: '400px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        color: 'white',
        fontFamily: 'Inter, sans-serif'
      }}>
        <h2 style={{ marginTop: 0, color: '#2ecc71' }}>Check In to Slot {slotId}</h2>
        {error && <div style={{ color: '#ff4d4d', marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #444',
                background: '#2a2a2a',
                color: 'white'
              }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #444',
                background: '#2a2a2a',
                color: 'white'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                background: '#2ecc71',
                color: '#1a1a1a',
                fontWeight: 'bold',
                cursor: isLoading ? 'wait' : 'pointer'
              }}
            >
              {isLoading ? 'Processing...' : `Check In to Slot ${slotId}`}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                background: '#444',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Html>
  );
}

// Checkout Button Component
function CheckoutButton({ slotId, userName, onCheckout, isLoading }) {
  return (
    <Html position={[0, 1.2, 0]} center>
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent slot click
          onCheckout(slotId);
        }}
        disabled={isLoading}
        style={{
          background: 'rgba(255, 77, 77, 0.9)',
          color: 'white',
          border: '1px solid #ff0000',
          borderRadius: '4px',
          padding: '6px 12px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          pointerEvents: 'auto',
          boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap'
        }}
      >
        {isLoading ? 'Wait...' : '🚪 Checkout'}
      </button>
    </Html>
  );
}

// A single parking slot that detects occupancy
function ParkingSlot({ id, position, onClick, reservation, onCheckout, isLoading }) {
  const isOccupied = !!reservation;
  const userName = reservation?.userName;

  return (
    <group position={position}>
      <mesh onClick={() => onClick(id, position)}>
        <boxGeometry args={[2.5, 0.1, 4.5]} />
        <meshStandardMaterial
          color={isOccupied ? "#ff4d4d" : "#2ecc71"}
          transparent
          opacity={0.6}
          emissive={isOccupied ? "#ff0000" : "#00ff00"}
          emissiveIntensity={isOccupied ? 0.3 : 0.1}
        />
      </mesh>

      {/* Golden sphere indicator for active reservations */}
      {isOccupied && (
        <mesh position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffa500" emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Checkout Button */}
      {isOccupied && (
        <CheckoutButton
          slotId={id}
          userName={userName}
          onCheckout={onCheckout}
          isLoading={isLoading}
        />
      )}

      {/* Slot Number Label */}
      <Html position={[0, 0.2, 2]} center transform>
        <div style={{
          color: 'white',
          fontWeight: 'bold',
          fontSize: '24px',
          background: 'rgba(0,0,0,0.5)',
          padding: '2px 8px',
          borderRadius: '4px'
        }}>
          {id}
        </div>
      </Html>
    </group>
  );
}

// The Autonomous Valet Robot (AVR)
function RobotAgent({ id, position, targetPosition, status, onDestinationReached }) {
  const mesh = useRef();

  // Smoothly move the robot toward the target position
  useFrame(() => {
    if (mesh.current && targetPosition) {
      // Lerp (linear interpolation) for smooth movement
      mesh.current.position.x += (targetPosition[0] - mesh.current.position.x) * 0.05;
      mesh.current.position.y += (targetPosition[1] - mesh.current.position.y) * 0.05;
      mesh.current.position.z += (targetPosition[2] - mesh.current.position.z) * 0.05;

      // Calculate distance to target
      const dx = targetPosition[0] - mesh.current.position.x;
      const dy = targetPosition[1] - mesh.current.position.y;
      const dz = targetPosition[2] - mesh.current.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < 0.1 && onDestinationReached) {
        onDestinationReached();
      }
    }
  });

  const getRobotColor = () => {
    switch (status) {
      case 'RETURNING': return '#ff00ff'; // Magenta
      case 'DISPATCHING': return '#00ffff'; // Cyan
      case 'DOCKED': return '#00ff00'; // Green
      default: return 'cyan';
    }
  };

  return (
    <group>
      <mesh ref={mesh} position={position}>
        <cylinderGeometry args={[0.5, 0.5, 0.2, 32]} />
        <meshStandardMaterial color={getRobotColor()} />
        <Html position={[0, 1, 0]} center>
          <div style={{ color: getRobotColor(), fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            {status}
          </div>
        </Html>
      </mesh>
    </group>
  );
}

function StatusOverlay({ systemStatus, parkingSessions, robotStatus, previousSlotId }) {
  const activeCount = Object.keys(parkingSessions).length;

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      zIndex: 100,
      background: 'rgba(0, 0, 0, 0.85)',
      border: '1px solid #444',
      borderRadius: '8px',
      padding: '15px',
      color: 'white',
      minWidth: '280px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <h3 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #444', paddingBottom: '5px' }}>
        🚗 ParkHub Vision - Live Status
      </h3>
      <div style={{ marginBottom: '10px' }}>
        <strong>Active Reservations:</strong> {activeCount} / 10
      </div>

      {/* Robot status indicator */}
      <div style={{
        marginTop: '10px',
        marginBottom: '10px',
        padding: '8px',
        background: robotStatus === 'DOCKED' ? '#2a2a2a' : '#1a4d2e',
        borderRadius: '4px',
        border: `1px solid ${robotStatus === 'DOCKED' ? '#444' : '#2ecc71'}`
      }}>
        <p style={{ margin: 0, fontSize: '12px' }}>
          🤖 Robot: <strong>{robotStatus}</strong>
        </p>
        {previousSlotId !== null && robotStatus !== 'DOCKED' && (
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#aaa' }}>
            {robotStatus === 'DISPATCHING' && `→ Slot ${previousSlotId}`}
            {robotStatus === 'AT_SLOT' && `@ Slot ${previousSlotId}`}
            {robotStatus === 'RETURNING' && `← From Slot ${previousSlotId}`}
          </p>
        )}
      </div>

      <div style={{ fontSize: '0.9em', color: '#aaa', marginBottom: '10px' }}>
        Click <span style={{ color: '#2ecc71' }}>GREEN</span> slot to check in<br />
        Click <span style={{ color: '#ff4d4d' }}>CHECKOUT</span> button to leave
      </div>

      <div style={{ marginTop: '10px', borderTop: '1px solid #444', paddingTop: '5px' }}>
        <strong>Current Users:</strong>
        <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
          {Object.values(parkingSessions).slice(0, 3).map((session, i) => (
            <li key={i}>{session.userName} (Slot {session.slotId})</li>
          ))}
          {Object.values(parkingSessions).length > 3 && (
            <li>...and {Object.values(parkingSessions).length - 3} more</li>
          )}
          {Object.values(parkingSessions).length === 0 && (
            <li style={{ color: '#666', listStyle: 'none', marginLeft: '-20px' }}>No active users</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default function App() {
  const ANTIGRAVITY_WEBHOOK = "http://localhost:3000/api/sensor";
  const BASE_URL = "http://localhost:3000/api";

  // State
  const [robotTarget, setRobotTarget] = useState(null);
  const [robotStatus, setRobotStatus] = useState("DOCKED");
  const [previousSlotId, setPreviousSlotId] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedSlotPosition, setSelectedSlotPosition] = useState(null);
  const [parkingSessions, setParkingSessions] = useState({});
  const [systemStatus, setSystemStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch initial system status
  const fetchSystemStatus = async () => {
    try {
      const res = await fetch(`${BASE_URL}/status`);
      const data = await res.json();

      console.log(`📊 System Status Loaded: ${data.occupiedSlots}/10 slots occupied`);
      setSystemStatus(data);

      // Transform occupancyDetails Array to Object map
      const sessionsMap = {};
      data.occupancyDetails.forEach(detail => {
        sessionsMap[detail.slotId] = detail;
      });
      setParkingSessions(sessionsMap);

    } catch (e) {
      console.error("Failed to load system status", e);
      setErrorMessage("System Offline: Could not load status");
    }
  };

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  // Handle sensor events (Robot Brain Integration)
  const handleSensorEvent = async (slotId, status, slotPosition, dispatchRobot = false) => {
    const payload = {
      type: "SENSOR_UPDATE",
      timestamp: new Date().toISOString(),
      data: { slotId, status, confidence: 0.98 }
    };

    console.log(`📡 Sending sensor data: Slot ${slotId} is ${status ? 'Occupied' : 'Free'}`);

    // If dispatch requested (from check-in), send robot
    if (dispatchRobot && slotPosition) {
      console.log(`🤖 Dispatching robot to Slot ${slotId}`);
      setRobotTarget(slotPosition);
      // Status and previous slot are set in handleCheckInSubmit
    }

    try {
      await fetch(ANTIGRAVITY_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error("❌ Antigravity Offline", e);
    }
  };

  // Robot Logic
  const handleRobotDestinationReached = () => {
    if (robotStatus === 'DISPATCHING') {
      setRobotStatus('AT_SLOT');
      console.log(`🤖 Robot arrived at Slot ${previousSlotId}`);
    } else if (robotStatus === 'RETURNING') {
      setRobotStatus('DOCKED');
      setRobotTarget(null);
      setPreviousSlotId(null);
      console.log('🤖 Robot returned to dock - Ready for next dispatch');
    }
  };

  // Interaction Handlers
  const handleSlotClick = (slotId, position) => {
    if (parkingSessions[slotId]) {
      // Don't auto-checkout on click, rely on button
      console.log(`ℹ️ Slot ${slotId} occupied. Use checkout button.`);
      // Optionally show a tooltip or toast here
    } else {
      handleCheckInRequest(slotId, position);
    }
  };

  const handleCheckInRequest = (slotId, position) => {
    console.log(`🚗 Check-in requested for Slot ${slotId}`);
    setSelectedSlot(slotId);
    setSelectedSlotPosition(position);
    setShowCheckInModal(true);
    setErrorMessage(null);
  };

  const handleCheckInSubmit = async (userName, userEmail) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${BASE_URL}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, userEmail, slotId: selectedSlot })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Check-in failed");
      }

      if (data.success && data.robotDispatchAuthorized) {
        console.log(`✅ Check-in successful: ${userName} → Slot ${selectedSlot}`);

        // Update local state instantly for responsiveness
        const newSession = { slotId: selectedSlot, userName, checkInTime: data.timestamp };
        setParkingSessions(prev => ({ ...prev, [selectedSlot]: newSession }));

        // Set Robot State BEFORE dispatch
        setRobotStatus('DISPATCHING');
        setPreviousSlotId(selectedSlot);

        // Dispatch Robot
        handleSensorEvent(selectedSlot, true, selectedSlotPosition, true);

        // Close modal
        setShowCheckInModal(false);
        setSelectedSlot(null);
        setSelectedSlotPosition(null);
      }

    } catch (e) {
      console.error("Check-in Error:", e);
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
      fetchSystemStatus(); // Refresh to be safe
    }
  };

  const handleCheckOut = async (slotId) => {
    console.log(`🚪 Initiating checkout for Slot ${slotId}...`);

    if (robotStatus === 'DISPATCHING' && previousSlotId === slotId) {
      setErrorMessage('Please wait for robot to arrive before checking out');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    // OPTIMISTIC UPDATE: Clear UI state immediately
    const previousSessions = { ...parkingSessions }; // Backup in case of failure
    setParkingSessions(prev => {
      const updated = { ...prev };
      delete updated[slotId];
      return updated;
    });

    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Check-out failed");
      }

      const data = await res.json();

      console.log(`✅ Checkout successful: ${data.userName} | Duration: ${data.sessionDuration}`);

      // Send robot back to dock
      if (data.robotReturnDock) {
        const dockPosition = [
          data.robotReturnDock.x,
          data.robotReturnDock.y,
          data.robotReturnDock.z
        ];
        setRobotTarget(dockPosition);
        setRobotStatus('RETURNING');
        setPreviousSlotId(slotId);
        console.log(`🤖 Robot returning from Slot ${slotId} to dock`, dockPosition);
      }

      // Notify backend/robot of departue
      handleSensorEvent(slotId, false, null, false);

    } catch (e) {
      console.error("Check-out Error:", e);
      setErrorMessage(`Checkout failed: ${e.message}`);

      // ROLLBACK UI
      setParkingSessions(previousSessions);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsLoading(false);
      fetchSystemStatus();
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#111" }}>
      <StatusOverlay
        systemStatus={systemStatus}
        parkingSessions={parkingSessions}
        robotStatus={robotStatus}
        previousSlotId={previousSlotId}
      />

      {/* Error Message Toast */}
      {errorMessage && (
        <div style={{
          position: 'absolute',
          top: '200px',
          left: '20px',
          zIndex: 101,
          background: '#ff4d4d',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          fontWeight: 'bold'
        }}>
          ⚠️ {errorMessage}
          <button onClick={() => setErrorMessage(null)} style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Grid infiniteGrid fadeDistance={50} cellColor="#444" sectionColor="#666" />

        {/* Render 10 Parking Slots */}
        {[...Array(10)].map((_, i) => (
          <ParkingSlot
            key={i}
            id={i}
            position={[i * 3 - 13.5, 0, 0]}
            onClick={handleSlotClick}
            reservation={parkingSessions[i]}
            onCheckout={handleCheckOut}
            isLoading={isLoading}
          />
        ))}

        {/* Return Dock - Home Base for Robots */}
        <group position={[0, 0, 10]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[3, 0.15, 3]} />
            <meshStandardMaterial color="#00aaff" emissive="#0066cc" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 2, 16]} />
            <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.8} />
          </mesh>
          <Html position={[0, 2.2, 0]} center>
            <div style={{ color: '#00ffff', fontWeight: 'bold', fontSize: '12px' }}>HOME DOCK</div>
          </Html>
        </group>

        {showCheckInModal && selectedSlot !== null && (
          <group position={selectedSlotPosition ?? [0, 0, 0]}>
            <CheckInModal
              slotId={selectedSlot}
              onSubmit={handleCheckInSubmit}
              onCancel={() => setShowCheckInModal(false)}
              isLoading={isLoading}
            />
          </group>
        )}

        <RobotAgent
          id="R1"
          position={[0, 0.2, 10]} // Start at Dock
          targetPosition={robotTarget}
          status={robotStatus}
          onDestinationReached={handleRobotDestinationReached}
        />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
