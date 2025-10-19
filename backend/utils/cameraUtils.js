const { execSync } = require('child_process');

const getConnectedCameras = () => {
  try {
    const devices = execSync('system_profiler SPCameraDataType').toString();
    return devices.includes('iPhone Camera') ? {
      hasIPhone: true,
      cameras: devices.split('\n').filter(line => line.includes('Camera'))
    } : {
      hasIPhone: false,
      cameras: devices.split('\n').filter(line => line.includes('Camera'))
    };
  } catch (error) {
    console.error('Error detecting cameras:', error);
    return { hasIPhone: false, cameras: [] };
  }
};

const selectCamera = async (preferIPhone = true) => {
  const { hasIPhone, cameras } = getConnectedCameras();
  
  if (preferIPhone && hasIPhone) {
    return 'iPhone Camera';
  }
  
  // Fall back to default camera if iPhone not available
  return cameras[0] || null;
};

module.exports = {
  getConnectedCameras,
  selectCamera
};
