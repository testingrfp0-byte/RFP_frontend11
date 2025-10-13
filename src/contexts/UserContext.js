import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [userProfileImage, setUserProfileImage] = useState(null);

  useEffect(() => {
    // Optionally, load initial profile image from localStorage or API if needed
    const session = localStorage.getItem('session');
    if (session) {
      const parsedSession = JSON.parse(session);
      if (parsedSession.user && parsedSession.user.image_url) {
        setUserProfileImage(parsedSession.user.image_url);
      }
    }
  }, []);

  const updateProfileImage = (imageUrl) => {
    setUserProfileImage(imageUrl);
    // Optionally, update localStorage as well
    const session = localStorage.getItem('session');
    if (session) {
      const parsedSession = JSON.parse(session);
      const updatedSession = { ...parsedSession, user: { ...parsedSession.user, image_url: imageUrl } };
      localStorage.setItem('session', JSON.stringify(updatedSession));
    }
  };

  return (
    <UserContext.Provider value={{ userProfileImage, updateProfileImage }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
