
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ForgotPassword = () => {
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/forgot_password`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to send password reset link');
      }

      setMessage('Password reset link sent to your email.');
         const otpData={ 
        title:"forgot",
        email:email
      }
      navigate("/verify-email-otp", { state: { otpData } });
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-colors ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}
    >
      <div
        className={`p-8 rounded-xl shadow-2xl w-full max-w-md transition-colors ${
          isDarkMode
            ? 'bg-gray-800 border border-gray-700'
            : 'bg-white border border-gray-200'
        }`}
      >
        <div className="text-center mb-8">
          <h2
            className={`text-3xl font-bold mb-2 transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            Forgot Password
          </h2>
          <p
            className={`transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Enter your email to receive a password reset link
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className={`block text-sm font-medium mb-2 transition-colors ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
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
                  ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400'
                  : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              required
            />
          </div>

          {message && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg text-sm">
              {message}
            </div>
          )}
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
                Sending link...
              </div>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className={`text-purple-400 hover:text-purple-300 font-medium transition-colors`}
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
