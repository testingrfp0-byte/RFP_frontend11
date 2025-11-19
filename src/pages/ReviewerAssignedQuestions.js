import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const NGROK_HEADERS = {
  accept: "application/json",
  "ngrok-skip-browser-warning": "true",
};

export default function ReviewerAssignedQuestions() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { documentId } = useParams();
  const [reviewers, setReviewers] = useState([]);
  const [selectedReviewer, setSelectedReviewer] = useState(null);
  const [assignedQuestions, setAssignedQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [removingQuestion, setRemovingQuestion] = useState(null);

  const [filterStatus, setFilterStatus] = useState("all");
  const [submittedCount, setSubmittedCount] = useState(0);
  const [notSubmittedCount, setNotSubmittedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const calledOnceRef = useRef(false);
  const [documentQuestions, setDocumentQuestions] = useState([]);

  const handleFilterClick = (status) => {
    setFilterStatus(status);
    if (documentId) {
      filterDocumentQuestions(status);
    } else {
      filterQuestions(status);
    }
  };

  const filterQuestions = (status) => {
    if (status === "all") {
      setFilteredQuestions(assignedQuestions);
    } else {
      setFilteredQuestions(
        assignedQuestions.filter((q) => q.status === status)
      );
    }
  };

  const filterDocumentQuestions = (status) => {
    if (status === "all") {
      setFilteredQuestions(documentQuestions);
    } else {
      setFilteredQuestions(
        documentQuestions.filter((q) => q.status === status)
      );
    }
  };

  const fetchReviewers = async () => {
    if (userRole === "reviewer") return;

    try {
      const session = localStorage.getItem("session");
      if (!session) return;

      const parsedSession = JSON.parse(session);
      const token = parsedSession.token;

      if (!token) return;

      const headers = {
        ...NGROK_HEADERS,
        Authorization: `Bearer ${token}`,
      };

      const res = await fetch(`${API_BASE_URL}/assign_user_status`, {
        headers,
      });

      if (res.ok) {
        const response = await res.json();
        const data = response.data || response;

        const uniqueReviewers = [];
        const reviewerMap = new Map();

        data.forEach((item) => {
          if (item.username && !reviewerMap.has(item.username)) {
            reviewerMap.set(item.username, {
              username: item.username,
              email: item.email || "",
              totalQuestions: 0,
              submittedQuestions: 0,
              pendingQuestions: 0,
            });
            uniqueReviewers.push(reviewerMap.get(item.username));
          }
        });

        data.forEach((item) => {
          if (item.username && reviewerMap.has(item.username)) {
            const reviewer = reviewerMap.get(item.username);
            reviewer.totalQuestions++;

            if (item.status === "submitted") {
              reviewer.submittedQuestions++;
            } else {
              reviewer.pendingQuestions++;
            }
          }
        });

        setReviewers(uniqueReviewers);
      } else {
        console.error("Failed to fetch reviewers:", res.status, res.statusText);
        setError("Failed to fetch reviewers");
      }
    } catch (err) {
      console.error("Error fetching reviewers:", err);
      setError("Failed to fetch reviewers");
    }
  };

  const handleRemoveQuestion = async (question) => {
    const questionId =
      question.ques_id ||
      question.question_id ||
      question.id ||
      question.questionId;
    const userId = question.user_id || question.userId;

    if (!userId) {
      console.error("Missing user ID:", question);
      setError("Cannot remove: Missing user ID");
      return;
    }

    setRemovingQuestion(questionId || question.question);

    try {
      const session = localStorage.getItem("session");
      if (!session) {
        navigate("/login");
        return;
      }

      const parsedSession = JSON.parse(session);
      const token = parsedSession.token;

      if (!token) {
        navigate("/login");
        return;
      }

      let deleteUrl;
      if (questionId) {
        deleteUrl = `${API_BASE_URL}/reviewer-remove?ques_id=${questionId}&user_id=${userId}`;
      } else {
        deleteUrl = `${API_BASE_URL}/reviewer-remove?ques_id=${questionId}&user_id=${userId}`;
      }

      const deleteRes = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (deleteRes.ok) {
        setAssignedQuestions((prevQuestions) => {
          const updatedQuestions = prevQuestions.filter((q) => {
            const qId = q.ques_id || q.question_id || q.id || q.question;
            return qId !== (questionId || question.question);
          });

          const submitted = updatedQuestions.filter(
            (q) => q.status === "submitted"
          ).length;
          const notSubmitted = updatedQuestions.filter(
            (q) => q.status === "not submitted"
          ).length;
          const pending = updatedQuestions.filter(
            (q) => !q.status || q.status === "process"
          ).length;

          setSubmittedCount(submitted);
          setNotSubmittedCount(notSubmitted);
          setPendingCount(pending);
          setTotalCount(updatedQuestions.length);

          setFilteredQuestions((prevFiltered) => {
            if (filterStatus === "all") {
              return updatedQuestions;
            } else {
              return updatedQuestions.filter((q) => q.status === filterStatus);
            }
          });

          return updatedQuestions;
        });

        setReviewers((prevReviewers) =>
          prevReviewers.map((reviewer) => {
            if (reviewer.username === selectedReviewer) {
              return {
                ...reviewer,
                totalQuestions: reviewer.totalQuestions - 1,
                submittedQuestions:
                  question.status === "submitted"
                    ? reviewer.submittedQuestions - 1
                    : reviewer.submittedQuestions,
                pendingQuestions:
                  question.status !== "submitted"
                    ? reviewer.pendingQuestions - 1
                    : reviewer.pendingQuestions,
              };
            }
            return reviewer;
          })
        );

        setError(null);
      } else {
        const errorData = await deleteRes.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to remove assignment");
      }
    } catch (err) {
      console.error("Error removing question:", err);
      setError(err.message || "Failed to remove question assignment");
    } finally {
      setRemovingQuestion(null);
    }
  };

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const session = localStorage.getItem("session");
        if (!session) {
          navigate("/login");
          return;
        }

        const parsedSession = JSON.parse(session);
        const token = parsedSession.token;

        if (!token) {
          navigate("/login");
          return;
        }

        const headers = {
          ...NGROK_HEADERS,
          Authorization: `Bearer ${token}`,
        };

        const res = await fetch(`${API_BASE_URL}/userdetails`, {
          headers,
        });

        if (res.ok) {
          const users = await res.json();
          const user = users.find(
            (u) =>
              u.email === parsedSession.email ||
              u.username === parsedSession.email
          );

          if (user && user.role !== "reviewer") {
            setUserRole(user.role);
          } else {
            navigate("/");
            return;
          }
        } else {
          navigate("/login");
          return;
        }
      } catch (err) {
        console.error("Error checking user role:", err);
        navigate("/login");
      }
    };
    if (!calledOnceRef.current) {
      checkUserRole();
      calledOnceRef.current = true;
    }
  }, [navigate]);

  useEffect(() => {
    if (documentId) {
      fetchQuestionsForDocument(documentId);
    } else if (userRole && userRole !== "reviewer") {
      fetchReviewers();
    }
  }, [userRole, documentId]);

  const fetchReviewerQuestions = async (reviewerUsername) => {
    setLoading(true);
    setError(null);

    try {
      const session = localStorage.getItem("session");
      if (!session) {
        navigate("/login");
        return;
      }

      const parsedSession = JSON.parse(session);
      const token = parsedSession.token;

      if (!token) {
        navigate("/login");
        return;
      }

      const headers = {
        ...NGROK_HEADERS,
        Authorization: `Bearer ${token}`,
      };

      const [statusRes, usersRes, pdfListRes] = await Promise.all([
        fetch(`${API_BASE_URL}/assign_user_status`, { headers }),
        fetch(`${API_BASE_URL}/userdetails`, { headers }),
        fetch(`${API_BASE_URL}/filedetails`, { headers }),
      ]);

      if (statusRes.ok && usersRes.ok && pdfListRes.ok) {
        const statusResponse = await statusRes.json();
        const statusData = statusResponse.data || statusResponse;
        const usersData = await usersRes.json();
        const pdfListData = await pdfListRes.json();

        const selectedUser = usersData.find(
          (user) => user.username === reviewerUsername
        );
        const userId = selectedUser ? selectedUser.user_id : null;

        if (!userId) {
          throw new Error("User ID not found for the selected reviewer");
        }

        const questionTextToIdMap = new Map();
        for (const pdf of pdfListData) {
          try {
            const pdfDetailsRes = await fetch(
              `${API_BASE_URL}/rfpdetails/${pdf.id}`,
              { headers }
            );

            if (pdfDetailsRes.ok) {
              const pdfDetails = await pdfDetailsRes.json();
              if (pdfDetails.questions_by_section) {
                pdfDetails.questions_by_section.forEach((section) => {
                  section.questions.forEach((q) => {
                    if (q.id) {
                      if (q.question_text) {
                        questionTextToIdMap.set(q.question_text.trim(), q.id);
                      }
                      if (q.question) {
                        questionTextToIdMap.set(q.question.trim(), q.id);
                      }
                    }
                  });
                });
              } else if (pdfDetails.questions) {
                pdfDetails.questions.forEach((q) => {
                  if (q.id) {
                    if (q.question_text) {
                      questionTextToIdMap.set(q.question_text.trim(), q.id);
                    }
                    if (q.question) {
                      questionTextToIdMap.set(q.question.trim(), q.id);
                    }
                  }
                });
              }
            } else {
              console.error(
                `Failed to fetch details for PDF ${pdf.id}:`,
                pdfDetailsRes.status
              );
            }
          } catch (err) {
            console.error(`Error fetching details for PDF ${pdf.id}:`, err);
          }
        }

        const reviewerQuestions = statusData
          .filter((item) => item.username === reviewerUsername)
          .map((item) => {
            const questionText = item.question ? item.question.trim() : "";
            const questionId = questionTextToIdMap.get(questionText);

            if (!questionId) {
              console.warn(
                `No question ID found for question: "${questionText}"`
              );
            }

            return {
              ...item,
              user_id: userId,
              ques_id: questionId || null,
              id: questionId || null,
            };
          });

        const submitted = reviewerQuestions.filter(
          (q) => q.status === "submitted"
        ).length;
        const notSubmitted = reviewerQuestions.filter(
          (q) => q.status === "not submitted"
        ).length;
        const pending = reviewerQuestions.filter(
          (q) => !q.status || q.status === "process"
        ).length;

        setSubmittedCount(submitted);
        setNotSubmittedCount(notSubmitted);
        setPendingCount(pending);
        setTotalCount(reviewerQuestions.length);

        setAssignedQuestions(reviewerQuestions);
        setFilteredQuestions(reviewerQuestions);
        setSelectedReviewer(reviewerUsername);
      } else {
        console.error("API call failed:", {
          statusRes: statusRes.status,
          usersRes: usersRes.status,
          pdfListRes: pdfListRes.status,
        });
        setError("Failed to fetch reviewer questions");
      }
    } catch (err) {
      console.error("Error fetching reviewer questions:", err);
      setError("Failed to fetch reviewer questions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionsForDocument = async (docId) => {
    setLoading(true);
    setError(null);
    try {
      const session = localStorage.getItem("session");
      if (!session) {
        navigate("/login");
        return;
      }
      const parsedSession = JSON.parse(session);
      const token = parsedSession.token;
      if (!token) {
        navigate("/login");
        return;
      }
      const headers = {
        ...NGROK_HEADERS,
        Authorization: `Bearer ${token}`,
      };

      const pdfDetailsRes = await fetch(`${API_BASE_URL}/rfpdetails/${docId}`, {
        headers,
      });
      if (!pdfDetailsRes.ok) {
        throw new Error(`Failed to fetch details for document ${docId}`);
      }
      const pdfDetails = await pdfDetailsRes.json();
      let questions = [];
      if (pdfDetails.questions_by_section) {
        pdfDetails.questions_by_section.forEach((section) => {
          questions = questions.concat(section.questions);
        });
      } else if (pdfDetails.questions) {
        questions = pdfDetails.questions;
      }

      const statusRes = await fetch(`${API_BASE_URL}/assign_user_status`, {
        headers,
      });
      if (!statusRes.ok) {
        throw new Error("Failed to fetch submission statuses");
      }
      const statusData =
        (await statusRes.json()).data || (await statusRes.json());

      const combinedQuestions = questions.map((q) => {
        const matchingStatus = statusData.find(
          (s) =>
            (s.question_id && s.question_id === q.id) ||
            (s.question && s.question.trim() === q.question.trim())
        );
        return {
          ...q,
          status: matchingStatus ? matchingStatus.status : "not assigned",
          user_id: matchingStatus ? matchingStatus.user_id : null,
          username: matchingStatus ? matchingStatus.username : null,
          submitted_at: matchingStatus ? matchingStatus.submitted_at : null,
        };
      });

      const submitted = combinedQuestions.filter(
        (q) => q.status === "submitted"
      ).length;
      const notSubmitted = combinedQuestions.filter(
        (q) => q.status === "not submitted"
      ).length;
      const pending = combinedQuestions.filter(
        (q) => q.status === "process"
      ).length;

      setSubmittedCount(submitted);
      setNotSubmittedCount(notSubmitted);
      setPendingCount(pending);
      setTotalCount(combinedQuestions.length);

      setDocumentQuestions(combinedQuestions);
      setFilteredQuestions(combinedQuestions);
      setSelectedReviewer(null);
    } catch (err) {
      console.error("Error fetching document questions:", err);
      setError("Failed to fetch document questions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (documentId) {
    return (
      <div
        className={`min-h-screen p-4 transition-colors ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1
              className={`text-3xl font-bold mb-2 flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              <span className="text-4xl">📄</span>
              Questions for Document
            </h1>
            <p
              className={`transition-colors ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              View questions associated with this document
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
              <span
                className={`ml-3 transition-colors ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Loading questions...
              </span>
            </div>
          ) : filteredQuestions.length > 0 ? (
            <div className="space-y-4">
              {filteredQuestions.map((question, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg transition-colors ${
                    isDarkMode
                      ? "bg-gray-700 border border-gray-600"
                      : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-purple-400">
                        Q {question.question_text?.split(" ")[0]}
                      </span>
                      <span
                        className={`font-medium text-sm leading-relaxed transition-colors ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {question.question_text?.substring(
                          question.question_text?.indexOf(" ") + 1
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          question.status === "submitted"
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : question.status === "not submitted"
                            ? "bg-orange-100 text-orange-800 border border-orange-200"
                            : "bg-gray-100 text-gray-800 border border-gray-200"
                        }`}
                      >
                        {question.status === "submitted"
                          ? "✅ Submitted"
                          : question.status === "not submitted"
                          ? "❌ Not for Me"
                          : "⏳ Pending"}
                      </div>
                    </div>
                  </div>
                  {question.answer && (
                    <div className="mt-3">
                      <label
                        className={`block text-xs font-medium mb-2 transition-colors ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Answer:
                      </label>
                      <div
                        className={`p-3 rounded-lg transition-colors ${
                          isDarkMode
                            ? "bg-gray-800 border border-gray-600 text-white"
                            : "bg-white border border-gray-300 text-gray-900"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-line leading-relaxed">
                          {question.answer}
                        </p>
                      </div>
                    </div>
                  )}
                  {question.submitted_at && (
                    <p
                      className={`text-xs mt-2 transition-colors ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Submitted on:{" "}
                      {new Date(question.submitted_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
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
                  ❓
                </span>
              </div>
              <p
                className={`text-lg transition-colors ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                No questions found for this document.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 transition-colors ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1
            className={`text-3xl font-bold mb-2 flex items-center gap-3 transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            <span className="text-4xl">📋</span>
            Reviewer Assigned Questions
          </h1>
          <p
            className={`transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            View questions assigned to reviewers and their status
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className={`p-6 rounded-xl shadow-xl transition-colors ${
              isDarkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
              <h2
                className={`text-xl font-semibold transition-colors ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Reviewers
              </h2>
              <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs">
                {reviewers.length} reviewers
              </span>
            </div>

            {reviewers.length > 0 ? (
              <div className="space-y-3">
                {reviewers.map((reviewer, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedReviewer === reviewer.username
                        ? "bg-purple-600 text-white shadow-lg"
                        : isDarkMode
                        ? "bg-gray-700 hover:bg-gray-650 text-gray-300"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => fetchReviewerQuestions(reviewer.username)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-sm">
                          {reviewer.username}
                        </h3>
                        {reviewer.email && (
                          <p
                            className={`text-xs mt-1 ${
                              selectedReviewer === reviewer.username
                                ? "text-purple-200"
                                : isDarkMode
                                ? "text-gray-400"
                                : "text-gray-500"
                            }`}
                          >
                            {reviewer.email}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-xs ${
                            selectedReviewer === reviewer.username
                              ? "text-purple-200"
                              : isDarkMode
                              ? "text-gray-400"
                              : "text-gray-500"
                          }`}
                        >
                          {reviewer.totalQuestions} questions
                        </div>
                        <div
                          className={`text-xs ${
                            selectedReviewer === reviewer.username
                              ? "text-purple-200"
                              : isDarkMode
                              ? "text-gray-400"
                              : "text-gray-500"
                          }`}
                        >
                          {reviewer.submittedQuestions} submitted
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`text-xl transition-colors ${
                      isDarkMode ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    👥
                  </span>
                </div>
                <p
                  className={`text-sm transition-colors ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  No reviewers found
                </p>
              </div>
            )}
          </div>

          <div
            className={`lg:col-span-2 p-6 rounded-xl shadow-xl transition-colors ${
              isDarkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
              <h2
                className={`text-xl font-semibold transition-colors ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {selectedReviewer
                  ? `Questions for ${selectedReviewer}`
                  : "Select a Reviewer"}
              </h2>
              {selectedReviewer && (
                <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs">
                  {filteredQuestions.length} questions
                </span>
              )}
            </div>

            {selectedReviewer && (
              <div
                className={`gap-3 mb-6 flex items-center justify-start p-4 rounded-lg transition-colors ${
                  isDarkMode
                    ? "bg-gray-700 hover:bg-gray-650"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <span className="text-purple-400 text-lg">📊</span>
                <h3
                  className={`text-xg font-semibold transition-colors ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Questions Status
                </h3>
                <div className="w-md">
                  <select
                    value={filterStatus}
                    onChange={(e) => handleFilterClick(e.target.value)}
                    className={`flex-grow px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDarkMode
                        ? "bg-gray-700 text-gray-300 border border-gray-600 focus:ring-purple-500 focus:border-purple-500"
                        : "bg-white text-gray-700 border border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                    }`}
                  >
                    <option value="submitted">
                      Submitted: {submittedCount}
                    </option>
                    <option value="not submitted">
                      Not for me: {notSubmittedCount}
                    </option>
                    <option value="process">Pending: {pendingCount}</option>
                    <option value="all">Total Questions: {totalCount}</option>
                  </select>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
                <span
                  className={`ml-3 transition-colors ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Loading questions...
                </span>
              </div>
            ) : selectedReviewer ? (
              filteredQuestions.length > 0 ? (
                <div className="space-y-4">
                  {filteredQuestions.map((question, idx) => {
                    const questionId = question.question_id || question.id;
                    const userId = question.user_id;

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg transition-colors ${
                          isDarkMode
                            ? "bg-gray-700 border border-gray-600"
                            : "bg-gray-50 border border-gray-200"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-purple-400">
                              Q {question?.question?.split(" ")[0]}
                            </span>
                            <span
                              className={`font-medium text-sm leading-relaxed transition-colors ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {question?.question?.substring(
                                question?.question.indexOf(" ") + 1
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <div
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                question.status === "submitted"
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : question.status === "not submitted"
                                  ? "bg-orange-100 text-orange-800 border border-orange-200"
                                  : "bg-gray-100 text-gray-800 border border-gray-200"
                              }`}
                            >
                              {question.status === "submitted"
                                ? "✅ Submitted"
                                : question.status === "not submitted"
                                ? "❌ Not for Me"
                                : "⏳ Pending"}
                            </div>

                            <button
                              onClick={() => handleRemoveQuestion(question)}
                              disabled={
                                removingQuestion ===
                                (questionId || question.question)
                              }
                              className={`bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                                removingQuestion ===
                                (questionId || question.question)
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              title={
                                removingQuestion ===
                                (questionId || question.question)
                                  ? "Removing question..."
                                  : "Remove question from reviewer"
                              }
                            >
                              {removingQuestion ===
                              (questionId || question.question) ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  Removing...
                                </>
                              ) : (
                                <>
                                  <span>🗑️</span>
                                  Remove
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {question.answer && (
                          <div className="mt-3">
                            <label
                              className={`block text-xs font-medium mb-2 transition-colors ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              Answer:
                            </label>
                            <div
                              className={`p-3 rounded-lg transition-colors ${
                                isDarkMode
                                  ? "bg-gray-800 border border-gray-600 text-white"
                                  : "bg-white border border-gray-300 text-gray-900"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-line leading-relaxed">
                                {question.answer}
                              </p>
                            </div>
                          </div>
                        )}

                        {question.submitted_at && (
                          <p
                            className={`text-xs mt-2 transition-colors ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            Submitted on:{" "}
                            {new Date(question.submitted_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
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
                      📝
                    </span>
                  </div>
                  <p
                    className={`text-lg transition-colors ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    No questions match the current filter
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-12">
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
                  Select a reviewer to view their assigned questions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
