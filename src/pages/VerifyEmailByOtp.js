import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const VerifyEmailByOtp = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const otpData = location.state?.otpData || {};
  const email = otpData.email || ""; // get email from otpData
  const title = otpData.title || ""; // optional, if you need the title
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(600);

  useEffect(() => {
    if (resendTimer === 0) return;
    const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/verify_otp`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email, otp }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "OTP verification failed");
      }
      if(title === "register"){
      setSuccess("Email verified successfully!");
      setLoading(false);
      navigate("/login")
      }else{
      navigate('/reset-passowrd', { state: { email } });
      setLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${API_BASE_URL}/forgot_password`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to resend One Time Password");
      }
      setSuccess("One Time Password has been resent successfully!");
      setResendTimer(600);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className={isDarkMode ? "text-white" : "text-gray-900"}>
          No email found. Please register first.
        </p>
      </div>
    );
  }

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
            Verify Your Email
          </h2>
          <p
            className={`transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Enter the One Time Password sent to <strong>{email}</strong>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label
              className={`block text-sm font-medium mb-2 transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              One Time Password
            </label>
            <input
              type="text"
              placeholder="Enter One Time Password"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className={`w-full p-3 rounded-lg transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500 ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                  : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
              }`}
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg text-sm">
              {success}
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
                Verifying...
              </div>
            ) : (
              "Verify One Time Password"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          {resendTimer > 0 ? (
            <p
              className={`text-sm transition-colors ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              One Time Password will expire in{" "}
              {`${Math.floor(resendTimer / 60)}:${String(
                resendTimer % 60
              ).padStart(2, "0")}`}
            </p>
          ) : (
            <button
              onClick={handleResendOtp}
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors text-sm"
            >
              Resend One Time Password
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailByOtp;
