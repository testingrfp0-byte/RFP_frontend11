import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function UploadPdf() {
  const { isDarkMode } = useTheme();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState("");
  const [questions, setQuestions] = useState([]);
  const [expandedSummary, setExpandedSummary] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignDropdown, setAssignDropdown] = useState(null);
  const [assignStatus, setAssignStatus] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const session = localStorage.getItem("session");
        const token = session ? JSON.parse(session).token : null;

        const headers = {
          accept: "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        };

        const res = await fetch(`${API_BASE_URL}/userdetails`, {
          headers,
        });
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        setUsers([]);
      }
    };
    fetchUsers();
  }, []);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return setMessage("Please select a PDF file.");
    setLoading(true);
    setMessage("");
    setSummary("");
    setQuestions([]);
    setAnswers([]);
    setExpandedSummary(false);
    setExpandedQuestion(null);
    setAssignDropdown(null);
    setAssignStatus([]);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;

      const headers = {
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const response = await fetch(`${API_BASE_URL}/search-related-summary/`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();

      setMessage("PDF uploaded and processed successfully!");
      setSummary(data.summary || "");

      let questionsArray = [];
      if (data.total_questions) {
        if (Array.isArray(data.total_questions)) {
          questionsArray = data.total_questions;
        } else if (typeof data.total_questions === "string") {
          questionsArray = [data.total_questions];
        } else if (typeof data.total_questions === "object") {
          questionsArray = Object.values(data.total_questions).filter(
            (q) => q && typeof q === "string"
          );
        }
      }

      if (questionsArray.length === 0) {
        if (data.questions && Array.isArray(data.questions)) {
          questionsArray = data.questions;
        } else if (data.question_list && Array.isArray(data.question_list)) {
          questionsArray = data.question_list;
        }
      }

      setQuestions(questionsArray);
      setAnswers(questionsArray.map(() => ""));
      setAssignStatus(questionsArray.map(() => ""));
      setFile(null);
    } catch (err) {
      console.error("Upload error:", err);
      setMessage("Upload failed: " + err.message);
    }
    setLoading(false);
  };

  const handleAnswerChange = (idx, value) => {
    setAnswers((prev) => {
      const updated = [...prev];
      updated[idx] = value;
      return updated;
    });
  };

  const handleAssign = (idx) => {
    setAssignDropdown(idx);
  };

  const handleUserSelect = async (qIdx, user) => {
    try {
      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;

      const headers = {
        accept: "application/json",
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const res = await fetch(`${API_BASE_URL}/assign-question`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          question: questions[qIdx],
          username: user.username,
          email: user.email,
        }),
      });
      if (!res.ok) throw new Error("Failed to assign");
      setAssignStatus((prev) => {
        const updated = [...prev];
        updated[qIdx] = `Assigned to ${user.username}`;
        return updated;
      });
      setAssignDropdown(null);
    } catch (err) {
      setAssignStatus((prev) => {
        const updated = [...prev];
        updated[qIdx] = "Assignment failed";
        return updated;
      });
      setAssignDropdown(null);
    }
  };

  return (
    <div
      className={`min-h-screen p-6 transition-colors ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2
            className={`text-3xl font-bold mb-2 flex items-center gap-3 transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            <span className="text-4xl">📤</span>
            Upload Document
          </h2>
          <p
            className={`transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Upload your RFP document for AI-powered analysis
          </p>
        </div>

        <div
          className={`p-6 rounded-xl shadow-xl mb-6 transition-colors ${
            isDarkMode
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
            <h3
              className={`text-xl font-semibold transition-colors ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Document Upload
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label
                className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Select Document
              </label>
              <input
                type="file"
                accept="application/pdf,.doc,.docx"
                onChange={handleFileChange}
                className={`w-full p-3 rounded-lg transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700 ${
                  isDarkMode
                    ? "bg-gray-700 border border-gray-600 text-white"
                    : "bg-gray-50 border border-gray-300 text-gray-900"
                }`}
              />
              <p
                className={`text-sm mt-1 transition-colors ${
                  isDarkMode ? "text-gray-500" : "text-gray-500"
                }`}
              >
                Supported formats: PDF, DOC, DOCX
              </p>
            </div>

            <button
              onClick={handleUpload}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <span>📤</span>
                  Upload & Analyze
                </>
              )}
            </button>
          </div>

          {message && (
            <div
              className={`mt-4 p-4 rounded-lg text-sm ${
                message.includes("successfully")
                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        {summary && (
          <div
            className={`rounded-xl shadow-xl mb-6 transition-colors ${
              isDarkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-gray-200"
            }`}
          >
            <div
              className={`cursor-pointer flex items-center justify-between p-6 transition-colors ${
                isDarkMode ? "hover:bg-gray-750" : "hover:bg-gray-50"
              }`}
              onClick={() => setExpandedSummary((prev) => !prev)}
            >
              <div className="flex items-center gap-3">
                <span className="text-purple-400 text-lg">📋</span>
                <h3
                  className={`text-xl font-semibold transition-colors ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Document Summary
                </h3>
              </div>
              <span className="text-purple-400 text-lg">
                {expandedSummary ? "▲" : "▼"}
              </span>
            </div>
            {expandedSummary && (
              <div className="px-6 pb-6">
                <div
                  className={`p-4 rounded-lg transition-colors ${
                    isDarkMode
                      ? "bg-gray-750 border border-gray-600"
                      : "bg-gray-100 border border-gray-200"
                  }`}
                >
                  <p
                    className={`whitespace-pre-line leading-relaxed transition-colors ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    {summary}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {questions.length > 0 && (
          <div
            className={`rounded-xl shadow-xl transition-colors ${
              isDarkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-gray-200"
            }`}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-purple-400 text-lg">❓</span>
                <h3
                  className={`text-xl font-semibold transition-colors ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Extracted Questions
                </h3>
                <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs">
                  {questions.length} questions
                </span>
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg overflow-hidden transition-colors ${
                      isDarkMode
                        ? "bg-gray-700 border border-gray-600"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                        isDarkMode ? "hover:bg-gray-650" : "hover:bg-gray-100"
                      }`}
                      onClick={() =>
                        setExpandedQuestion(
                          expandedQuestion === idx ? null : idx
                        )
                      }
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-purple-400 mt-1">Q{idx + 1}</span>
                        <span
                          className={`font-medium text-sm leading-relaxed transition-colors ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {q}
                        </span>
                      </div>
                      <span className="text-purple-400 ml-4">
                        {expandedQuestion === idx ? "▲" : "▼"}
                      </span>
                    </div>
                    {expandedQuestion === idx && (
                      <div
                        className={`p-4 border-t transition-colors ${
                          isDarkMode
                            ? "bg-gray-750 border-gray-600"
                            : "bg-gray-100 border-gray-200"
                        }`}
                      >
                        <div className="mb-4">
                          <label
                            className={`block text-sm font-medium mb-2 transition-colors ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            Your Response:
                          </label>
                          <textarea
                            className={`w-full p-3 rounded-lg transition-colors resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 ${
                              isDarkMode
                                ? "bg-gray-800 border border-gray-600 text-white placeholder-gray-400"
                                : "bg-white border border-gray-300 text-gray-900 placeholder-gray-500"
                            }`}
                            placeholder="Type your detailed answer here..."
                            rows="4"
                            value={answers[idx] || ""}
                            onChange={(e) =>
                              handleAnswerChange(idx, e.target.value)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                              onClick={() => handleAssign(idx)}
                              type="button"
                            >
                              <span>👤</span>
                              Assign to User
                            </button>
                            {assignStatus[idx] && (
                              <span className="text-purple-400 text-sm bg-purple-500/20 px-3 py-1 rounded-full">
                                {assignStatus[idx]}
                              </span>
                            )}
                          </div>
                        </div>
                        {assignDropdown === idx && (
                          <div className="mt-3">
                            <select
                              className={`w-full p-3 rounded-lg transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500 ${
                                isDarkMode
                                  ? "bg-gray-800 border border-gray-600 text-white"
                                  : "bg-white border border-gray-300 text-gray-900"
                              }`}
                              onChange={(e) => {
                                const user = users.find(
                                  (u) => u.username === e.target.value
                                );
                                if (user) handleUserSelect(idx, user);
                              }}
                              defaultValue=""
                            >
                              <option value="" disabled>
                                Select a reviewer
                              </option>
                              {users.map((user, i) => (
                                <option key={i} value={user.username}>
                                  {user.username +
                                    (user.email ? ` (${user.email})` : "")}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
