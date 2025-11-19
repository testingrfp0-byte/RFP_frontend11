import { useTheme } from "../contexts/ThemeContext";
import { useUser } from "../contexts/UserContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function TopBar({ userName, userRole, onLogout, userId }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const { userProfileImage } = useUser();

  return (
    <div
      className={`w-full flex items-center justify-between shadow-lg px-6 py-4 transition-colors ${
        isDarkMode
          ? "bg-gray-800 border-b border-gray-700"
          : "bg-white border-b border-gray-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">📄</span>
        <div>
          <h1
            className={`font-bold text-lg transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            RFP Response Generator
          </h1>
          <p
            className={`text-sm transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            AI-Powered Document Analysis
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-all duration-200 focus:outline-none ${
            isDarkMode
              ? "bg-gray-700 hover:bg-gray-600 text-yellow-400"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>

        <div
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
            isDarkMode ? "bg-gray-700" : "bg-gray-100"
          }`}
        >
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
            {userProfileImage ? (
              <img
                src={API_BASE_URL + "/" + userProfileImage}
                alt="User Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white text-sm">👤</span>
            )}
          </div>
          <div className="hidden sm:block">
            <p
              className={`text-sm font-medium transition-colors ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {userName || "Admin User"}
            </p>
            <p
              className={`text-xs transition-colors ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {userRole || "reviewer"}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  );
}
