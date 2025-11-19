import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const NGROK_HEADERS = {
  accept: "application/json",
  "ngrok-skip-browser-warning": "true",
};

export default function SideBar({ userName }) {
  const [open, setOpen] = useState(false);
  const { isDarkMode } = useTheme();
  const [userRole, setUserRole] = useState("");
  const calledOnceRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const session = localStorage.getItem("session");
    if (session) {
      try {
        const parsedSession = JSON.parse(session);
        if (parsedSession.role === "admin") {
          const getCurrentUser = async () => {
            try {
              if (API_BASE_URL) {
                const token = parsedSession.token;
                const headers = {
                  ...NGROK_HEADERS,
                  ...(token && { Authorization: `Bearer ${token}` }),
                };

                const res = await fetch(`${API_BASE_URL}/userdetails`, {
                  headers,
                });

                if (res.status === 200) {
                  const users = await res.json();
                  const user = users.find(
                    (u) =>
                      u.email === parsedSession.email ||
                      u.username === parsedSession.email
                  );
                  if (user) {
                    setUserRole(user.role || "admin");
                  } else {
                    setUserRole("admin");
                  }
                } else if (res.status === 401) {
                  if (parsedSession.role) {
                    setUserRole(parsedSession.role);
                  } else {
                    setUserRole("admin");
                  }
                } else {
                  if (parsedSession.role) {
                    setUserRole(parsedSession.role);
                  } else {
                    setUserRole("admin");
                  }
                }
              } else {
                if (parsedSession.role) {
                  setUserRole(parsedSession.role);
                } else {
                  setUserRole("admin");
                }
              }
            } catch (error) {
              console.error(
                "Error parsing session or fetching user role:",
                error
              );
              setUserRole("admin");
            }
          };
          if (!calledOnceRef.current) {
            getCurrentUser();
            calledOnceRef.current = true;
          }
        } else {
          setUserRole("reviewer");
        }
      } catch (error) {
        console.error("Error parsing session or fetching user role:", error);

        setUserRole("admin");
      }
    }
  }, []);

  return (
    <div>
      <button
        className={`md:hidden p-2 focus:outline-none transition-colors ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
        onClick={() => setOpen(!open)}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <div
        className={`fixed md:static top-0 left-0 h-full shadow-xl z-30 w-64 transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-all duration-300 ease-in-out ${
          isDarkMode
            ? "bg-gray-800 border-r border-gray-700"
            : "bg-white border-r border-gray-200"
        }`}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-3xl">📄</span>
            <h1
              className={`text-xl font-bold transition-colors ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              RFP Generator
            </h1>
          </div>

          <nav className="flex flex-col space-y-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-purple-600 text-white shadow-lg"
                    : isDarkMode
                    ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
              end
            >
              <span className="text-lg">
                {userRole === "reviewer" ? "📝" : "🚧"}
              </span>
              {userRole === "reviewer" ? "Dashboard" : "Work in Progress"}
            </NavLink>

            {userRole !== "reviewer" && (
              <>
                <NavLink
                  to="/library"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-purple-600 text-white shadow-lg"
                        : isDarkMode
                        ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`
                  }
                >
                  <span className="text-lg">📚</span>
                  Upload Center and Library
                </NavLink>
                <NavLink
                  to="/team-user"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-purple-600 text-white shadow-lg"
                        : isDarkMode
                        ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`
                  }
                >
                  <span className="text-lg">👥</span>
                  Team Management
                </NavLink>

                <NavLink
                  to="/self-assign"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-purple-600 text-white shadow-lg"
                        : isDarkMode
                        ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`
                  }
                >
                  <span className="text-lg">👤</span>
                  My Questions
                </NavLink>

                <NavLink
                  to="/reviewer-assigned-questions"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-purple-600 text-white shadow-lg"
                        : isDarkMode
                        ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`
                  }
                >
                  <span className="text-lg">📋</span>
                  Reviewer Assigned Questions
                </NavLink>

                <NavLink
                  to="/submitted-questions"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-purple-600 text-white shadow-lg"
                        : isDarkMode
                        ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`
                  }
                >
                  <span className="text-lg">✅</span>
                  Edit and Approve Responses
                </NavLink>
                <NavLink
                  to="/doc-list"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-purple-600 text-white shadow-lg"
                        : isDarkMode
                        ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`
                  }
                >
                  <span className="text-lg">📋</span>
                  RFP Report
                </NavLink>
              </>
            )}
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-purple-600 text-white shadow-lg"
                    : isDarkMode
                    ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <span className="text-lg">👤</span>
              Profile
            </NavLink>
            <NavLink
              to="/change-password"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-purple-600 text-white shadow-lg"
                    : isDarkMode
                    ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <span className="text-lg">🔑</span>
              Change Password
            </NavLink>
          </nav>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-20 md:hidden"
          onClick={() => setOpen(false)}
        ></div>
      )}
    </div>
  );
}
