// Debug helper for API issues
export const debugAPIConfig = () => {
  console.log('🔧 API Configuration Debug:');
  console.log('📍 API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
  console.log('🌐 Environment:', process.env.NODE_ENV);
  console.log('📋 All env vars starting with REACT_APP:', 
    Object.keys(process.env)
      .filter(key => key.startsWith('REACT_APP'))
      .reduce((obj, key) => {
        obj[key] = process.env[key];
        return obj;
      }, {})
  );
};

export const testAPIConnection = async () => {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  
  if (!API_BASE_URL) {
    console.error('❌ API_BASE_URL is not defined');
    return false;
  }

  try {
    console.log('🧪 Testing API connection to:', API_BASE_URL);
    
    // Test basic connectivity
    const response = await fetch(API_BASE_URL, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    
    console.log('📡 API Response:', response.status, response.statusText);
    return response.ok;
  } catch (error) {
    console.error('💥 API Connection failed:', error);
    return false;
  }
};