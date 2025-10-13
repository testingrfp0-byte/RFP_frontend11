import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function UserProfileImage({ userId }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfileImage = async () => {
      try {
        const session = localStorage.getItem("session");
        const token = session ? JSON.parse(session).token : null;

        if (!token) {
          setError("Authentication token not found.");
          setLoading(false);
          return;
        }

        const headers = {
          "ngrok-skip-browser-warning": "true",
          Authorization: `Bearer ${token}`,
        };

        const response = await fetch(`${API_BASE_URL}/userdetails/${userId}`, {
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data && data.image_url) {
          setImageUrl(data.image_url);
        } else {
          setError("Profile picture URL not found in user details.");
        }
      } catch (e) {
        console.error("Error fetching user profile image:", e);
        setError(`Failed to load image: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserProfileImage();
    }
  }, [userId]);

  if (loading) {
    return <div className="text-gray-500">Loading image...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!imageUrl) {
    return <div className="text-gray-500">No image available.</div>;
  }

  return (
    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
      <img
        src={imageUrl}
        alt="Profile"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export default UserProfileImage;
