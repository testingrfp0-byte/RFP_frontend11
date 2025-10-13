import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const NGROK_HEADERS = {
  accept: "application/json",
  "ngrok-skip-browser-warning": "true",
};

export default function EnhancedTeamManagement({ selectedPdf, pdfDetails, onAssignmentUpdate }) {
  const { isDarkMode } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignedReviewers, setAssignedReviewers] = useState({});
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  useEffect(() => {
    fetchUsers();
    if (selectedPdf && pdfDetails) {
      fetchAssignedReviewers();
    }
  }, [selectedPdf, pdfDetails]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;
      const headers = {
        ...NGROK_HEADERS,
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const response = await fetch(`${API_BASE_URL}/userdetails`, { headers });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedReviewers = async () => {
    try {
      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;
      const headers = {
        ...NGROK_HEADERS,
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const response = await fetch(
        `${API_BASE_URL}/assigned-reviewers/${selectedPdf.id}`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        const assignmentMap = {};
        
        data.forEach(({ ques_id, username, user_id }) => {
          if (!assignmentMap[ques_id]) {
            assignmentMap[ques_id] = [];
          }
          assignmentMap[ques_id].push({ username, user_id });
        });

        setAssignedReviewers(assignmentMap);
      }
    } catch (error) {
      console.error("Error fetching assigned reviewers:", error);
    }
  };

  const handleAssignReviewer = async (questionId, user) => {
    try {
      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;

      const assignPayload = {
        username: user.username,
        user_id: [user.user_id],
        ques_ids: [questionId],
        file_id: selectedPdf.id,
        status: "assigned",
      };

      const response = await fetch(`${API_BASE_URL}/assign-reviewer`, {
        method: "POST",
        headers: {
          ...NGROK_HEADERS,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assignPayload),
      });

      if (response.ok) {
        // Update local state
        setAssignedReviewers(prev => ({
          ...prev,
          [questionId]: [...(prev[questionId] || []), { username: user.username, user_id: user.user_id }]
        }));

        // Notify parent component
        if (onAssignmentUpdate) {
          onAssignmentUpdate();
        }

        // Send notification
        const notifyPayload = {
          user_id: [user.user_id],
          ques_ids: [questionId],
        };

        await fetch(`${API_BASE_URL}/send-assignment-notification`, {
          method: "POST",
          headers: {
            ...NGROK_HEADERS,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(notifyPayload),
        });
      }
    } catch (error) {
      console.error("Error assigning reviewer:", error);
    }
  };

  const handleUnassignReviewer = async (questionId, userId) => {
    try {
      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;

      const response = await fetch(
        `${API_BASE_URL}/reviewer-remove?ques_id=${questionId}&user_id=${userId}`,
        {
          method: "DELETE",
          headers: {
            ...NGROK_HEADERS,
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        // Update local state
        setAssignedReviewers(prev => ({
          ...prev,
          [questionId]: (prev[questionId] || []).filter(r => r.user_id !== userId)
        }));

        // Notify parent component
        if (onAssignmentUpdate) {
          onAssignmentUpdate();
        }
      }
    } catch (error) {
      console.error("Error unassigning reviewer:", error);
    }
  };

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "👑";
      case "reviewer":
        return "👤";
      case "member":
        return "👥";
      default:
        return "❓";
    }
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "reviewer":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "member":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const reviewers = users.filter(user => user.role?.toLowerCase() === "reviewer");
  const members = users.filter(user => user.role?.toLowerCase() === "member");
  const admins = users.filter(user => user.role?.toLowerCase() === "admin");

  if (!selectedPdf || !pdfDetails) {
    return (
      <div
        className={`rounded-xl shadow-xl p-6 transition-colors ${
          isDarkMode
            ? "bg-gray-800 border border-gray-700"
            : "bg-white border border-gray-200"
        }`}
      >
        <div className="text-center py-8">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${
              isDarkMode ? "bg-gray-700" : "bg-gray-200"
            }`}
          >
            <span
              className={`text-2xl transition-colors ${
                isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              👥
            </span>
          </div>
          <p
            className={`text-lg transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Select a document to manage team assignments
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl shadow-xl transition-colors ${
        isDarkMode
          ? "bg-gray-800 border border-gray-700"
          : "bg-white border border-gray-200"
      }`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
          <h2
            className={`text-xl font-semibold transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Team Management
          </h2>
          <span
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              isDarkMode
                ? "bg-gray-700 text-gray-300"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {selectedPdf.filename}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span
              className={`ml-3 transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Loading team data...
            </span>
          </div>
        ) : (
          <>
            {/* Team Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div
                className={`p-4 rounded-lg transition-colors ${
                  isDarkMode
                    ? "bg-gray-700 border border-gray-600"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">👑</span>
                  <div>
                    <h3
                      className={`font-semibold transition-colors ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Admins
                    </h3>
                    <p
                      className={`text-sm transition-colors ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Full access & management
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-purple-500">
                  {admins.length}
                </div>
              </div>

              <div
                className={`p-4 rounded-lg transition-colors ${
                  isDarkMode
                    ? "bg-gray-700 border border-gray-600"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">👤</span>
                  <div>
                    <h3
                      className={`font-semibold transition-colors ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Reviewers
                    </h3>
                    <p
                      className={`text-sm transition-colors ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Question assignment & review
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-500">
                  {reviewers.length}
                </div>
              </div>

              <div
                className={`p-4 rounded-lg transition-colors ${
                  isDarkMode
                    ? "bg-gray-700 border border-gray-600"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">👥</span>
                  <div>
                    <h3
                      className={`font-semibold transition-colors ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Members
                    </h3>
                    <p
                      className={`text-sm transition-colors ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      View access only
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-500">
                  {members.length}
                </div>
              </div>
            </div>

            {/* Question Assignments */}
            <div>
              <h3
                className={`text-lg font-semibold mb-4 transition-colors ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Question Assignments
              </h3>
              
              <div className="space-y-3">
                {pdfDetails.questions?.map((question, idx) => (
                  <div
                    key={question.id}
                    className={`rounded-lg border transition-colors ${
                      isDarkMode
                        ? "bg-gray-700 border border-gray-600"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <div
                      className={`p-4 cursor-pointer transition-colors ${
                        isDarkMode ? "hover:bg-gray-650" : "hover:bg-gray-100"
                      }`}
                      onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-purple-400">
                                              Q{" "}
                                              {
                                                question.question_text.split(
                                                  " "
                                                )[0]
                                              }
                                            </span>
                                            <span
                                              className={`font-medium text-sm leading-relaxed transition-colors ${
                                                isDarkMode
                                                  ? "text-white"
                                                  : "text-gray-900"
                                              }`}
                                            >
                                              {question.question_text.substring(
                                                question.question_text.indexOf(
                                                  " "
                                                ) + 1
                                              )}
                                            </span>
                        </div>
                        <span className="text-purple-400 ml-4">
                          {expandedQuestion === idx ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {expandedQuestion === idx && (
                      <div
                        className={`p-4 border-t transition-colors ${
                          isDarkMode
                            ? "border-gray-600 bg-gray-750"
                            : "border-gray-200 bg-gray-100"
                        }`}
                      >
                        {/* Current Assignments */}
                        {assignedReviewers[question.id]?.length > 0 && (
                          <div className="mb-4">
                            <h4
                              className={`text-sm font-medium mb-2 transition-colors ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              Currently Assigned:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {assignedReviewers[question.id].map((reviewer, rIdx) => (
                                <div
                                  key={rIdx}
                                  className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs border border-blue-200"
                                >
                                  <span>👤 {reviewer.username}</span>
                                  <button
                                    onClick={() => handleUnassignReviewer(question.id, reviewer.user_id)}
                                    className="text-blue-600 hover:text-blue-800 ml-1"
                                    title="Remove assignment"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Available Reviewers */}
                        <div>
                          <h4
                            className={`text-sm font-medium mb-2 transition-colors ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            Available Reviewers:
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {reviewers
                              .filter(reviewer => 
                                !assignedReviewers[question.id]?.some(ar => ar.user_id === reviewer.user_id)
                              )
                              .map((reviewer) => (
                                <button
                                  key={reviewer.user_id}
                                  onClick={() => handleAssignReviewer(question.id, reviewer)}
                                  className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${
                                    isDarkMode
                                      ? "bg-gray-800 border border-gray-600 hover:bg-gray-750 text-white"
                                      : "bg-white border border-gray-200 hover:bg-gray-50 text-gray-900"
                                  }`}
                                >
                                  <span className="text-lg">{getRoleIcon(reviewer.role)}</span>
                                  <div className="flex-1 text-left">
                                    <div className="font-medium">{reviewer.username}</div>
                                    <div
                                      className={`text-xs transition-colors ${
                                        isDarkMode ? "text-gray-400" : "text-gray-500"
                                      }`}
                                    >
                                      {reviewer.email}
                                    </div>
                                  </div>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(
                                      reviewer.role
                                    )}`}
                                  >
                                    {reviewer.role}
                                  </span>
                                </button>
                              ))}
                          </div>
                          
                          {reviewers.filter(reviewer => 
                            !assignedReviewers[question.id]?.some(ar => ar.user_id === reviewer.user_id)
                          ).length === 0 && (
                            <p
                              className={`text-sm text-center py-4 transition-colors ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              All reviewers have been assigned to this question
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}