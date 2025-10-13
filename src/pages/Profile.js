import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext'; // Import useUser
import { Link, useNavigate } from 'react-router-dom';
import ToasterNotification from '../components/ToasterNotification';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function Profile() {
  const { isDarkMode } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('info');
  const [newProfileImageFile, setNewProfileImageFile] = useState(null); // New state for holding the selected image file
  const [currentProfileImageUrl, setCurrentProfileImageUrl] = useState(null); // New state for holding the current profile image URL
  
  const { updateProfileImage } = useUser(); // Use the updateProfileImage from UserContext

  useEffect(() => {
    const fetchUserData = async () => {
      const session = localStorage.getItem('session');
      if (!session) {
        setError('User not logged in.');
        setLoading(false);
        return;
      }

      const parsedSession = JSON.parse(session);
      const id = parsedSession.userId; // Renamed to id to avoid conflict
      setUserId(id);

      if (!id) {
        setError('User ID not found in session.');
        setLoading(false);
        return;
      }
      const token = parsedSession.token;
      if (!token) {
        console.error("No token found");
        navigate("/login");
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/userdetails/${id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setUsername(data.username || data.email || '');
        setEmail(data.email || '');
        setCurrentProfileImageUrl(data.image_url || null);
        updateProfileImage(data.image_url || null); // Update UserContext with fetched image URL
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewProfileImageFile(e.target.files[0]);
    }
  };

  const handleCloseNotification = () => {
    setNotificationMessage('');
    setNotificationType('info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const session = localStorage.getItem('session');
    if (!session) {
      setError('User not logged in.');
      setLoading(false);
      setNotificationMessage('User not logged in.');
      setNotificationType('error');
      return;
    }

    const parsedSession = JSON.parse(session);
    const token = parsedSession.token;

    if (!token) {
      console.error("No token found");
      navigate("/login");
      setLoading(false);
      setNotificationMessage('Authentication token not found. Please log in again.');
      setNotificationType('error');
      return;
    }

    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    if (newProfileImageFile) {
      formData.append('image', newProfileImageFile);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/update-profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setUsername(result.user.username || result.user.email || '');
      setEmail(result.user.email || '');
      setNotificationMessage('Profile updated successfully!');
      setNotificationType('success');
      setIsEditing(false);
      setNewProfileImageFile(null); // Clear selected image after successful update
      setCurrentProfileImageUrl(result.user.image_url || null); // Update current image URL
      updateProfileImage(result.user.image_url || null); // Update UserContext with new image URL
    } catch (error) {
      console.error("Profile update error:", error);
      setError(error.message);
      setNotificationMessage(`Profile update failed: ${error.message}`);
      setNotificationType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`mt-2 mb-2 flex items-center justify-center transition-colors ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div
        className={`p-8 rounded-xl shadow-2xl w-full max-w-md transition-colors ${
          isDarkMode
            ? "bg-gray-800 border border-gray-700"
            : "bg-white border border-gray-200"
        }`}
      >
        <div className="text-center mb-8">
          <h2
            className={`text-3xl font-bold mb-2 transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            User Profile
          </h2>
        </div>

        {!isEditing ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center mb-6">
            {currentProfileImageUrl ? (
              <img
                src={API_BASE_URL + '/' + currentProfileImageUrl}
                alt="Profile Preview"
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-5xl ${
                isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"
              }`}>
                👤
              </div>
            )}
              <p className={`text-xl font-semibold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>{username}</p>
            </div>
            <div className={`p-4 rounded-lg ${
              isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"
            }`}>
              <p className="font-medium">Username: {username}</p>
            </div>
            <div className={`p-4 rounded-lg ${
              isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"
            }`}>
              <p className="font-medium">Email: {email}</p>
            </div>
            {loading && <p className="text-center">Loading user data...</p>}
            {error && <p className="text-center text-red-500">Error: {error}</p>}
            <div className={`p-4 rounded-lg ${
              isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"
            }`}>
              <p className="font-medium">Password: ********</p>
              <p className={`mt-2 text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}>To change your password, please go to the <Link to="/change-password" className="text-purple-400 hover:underline">Change Password</Link> page.</p>
            </div>
            <button
              type="button"
              onClick={handleEditToggle}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Edit Profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center mb-6">
              <div className="relative group cursor-pointer" onClick={() => document.getElementById('profile-image-upload').click()}>
              {newProfileImageFile ? (
                  <img
                    src={URL.createObjectURL(newProfileImageFile)}
                    alt="Profile Preview"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : currentProfileImageUrl ? (
                  <img
                    src={API_BASE_URL + '/' + currentProfileImageUrl}
                    alt="Profile Preview"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-5xl ${
                    isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"
                  }`}>
                    👤
                  </div>
                )}
                <div className={`absolute inset-0 w-20 h-20 rounded-full flex items-center justify-center bg-black bg-opacity-50 text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity ${
                    isDarkMode ? "group-hover:bg-opacity-70" : "group-hover:bg-opacity-60"
                }`}>
                    ✏️
                </div>
            </div>
              <input
                id="profile-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            <div>
              <label
                className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Username
              </label>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full p-3 rounded-lg transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500 ${
                  isDarkMode
                    ? "bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                    : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
                required
              />
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full p-3 rounded-lg transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500 ${
                  isDarkMode
                    ? "bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                    : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
                required
              />
            </div>

            <button
              type="button"
              onClick={handleEditToggle}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Cancel Edit
            </button>
            <button
              type="submit"
              disabled={loading} // Disable button when loading
              className={`w-full py-3 rounded-lg font-medium transition-colors mt-4
                ${loading ? "bg-purple-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 text-white"}
              `}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </button>
          </form>
        )}
      </div>
      {notificationMessage && (
        <ToasterNotification
          message={notificationMessage}
          type={notificationType}
          onClose={handleCloseNotification}
        />
      )}
    </div>
  );
}

export default Profile;
