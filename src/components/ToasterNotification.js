import React, { useEffect, useState } from "react";
export default function ToasterNotification({ message, type, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!isVisible) return null;

  const typeClasses = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-orange-500",
  };

  const notificationClass = typeClasses[type] || "bg-gray-700";

  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white transform transition-all duration-300 z-50
        ${notificationClass}
        ${
          isVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0"
        }
      `}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200 focus:outline-none"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
