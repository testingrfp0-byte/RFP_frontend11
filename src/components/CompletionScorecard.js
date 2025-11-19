import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const NGROK_HEADERS = {
  accept: "application/json",
  "ngrok-skip-browser-warning": "true",
};

export default function CompletionScorecard({ selectedPdf, pdfDetails }) {
  const { isDarkMode } = useTheme();
  const [completionData, setCompletionData] = useState({});
  const [loading, setLoading] = useState(false);
  const [groupedQuestions, setGroupedQuestions] = useState({});

  useEffect(() => {
    if (selectedPdf && pdfDetails?.questions) {
      fetchCompletionStatus();
      groupQuestionsByStructure();
    }
  }, [selectedPdf, pdfDetails]);

  const fetchCompletionStatus = async () => {
    if (!API_BASE_URL || !selectedPdf) return;

    setLoading(true);
    try {
      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;
      const headers = {
        ...NGROK_HEADERS,
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const response = await fetch(
        `${API_BASE_URL}/completion-status/${selectedPdf.id}`,
        {
          headers,
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCompletionData(data);
      } else {
        const mockData = {};
        pdfDetails.questions.forEach((q, index) => {
          mockData[q.id] = {
            status:
              index % 3 === 0
                ? "completed"
                : index % 3 === 1
                ? "in_progress"
                : "not_started",
            assignedTo: index % 2 === 0 ? "john.doe@example.com" : null,
            lastUpdated: new Date().toISOString(),
            completionPercentage:
              index % 3 === 0 ? 100 : index % 3 === 1 ? 65 : 0,
          };
        });
        setCompletionData(mockData);
      }
    } catch (error) {
      console.error("Error fetching completion status:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupQuestionsByStructure = () => {
    if (!pdfDetails?.questions) return;

    const grouped = {};

    pdfDetails.questions.forEach((question, index) => {
      const sectionMatch = question.question_text.match(/^(\d+\.?\d*\.?\d*)/);
      const sectionNumber = sectionMatch ? sectionMatch[1] : "General";

      const mainSectionMatch = sectionNumber.match(/^(\d+\.?\d*)/);
      const mainSection = mainSectionMatch ? mainSectionMatch[1] : "General";

      if (!grouped[mainSection]) {
        grouped[mainSection] = {
          title: `Section ${mainSection}`,
          questions: [],
          totalQuestions: 0,
          completedQuestions: 0,
          inProgressQuestions: 0,
        };
      }

      const status = completionData[question.id]?.status || "not_started";
      grouped[mainSection].questions.push({
        ...question,
        index: index + 1,
        sectionNumber,
        status,
        assignedTo: completionData[question.id]?.assignedTo,
        completionPercentage:
          completionData[question.id]?.completionPercentage || 0,
      });

      grouped[mainSection].totalQuestions++;
      if (status === "completed") {
        grouped[mainSection].completedQuestions++;
      } else if (status === "in_progress") {
        grouped[mainSection].inProgressQuestions++;
      }
    });

    setGroupedQuestions(grouped);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "not_started":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return "✅";
      case "in_progress":
        return "🔄";
      case "not_started":
        return "⏳";
      default:
        return "❓";
    }
  };

  const calculateOverallProgress = () => {
    const totalQuestions = pdfDetails?.questions?.length || 0;
    if (totalQuestions === 0) return 0;

    const completedQuestions = Object.values(completionData).filter(
      (data) => data.status === "completed"
    ).length;

    return Math.round((completedQuestions / totalQuestions) * 100);
  };

  const getProgressBarColor = (percentage) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

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
              📊
            </span>
          </div>
          <p
            className={`text-lg transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Select a document to view completion scorecard
          </p>
        </div>
      </div>
    );
  }

  const overallProgress = calculateOverallProgress();
  const totalQuestions = pdfDetails?.questions?.length || 0;
  const completedCount = Object.values(completionData).filter(
    (data) => data.status === "completed"
  ).length;
  const inProgressCount = Object.values(completionData).filter(
    (data) => data.status === "in_progress"
  ).length;

  return (
    <div
      className={`rounded-xl shadow-xl transition-colors ${
        isDarkMode
          ? "bg-gray-800 border border-gray-700"
          : "bg-white border border-gray-200"
      }`}
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
          <h2
            className={`text-xl font-semibold transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Completion Scorecard
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
              Loading completion data...
            </span>
          </div>
        ) : (
          <>
            <div
              className={`rounded-lg p-4 mb-6 transition-colors ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600"
                  : "bg-gray-50 border border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3
                  className={`text-lg font-semibold transition-colors ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Overall Progress
                </h3>
                <span
                  className={`text-2xl font-bold transition-colors ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {overallProgress}%
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor(
                    overallProgress
                  )}`}
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div
                    className={`text-2xl font-bold transition-colors ${
                      isDarkMode ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    {completedCount}
                  </div>
                  <div
                    className={`text-sm transition-colors ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Completed
                  </div>
                </div>
                <div>
                  <div
                    className={`text-2xl font-bold transition-colors ${
                      isDarkMode ? "text-yellow-400" : "text-yellow-600"
                    }`}
                  >
                    {inProgressCount}
                  </div>
                  <div
                    className={`text-sm transition-colors ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    In Progress
                  </div>
                </div>
                <div>
                  <div
                    className={`text-2xl font-bold transition-colors ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {totalQuestions - completedCount - inProgressCount}
                  </div>
                  <div
                    className={`text-sm transition-colors ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Not Started
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(groupedQuestions).map(([sectionKey, section]) => (
                <div
                  key={sectionKey}
                  className={`rounded-lg border transition-colors ${
                    isDarkMode
                      ? "bg-gray-750 border-gray-600"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div
                    className={`p-4 border-b transition-colors ${
                      isDarkMode
                        ? "border-gray-600 bg-gray-700"
                        : "border-gray-200 bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4
                        className={`font-semibold transition-colors ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {section.title}
                      </h4>
                      <div className="flex items-center gap-4">
                        <span
                          className={`text-sm transition-colors ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {section.completedQuestions}/{section.totalQuestions}{" "}
                          completed
                        </span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProgressBarColor(
                              (section.completedQuestions /
                                section.totalQuestions) *
                                100
                            )}`}
                            style={{
                              width: `${
                                (section.completedQuestions /
                                  section.totalQuestions) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {section.questions.map((question) => (
                      <div
                        key={question.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                          isDarkMode
                            ? "bg-gray-800 border border-gray-600"
                            : "bg-white border border-gray-200"
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-purple-400 font-medium">
                            {question.sectionNumber}
                          </span>
                          <div className="flex-1">
                            <p
                              className={`text-sm font-medium mb-1 transition-colors ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {question.question_text}
                            </p>
                            {question.assignedTo && (
                              <p
                                className={`text-xs transition-colors ${
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                Assigned to: {question.assignedTo}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {question.status === "in_progress" && (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-yellow-500 h-1.5 rounded-full transition-all"
                                  style={{
                                    width: `${question.completionPercentage}%`,
                                  }}
                                ></div>
                              </div>
                              <span
                                className={`text-xs transition-colors ${
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                {question.completionPercentage}%
                              </span>
                            </div>
                          )}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              question.status
                            )}`}
                          >
                            {getStatusIcon(question.status)}{" "}
                            {question.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
