import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useUser } from "../contexts/UserContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function Login() {
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { updateProfileImage } = useUser();

  // Check if user came from admin registration flow
  const isAdminFlow =
    location.state?.fromAdminRegister ||
    location.search.includes("admin=true") ||
    document.referrer.includes("/admin-register");

  useEffect(() => {
    const session = localStorage.getItem("session");
    if (session) {
      navigate("/");
      return;
    }

    const savedCredentials = localStorage.getItem("savedCredentials");
    if (savedCredentials) {
      const {
        email: savedEmail,
        password: savedPassword,
        rememberMe: savedRememberMe,
      } = JSON.parse(savedCredentials);
      setEmail(savedEmail || "");
      setPassword(savedPassword || "");
      setRememberMe(savedRememberMe || false);
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await response.json();

      // Fetch user details to get the role if not provided in login response
      let userRole = data.role;
      if (!userRole) {
        try {
          const headers = {
            accept: "application/json",
            "ngrok-skip-browser-warning": "true",
            ...(data.access_token && {
              Authorization: `Bearer ${data.access_token}`,
            }),
          };

          const userDetailsResponse = await fetch(
            `${API_BASE_URL}/userdetails`,
            {
              headers,
            }
          );
          if (userDetailsResponse.ok) {
            const users = await userDetailsResponse.json();
            const user = users.find(
              (u) => u.email === email || u.username === email
            );
            userRole = user?.role || "reviewer";
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
          userRole = "reviewer";
        }
      }

      localStorage.setItem(
        "session",
        JSON.stringify({
          email,
          token: data.access_token,
          role: userRole,
          userId: data.user_id,
          image_url: data.image_url,
        })
      );
      // Set user profile image in context based on login response
      updateProfileImage(data.image_url || null);

      if (rememberMe) {
        localStorage.setItem(
          "savedCredentials",
          JSON.stringify({ email, password, rememberMe: true })
        );
      } else {
        localStorage.removeItem("savedCredentials");
      }

      window.dispatchEvent(new Event("storage"));

      setLoading(false);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-colors ${
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
            Welcome Back
          </h2>
          <p
            className={`transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Sign in to your account
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div>
            <label
              className={`block text-sm font-medium mb-2 transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-3 rounded-lg transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500 ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                  : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
              }`}
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className={`h-4 w-4 text-purple-600 focus:ring-purple-500 rounded transition-colors ${
                isDarkMode
                  ? "border-gray-600 bg-gray-700"
                  : "border-gray-300 bg-white"
              }`}
            />
            <label
              htmlFor="rememberMe"
              className={`ml-2 block text-sm transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Remember me for 30 days
            </label>
          </div>

          <div className="text-right text-sm">
            <Link
              to="/forgot-password"
              className={`font-medium transition-colors ${
                isDarkMode ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-500"
              }`}
            >
              Forgot password?
            </Link>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span
            className={`transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Don't have an account?{" "}
          </span>
          <Link
            to={isAdminFlow ? "/admin-register" : "/register"}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
