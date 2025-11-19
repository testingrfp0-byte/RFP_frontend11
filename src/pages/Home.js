import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLocation, useNavigate } from "react-router-dom";
import ConfirmationDialog from "../components/ConfirmationDialog";
import EditQuestionDialog from "../components/EditQuestionDialog";
import ToasterNotification from "../components/ToasterNotification";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Send } from "lucide-react";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const SUBMIT_CHECK_URL = `${API_BASE_URL}/check_submit`;
const NGROK_HEADERS = {
  accept: "application/json",
  "ngrok-skip-browser-warning": "true",
};

export default function Home({
  pdfList,
  setPdfList,
  pdfLoading,
  pageType,
  selfAssignMode = false,
}) {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [deleteMessage, setDeleteMessage] = useState("");
  const [selectedPdf, setSelectedPdf] = useState(null);

  const [pdfDetails, setPdfDetails] = useState(null);
  const [expandedSummary, setExpandedSummary] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [assignDropdown, setAssignDropdown] = useState(null);
  const [users, setUsers] = useState([]);

  const [loadingReassign, setLoadingReassign] = useState(false);
  const [assignStatus, setAssignStatus] = useState([]);

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [assignedQuestions, setAssignedQuestions] = useState([]);

  const [editingAnswer, setEditingAnswer] = useState({});

  const [generatingAnswer, setGeneratingAnswer] = useState({});
  const [submissionStatus, setSubmissionStatus] = useState({});
  const [submissionError, setSubmissionError] = useState({});
  const [submittedQuestions, setSubmittedQuestions] = useState([]);
  const [submittedQuestionsLoading, setSubmittedQuestionsLoading] =
    useState(false);
  const [submittedQuestionsError, setSubmittedQuestionsError] = useState(null);
  const [generatedAnswer, setGeneratedAnswer] = useState({});
  const [unassignLoading, setUnassignLoading] = useState({});
  const [selectedReviewers, setSelectedReviewers] = useState({});

  const [assignmentError, setAssignmentError] = useState({});
  const [responseVersions, setResponseVersions] = useState({});

  const [showVersionDropdown, setShowVersionDropdown] = useState({});
  const [loadingVersions, setLoadingVersions] = useState({});
  const [assignedCount, setAssignedCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const [processQuesCount, setProcessQuesCount] = useState(0);
  const [assignedQuesCount, setAssignedQuesCount] = useState(0);
  const [unassignedQuesCount, setUnassignedQuesCount] = useState(0);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [errorQuestions, setErrorQuestions] = useState(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [currentAnalyzingPdfId, setCurrentAnalyzingPdfId] = useState(null);
  const [aiAnalysisResults, setAiAnalysisResults] = useState({});

  const [filterStatus, setFilterStatus] = useState("all");

  const [status, setStatus] = useState("total question");
  const calledOnceRef = useRef(false);
  const calledUserRef = useRef(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [rfpToDelete, setRfpToDelete] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState(null);
  const [matchedArray, setMatchedArray] = useState([]);

  const [showInput, setShowInput] = useState(false);
  const [loadingsend, setLoadingsend] = useState(false);

  const [inputValue, setInputValue] = useState("");

  const [toasterNotification, setToasterNotification] = useState(null);
  const documentAnalysisRef = useRef(null);

  const [aiAnalysisLoading1, setAiAnalysisLoading1] = useState(false);
  const [currentAnalyzingId, setCurrentAnalyzingId] = useState(null);
  const [analysisResult, setAnalysisResult] = useState({});

  const handleAnalyzeQuestion = async (question) => {
    try {
      setAiAnalysisLoading(true);
      setCurrentAnalyzingId(question.question_id);

      const session = JSON.parse(localStorage.getItem("session"));
      if (!session?.token) return;

      const headers = {
        ...NGROK_HEADERS,
        Authorization: `Bearer ${session.token}`,
      };

      const url = `${API_BASE_URL}/analyze-question?rfp_id=${question.rfp_id}&question_id=${question.question_id}`;

      const res = await fetch(url, {
        method: "POST",
        headers,
      });

      const data = await res.json();

      // ✅ Save analysis result for this question
      setAnalysisResult((prev) => ({
        ...prev,
        [question.question_id]: data,
      }));
    } catch (err) {
      console.log("Error:", err);
    } finally {
      setAiAnalysisLoading(false);
      setCurrentAnalyzingId(null);
    }
  };

  useEffect(() => {
    if (assignedQuestions.length > 0) {
      setMatchedArray(assignedQuestions);
    }
  }, [assignedQuestions]);

  const handleFilterClick = (status) => {
    setFilterStatus(status);

    if (status === "all") {
      setMatchedArray(assignedQuestions);
    } else {
      const matched = assignedQuestions.filter(
        (q) => q.submit_status === status
      );
      setMatchedArray(matched);
    }
  };

  useEffect(() => {
    if (assignedQuestions) {
      const submittedCount = assignedQuestions.filter(
        (q) => q.status === "submitted"
      ).length;
      const notSubmittedCount = assignedQuestions.filter(
        (q) => q.status === "not submitted"
      ).length;
      const processCount = assignedQuestions.filter(
        (q) => !q.status || q.status === "process"
      ).length;
      const totalCount = assignedQuestions.length;

      setAssignedQuesCount(submittedCount);
      setUnassignedQuesCount(notSubmittedCount);
      setProcessQuesCount(processCount);
      setTotalQuestionsCount(totalCount);
    }
  }, [assignedQuestions]);

  const fetchFilterData = useCallback(async (rfpId) => {
    try {
      const session = localStorage.getItem("session");
      if (!session) {
        console.error("No session found");
        return;
      }

      const parsedSession = JSON.parse(session);
      const token = parsedSession.token;

      if (!token) {
        console.error("No token found");
        return;
      }

      const headers = {
        ...NGROK_HEADERS,
        Authorization: `Bearer ${token}`,
      };

      const res = await fetch(`${API_BASE_URL}/filter/${rfpId}`, {
        headers,
      });

      if (res.ok) {
        const data = await res.json();

        const { assigned_count, unassigned_count, total_questions } = data;

        setAssignedCount(assigned_count);
        setUnassignedCount(unassigned_count);
        setTotalQuestions(total_questions);
      } else {
        console.error(
          "Failed to fetch filter data:",
          res.status,
          res.statusText
        );
      }
    } catch (err) {
      console.error("Error fetching filter data:", err);
    }
  }, []);

  useEffect(() => {
    if (selectedPdf) {
      fetchFilterData(selectedPdf.id);
    }
  }, [selectedPdf, fetchFilterData]);

  const fetchFilterQuestions = useCallback(async () => {
    setIsLoadingQuestions(true);
    setErrorQuestions(null);
    let allQuestions = [];
    try {
      const session = localStorage.getItem("session");
      if (!session) {
        console.error("No session found");
        setErrorQuestions("No session found. Please log in again.");
        navigate("/login");
        return;
      }

      const parsedSession = JSON.parse(session);
      const token = parsedSession.token;
      if (!token) {
        console.error("No token found");
        setErrorQuestions(
          "No authentication token found. Please log in again."
        );
        navigate("/login");
        return;
      }

      const headers = {
        ...NGROK_HEADERS,
        Authorization: `Bearer ${token}`,
      };

      const statuses = ["submitted", "not submitted", "process"];
      let submittedCount = 0;
      let notSubmittedCount = 0;
      let processCount = 0;

      for (const status of statuses) {
        let url;
        let res;
        if (
          parsedSession.role === "reviewer" ||
          parsedSession.role === "admin"
        ) {
          url = `${API_BASE_URL}/filter-questions-by-user/${encodeURIComponent(
            status
          )}`;
          res = await fetch(url, { headers });
        } else {
          console.warn(
            "No specific filter criteria met for fetching questions."
          );
          continue;
        }

        if (res && res.ok) {
          const data = await res.json();

          const { count, questions: statusQuestions } = data;

          if (status === "submitted") submittedCount = count || 0;
          else if (status === "not submitted") notSubmittedCount = count || 0;
          else if (status === "process") processCount = count || 0;
          allQuestions = [
            ...allQuestions,
            ...(statusQuestions || []).map((q) => ({ ...q, status })),
          ];
        } else {
          console.error(
            `Failed to fetch ${status} questions:`,
            res.status,
            res.statusText
          );
        }
      }

      setAssignedQuesCount(submittedCount);
      setProcessQuesCount(processCount);
      setUnassignedQuesCount(notSubmittedCount);
      setTotalQuestionsCount(submittedCount + notSubmittedCount + processCount);
    } catch (err) {
      console.error("Error fetching filter questions data:", err);
      setErrorQuestions(`An error occurred: ${err.message}`);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [navigate, assignedQuestions]);

  const [userSession, setUserSession] = useState(
    localStorage.getItem("session")
  );

  useEffect(() => {
    if (userSession) {
      try {
        const parsedSession = JSON.parse(userSession);
        if (parsedSession.role === "reviewer") {
          if (!calledOnceRef.current) {
            fetchFilterQuestions();
            calledOnceRef.current = true;
          }
        } else {
          if (!calledOnceRef.current) {
            fetchFilterQuestions();
            calledOnceRef.current = true;
          }
        }
      } catch (e) {
        console.warn("Invalid session format");
      }
    } else {
      console.warn("No user session found");
      setErrorQuestions("Please log in to view question status.");
      navigate("/login");
    }
  }, [userSession, fetchFilterQuestions, navigate]);

  useEffect(() => {
    const handleStorageChange = () => {
      setUserSession(localStorage.getItem("session"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (pdfList && pdfList.length > 0) {
      const loadedResults = {};
      pdfList.forEach((pdf) => {
        const storedResults = localStorage.getItem(
          `aiAnalysisResults_${pdf.id}`
        );
        if (storedResults) {
          try {
            loadedResults[pdf.id] = JSON.parse(storedResults);
          } catch (e) {
            console.error(
              "Error parsing AI analysis results from local storage:",
              e
            );
          }
        }
      });
      setAiAnalysisResults(loadedResults);
    }
  }, [pdfList]);

  useEffect(() => {
    const session = localStorage.getItem("session");
    if (session) {
      try {
        const parsedSession = JSON.parse(session);
        if (parsedSession.role === "admin") {
          const getCurrentUser = async () => {
            try {
              const session = localStorage.getItem("session");
              if (session) {
                const parsedSession = JSON.parse(session);
                setCurrentUser(parsedSession.email);

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
                  console.error(
                    "Unauthorized: Session expired or invalid token"
                  );

                  if (parsedSession.role) {
                    setUserRole(parsedSession.role);
                  } else {
                    localStorage.removeItem("session");
                    navigate("/login");
                  }
                  return;
                } else {
                  console.error(
                    "Failed to fetch user details:",
                    res.status,
                    res.statusText
                  );

                  if (parsedSession.role) {
                    setUserRole(parsedSession.role);
                  } else {
                    setUserRole("admin");
                  }
                }
              }
            } catch (err) {
              console.error("Error getting current user:", err);
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
      } catch (e) {
        console.warn("Invalid session format");
      }
    }
  }, [API_BASE_URL, navigate]);

  useEffect(() => {
    const fetchAssignedQuestions = async () => {
      if ((userRole !== "reviewer" && !selfAssignMode) || !API_BASE_URL) return;

      try {
        const session = localStorage.getItem("session");
        if (!session) return;

        const parsedSession = JSON.parse(session);
        const token = parsedSession.token;

        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/assigned-questions`, {
          headers: {
            ...NGROK_HEADERS,
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          const persistedQuestions = JSON.parse(
            localStorage.getItem(`assigned_questions_${parsedSession.email}`) ||
              "{}"
          );
          const persistedStatus = JSON.parse(
            localStorage.getItem(`submission_status_${parsedSession.email}`) ||
              "{}"
          );

          let submittedAnswers = {};
          if (userRole === "admin") {
            const submitRes = await fetch(SUBMIT_CHECK_URL, {
              headers: {
                ...NGROK_HEADERS,
                Authorization: `Bearer ${token}`,
              },
            });
            if (submitRes.ok) {
              const submitData = await submitRes.json();
              submittedAnswers = submitData.reduce((acc, q) => {
                acc[q.question_id] = q.answer || "";
                return acc;
              }, {});
            }
          }

          const updatedQuestions = data.map((q) => ({
            ...q,
            answer:
              submittedAnswers[q.question_id] ||
              persistedQuestions[q.question_id]?.answer ||
              q.answer ||
              "",
            status: persistedStatus[q.question_id] || q.status || "",
          }));
          setAssignedQuestions(updatedQuestions);
          setMatchedArray(updatedQuestions);
          setSubmissionStatus(persistedStatus);
        }
      } catch (err) {
        console.error("Error fetching assigned questions:", err);
      }
    };
    fetchAssignedQuestions();
  }, [userRole, API_BASE_URL, SUBMIT_CHECK_URL]);

  useEffect(() => {
    const fetchSubmittedQuestions = async () => {
      if (
        userRole === "reviewer" ||
        !API_BASE_URL ||
        location.pathname !== "/submitted-questions"
      )
        return;

      setSubmittedQuestionsLoading(true);
      setSubmittedQuestionsError(null);
      try {
        const session = localStorage.getItem("session");
        if (!session) {
          console.error("No session found");
          setSubmittedQuestionsError("No session found. Please log in again.");
          navigate("/login");
          return;
        }

        const parsedSession = JSON.parse(session);
        const token = parsedSession.token;

        if (!token) {
          console.error("No token found");
          setSubmittedQuestionsError(
            "No authentication token found. Please log in again."
          );
          navigate("/login");
          return;
        }

        const res = await fetch(`${API_BASE_URL}/check_submit`, {
          headers: {
            ...NGROK_HEADERS,
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          console.error("Unauthorized: Could not validate credentials");
          setSubmittedQuestionsError("Session expired. Please log in again.");
          localStorage.removeItem("session");
          navigate("/login");
          return;
        }

        if (!res.ok) {
          throw new Error(
            `Failed to fetch submitted questions: ${res.status} ${res.statusText}`
          );
        }

        const { data } = await res.json();
        const mappedQuestions = data
          .filter(
            (q) => q.status === "submitted" || q.status === "not submitted"
          )
          .map((q, index) => ({
            question_id: q.question_id || `temp-id-${index}`,
            question_text: q.question,
            answer: q.answer,
            status: q.status === "not submitted" ? "Not for Me" : q.status,
            username: q.username,
            document_name: q.filename || "Unknown Filename",
            submitted_at: q.submitted_at,
            user_id: q.user_id,
            file_id: q.file_id,
          }));
        setSubmittedQuestions(mappedQuestions);
      } catch (err) {
        console.error("Error fetching submitted questions:", err);
        setSubmittedQuestionsError(
          "Failed to load submitted questions. Please try again or reload the page."
        );
        setSubmittedQuestions([]);
      } finally {
        setSubmittedQuestionsLoading(false);
      }
    };
    fetchSubmittedQuestions();
  }, [userRole, API_BASE_URL, location.pathname, navigate]);

  useEffect(() => {
    if (assignedQuestions.length > 0 && currentUser) {
      const questionMap = assignedQuestions.reduce((acc, q) => {
        acc[q.question_id] = { answer: q.answer };
        return acc;
      }, {});
      localStorage.setItem(
        `assigned_questions_${currentUser}`,
        JSON.stringify(questionMap)
      );
    }
  }, [assignedQuestions, currentUser]);

  useEffect(() => {
    if (Object.keys(submissionStatus).length > 0 && currentUser) {
      localStorage.setItem(
        `submission_status_${currentUser}`,
        JSON.stringify(submissionStatus)
      );
    }
  }, [submissionStatus, currentUser]);

  useEffect(() => {
    const session = localStorage.getItem("session");
    if (session) {
      try {
        const parsedSession = JSON.parse(session);
        if (parsedSession.role === "admin") {
          const fetchUsers = async () => {
            try {
              const session = localStorage.getItem("session");
              const token = session ? JSON.parse(session).token : null;

              const headers = {
                ...NGROK_HEADERS,
                ...(token && { Authorization: `Bearer ${token}` }),
              };

              const res = await fetch(`${API_BASE_URL}/userdetails`, {
                headers,
              });
              if (!res.ok) throw new Error("Failed to fetch users");
              const data = await res.json();
              setUsers(data);
            } catch (err) {
              console.error("Error fetching users:", err);
              setUsers([]);
            }
          };
          if (!calledUserRef.current) {
            fetchUsers();
            calledUserRef.current = true;
          }
        }
      } catch (e) {
        console.warn("Invalid session format");
      }
    }
  }, [API_BASE_URL]);

  const fetchDetails = async (status) => {
    setStatus(status);
    setDetailsLoading(true);
    try {
      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;

      const headers = {
        ...NGROK_HEADERS,
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const res = await fetch(
        `${API_BASE_URL}/rfpdetails/${selectedPdf.id}/${status}`,
        {
          headers,
        }
      );
      if (!res.ok) throw new Error("Failed to fetch PDF details");
      const data = await res.json();

      const flattenedQuestions = data.questions_by_section.flatMap((section) =>
        section.questions.map((question) => ({
          ...question,
          section: section.section,
        }))
      );

      setPdfDetails({
        ...data,
        questions: flattenedQuestions,
      });

      const savedAssignStatus = JSON.parse(
        localStorage.getItem(`assignStatus_${selectedPdf.id}`) || "[]"
      );
      const savedSelectedReviewers = JSON.parse(
        localStorage.getItem(`selectedReviewers_${selectedPdf.id}`) || "{}"
      );

      setAssignStatus(savedAssignStatus);
      setSelectedReviewers(savedSelectedReviewers);

      const reviewersRes = await fetch(
        `${API_BASE_URL}/assigned-reviewers/${selectedPdf.id}`,
        { headers }
      );

      if (reviewersRes.ok) {
        const reviewersData = await reviewersRes.json();

        updateReviewersState(reviewersData, flattenedQuestions);
      }
    } catch (err) {
      console.error("Error fetching PDF details:", err);
      setPdfDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedPdf || !API_BASE_URL) return;
    fetchDetails("total question");
  }, [selectedPdf, API_BASE_URL]);

  const updateReviewersState = (reviewersData, questions) => {
    const statusMap = {};
    const reviewersMap = {};

    reviewersData.forEach(({ ques_id, username }) => {
      if (!statusMap[ques_id]) statusMap[ques_id] = new Set();
      statusMap[ques_id].add(username);

      if (!reviewersMap[ques_id]) reviewersMap[ques_id] = new Set();
      const user = users.find((u) => u.username === username);
      if (user) reviewersMap[ques_id].add(user);
    });

    const statusArray = questions.map((q) => {
      const assigned = statusMap[q.id];
      return assigned ? `Assigned to ${[...assigned].join(", ")}` : "";
    });

    const reviewersArray = questions.reduce((acc, q, idx) => {
      const assigned = reviewersMap[q.id];
      acc[idx] = assigned ? [...assigned] : [];
      return acc;
    }, {});

    setAssignStatus(statusArray);
    setSelectedReviewers(reviewersArray);

    localStorage.setItem(
      `assignStatus_${selectedPdf.id}`,
      JSON.stringify(statusArray)
    );
    localStorage.setItem(
      `selectedReviewers_${selectedPdf.id}`,
      JSON.stringify(reviewersArray)
    );
  };

  const handleAssign = useCallback((idx) => {
    setAssignDropdown(idx);
  }, []);

  const handleUnassign = useCallback(
    async (qIdx, user) => {
      if (!pdfDetails?.questions?.[qIdx]) return;

      const question = pdfDetails.questions[qIdx];
      const questionId = parseInt(question.id);
      if (isNaN(questionId)) {
        console.error("Invalid question ID:", question.id);
        return;
      }

      const session = localStorage.getItem("session");
      if (!session) {
        console.error("No session found");
        return;
      }

      const token = JSON.parse(session).token;

      setUnassignLoading((prev) => ({
        ...prev,
        [`${qIdx}-${user.user_id}`]: true,
      }));

      try {
        const res = await fetch(
          `${API_BASE_URL}/reviewer-remove?ques_id=${questionId}&user_id=${user.user_id}`,
          {
            method: "DELETE",
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
              "ngrok-skip-browser-warning": "true",
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to unassign: ${res.statusText}`);
        }

        if (selectedPdf) {
          fetchFilterData(selectedPdf.id);
        }
        setSelectedReviewers((prev) => {
          const updated = { ...prev };
          updated[qIdx] = (updated[qIdx] || []).filter(
            (reviewer) => reviewer.user_id !== user.user_id
          );
          return updated;
        });

        setAssignStatus((prev) => {
          const updated = [...prev];
          const currentAssignment = updated[qIdx] || "";
          const assignedUsers = currentAssignment
            .replace("Assigned to ", "")
            .split(", ");
          const updatedUsers = assignedUsers.filter(
            (name) => name !== user.username
          );
          updated[qIdx] = updatedUsers.length
            ? `Assigned to ${updatedUsers.join(", ")}`
            : "";
          return updated;
        });

        if (selectedPdf?.id) {
          localStorage.setItem(
            `selectedReviewers_${selectedPdf.id}`,
            JSON.stringify(selectedReviewers)
          );
          localStorage.setItem(
            `assignStatus_${selectedPdf.id}`,
            JSON.stringify(assignStatus)
          );
        }
      } catch (err) {
        console.error("Error unassigning user:", err);
      } finally {
        setUnassignLoading((prev) => ({
          ...prev,
          [`${qIdx}-${user.user_id}`]: false,
        }));
      }
    },
    [pdfDetails, API_BASE_URL, selectedPdf, assignStatus, selectedReviewers]
  );

  const checkExistingVersions = useCallback(
    async (question_id) => {
      try {
        const session = localStorage.getItem("session");
        if (!session) return;

        const parsedSession = JSON.parse(session);
        const token = parsedSession.token;
        if (!token) return;

        const res = await fetch(
          `${API_BASE_URL}/answers/${question_id}/versions`,
          {
            method: "GET",
            headers: {
              ...NGROK_HEADERS,
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          const versions = data.versions || [];
          if (versions.length > 0) {
            setResponseVersions((prev) => ({
              ...prev,
              [question_id]: versions,
            }));
            setGeneratedAnswer((prev) => ({ ...prev, [question_id]: true }));
          }
        }
      } catch (err) {
        console.error("Error checking existing versions:", err);
      }
    },
    [API_BASE_URL]
  );

  const handleEditAnswer = useCallback(
    async (question_id) => {
      const isCurrentlyEditing = editingAnswer[question_id];
      setEditingAnswer((prev) => ({
        ...prev,
        [question_id]: !prev[question_id],
      }));

      if (isCurrentlyEditing) {
        try {
          const session = localStorage.getItem("session");
          if (!session) {
            console.error("No session found");
            setSubmissionError((prev) => ({
              ...prev,
              [question_id]: "No session found. Please log in again.",
            }));
            return;
          }

          const parsedSession = JSON.parse(session);
          const token = parsedSession.token;

          if (!token) {
            console.error("No token found");
            setSubmissionError((prev) => ({
              ...prev,
              [question_id]:
                "No authentication token found. Please log in again.",
            }));
            return;
          }

          const question = assignedQuestions.find(
            (q) => q.question_id === question_id
          );
          if (!question || !question.answer) {
            console.error("No answer found for question:", question_id);
            setSubmissionError((prev) => ({
              ...prev,
              [question_id]: "No answer provided to save.",
            }));
            return;
          }

          const res = await fetch(
            `${API_BASE_URL}/update-answer/${question_id}`,
            {
              method: "PATCH",
              headers: {
                ...NGROK_HEADERS,
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ answer: question.answer }),
            }
          );

          if (res.ok) {
            setSubmissionStatus((prev) => ({
              ...prev,
              [question_id]: "saved",
            }));
            setSubmissionError((prev) => ({
              ...prev,
              [question_id]: null,
            }));

            try {
              const updatedData = await res.json();

              if (updatedData?.version) {
                setResponseVersions((prev) => ({
                  ...prev,
                  [question_id]: [
                    updatedData.version,
                    ...(prev[question_id] || []),
                  ],
                }));
              } else {
                await checkExistingVersions(question_id);
              }
            } catch (err) {
              console.error("Error parsing version data:", err);
              await checkExistingVersions(question_id);
            }
          } else {
            console.error(
              "Failed to update answer:",
              res.status,
              res.statusText
            );
            let errorMessage = `Failed to save answer: ${res.status} ${res.statusText}`;
            if (res.status === 403) {
              errorMessage =
                "Permission denied. Please check your account permissions or log in again.";
              navigate("/login");
            } else if (res.status === 401) {
              errorMessage = "Authentication failed. Please log in again.";
              navigate("/login");
            } else if (res.status === 422) {
              errorMessage =
                "Invalid request. Please try again or contact support.";
            }
            setSubmissionError((prev) => ({
              ...prev,
              [question_id]: errorMessage,
            }));
          }
        } catch (err) {
          console.error("Error updating answer:", err);
          setSubmissionError((prev) => ({
            ...prev,
            [question_id]: "Failed to save answer. Please try again.",
          }));
        }
      }
    },
    [
      editingAnswer,
      assignedQuestions,
      API_BASE_URL,
      navigate,
      checkExistingVersions,
    ]
  );

  const handleGenerateAnswer = useCallback(
    async (question_id) => {
      setGeneratingAnswer((prev) => ({ ...prev, [question_id]: true }));
      setSubmissionError((prev) => ({ ...prev, [question_id]: null }));
      setGeneratedAnswer((prev) => ({ ...prev, [question_id]: true }));

      try {
        const session = localStorage.getItem("session");
        if (!session) {
          console.error("No session found");
          setSubmissionError((prev) => ({
            ...prev,
            [question_id]: "No session found. Please log in again.",
          }));
          setGeneratedAnswer((prev) => ({ ...prev, [question_id]: false }));
          navigate("/login");
          return;
        }

        const parsedSession = JSON.parse(session);
        const token = parsedSession.token;

        if (!token) {
          console.error("No token found");
          setSubmissionError((prev) => ({
            ...prev,
            [question_id]:
              "No authentication token found. Please log in again.",
          }));
          setGeneratedAnswer((prev) => ({ ...prev, [question_id]: false }));
          navigate("/login");
          return;
        }

        const res = await fetch(
          `${API_BASE_URL}/generate-answers/${question_id}`,
          {
            method: "GET",
            headers: {
              ...NGROK_HEADERS,
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          setAssignedQuestions((prev) =>
            prev.map((q) =>
              q.question_id === question_id
                ? {
                    ...q,
                    answer:
                      data.answer ||
                      data.response ||
                      data.generated_answer ||
                      "Generated answer",
                  }
                : q
            )
          );
          setMatchedArray((prev) =>
            prev.map((q) =>
              q.question_id === question_id
                ? {
                    ...q,
                    answer:
                      data.answer ||
                      data.response ||
                      data.generated_answer ||
                      "Generated answer",
                  }
                : q
            )
          );
          setSubmissionError((prev) => ({
            ...prev,
            [question_id]: null,
          }));
        } else {
          console.error(
            "Failed to generate answer:",
            res.status,
            res.statusText,
            await res.text()
          );
          setGeneratedAnswer((prev) => ({ ...prev, [question_id]: false }));
          let errorMessage = `Failed to generate answer: ${res.status} ${res.statusText}`;
          if (res.status === 403) {
            errorMessage =
              "Permission denied. Please check your account permissions or log in again.";
            navigate("/login");
          } else if (res.status === 401) {
            errorMessage = "Authentication failed. Please log in again.";
            navigate("/login");
          } else if (res.status === 422) {
            errorMessage =
              "Invalid request. Please try again or contact support.";
          }
          setSubmissionError((prev) => ({
            ...prev,
            [question_id]: errorMessage,
          }));
        }
      } catch (err) {
        console.error("Error generating answer:", err);
        setGeneratedAnswer((prev) => ({ ...prev, [question_id]: false }));
        setSubmissionError((prev) => ({
          ...prev,
          [question_id]: "Failed to generate answer. Please try again.",
        }));
      } finally {
        setGeneratingAnswer((prev) => ({ ...prev, [question_id]: false }));
      }
    },
    [API_BASE_URL, navigate]
  );

  const handleNotForMe = useCallback(
    async (question_id) => {
      if (
        submissionStatus[question_id] === "not submitted" ||
        submissionStatus[question_id] === "submitted" ||
        submissionStatus[question_id] === "saved"
      )
        return;

      setSubmissionError((prev) => ({ ...prev, [question_id]: null }));
      try {
        const session = localStorage.getItem("session");
        if (!session) {
          console.error("No session found");
          setSubmissionError((prev) => ({
            ...prev,
            [question_id]: "No session found. Please log in again.",
          }));
          navigate("/login");
          return;
        }

        const parsedSession = JSON.parse(session);
        const token = parsedSession.token;

        if (!token) {
          console.error("No token found");
          setSubmissionError((prev) => ({
            ...prev,
            [question_id]:
              "No authentication token found. Please log in again.",
          }));
          navigate("/login");
          return;
        }

        const res = await fetch(
          `${API_BASE_URL}/submit?question_id=${question_id}&status=not submitted`,
          {
            method: "PATCH",
            headers: {
              ...NGROK_HEADERS,
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          }
        );

        if (res.ok) {
          setSubmissionStatus((prev) => ({
            ...prev,
            [question_id]: "not submitted",
          }));
          setAssignedQuestions((prev) =>
            prev.map((q) =>
              q.question_id === question_id
                ? { ...q, answer: "", status: "not submitted" }
                : q
            )
          );
          setMatchedArray((prev) =>
            prev.map((q) =>
              q.question_id === question_id
                ? { ...q, answer: "", status: "not submitted" }
                : q
            )
          );
          setUnassignedQuesCount((prev) => prev + 1);
          setProcessQuesCount((prev) => prev - 1);
          setSubmissionError((prev) => ({ ...prev, [question_id]: null }));
          await fetchFilterQuestions();
        } else {
          console.error(
            "Failed to mark question as not relevant:",
            res.status,
            res.statusText,
            await res.text()
          );
          let errorMessage = `Failed to mark as Not for Me: ${res.status} ${res.statusText}`;
          if (res.status === 403) {
            errorMessage =
              "Permission denied. Please check your account permissions or log in again.";
            navigate("/login");
          } else if (res.status === 401) {
            errorMessage = "Authentication failed. Please log in again.";
            navigate("/login");
          } else if (res.status === 422) {
            errorMessage =
              "Invalid request. Please try again or contact support.";
          }
          setSubmissionError((prev) => ({
            ...prev,
            [question_id]: errorMessage,
          }));
        }
      } catch (err) {
        console.error("Error marking question as not relevant:", err);
        setSubmissionError((prev) => ({
          ...prev,
          [question_id]: "Failed to mark as Not for Me. Please try again.",
        }));
      }
    },
    [API_BASE_URL, submissionStatus, navigate, fetchFilterQuestions]
  );

  const handleAnswerResponse = (question_id) => {
    setSubmissionStatus((prev) => ({
      ...prev,
      [question_id]: "submitted",
    }));
    setAssignedQuestions((prev) =>
      prev.map((q) =>
        q.question_id === question_id ? { ...q, status: "submitted" } : q
      )
    );

    setMatchedArray((prev) =>
      prev.map((q) =>
        q.question_id === question_id ? { ...q, status: "submitted" } : q
      )
    );
  };

  const handleUpdateSubmit = useCallback(
    async (question_id, answer) => {
      setSubmissionError((prev) => ({ ...prev, [question_id]: null }));
      try {
        const session = localStorage.getItem("session");
        if (!session) {
          console.error("No session found");
          setSubmissionError((prev) => ({
            ...prev,
            [question_id]: "No session found. Please log in again.",
          }));
          navigate("/login");
          return;
        }

        const parsedSession = JSON.parse(session);
        const token = parsedSession.token;

        if (!token) {
          console.error("No token found");
          setSubmissionError((prev) => ({
            ...prev,
            [question_id]:
              "No authentication token found. Please log in again.",
          }));
          navigate("/login");
          return;
        }

        const res = await fetch(
          `${API_BASE_URL}/update-answer/${question_id}`,
          {
            method: "PATCH",
            headers: {
              ...NGROK_HEADERS,
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ answer: answer }),
          }
        );

        if (res.ok) {
          setSubmissionStatus((prev) => ({
            ...prev,
            [question_id]: "submitted",
          }));
          setAssignedQuestions((prev) =>
            prev.map((q) =>
              q.question_id === question_id ? { ...q, status: "submitted" } : q
            )
          );
          setMatchedArray((prev) =>
            prev.map((q) =>
              q.question_id === question_id ? { ...q, status: "submitted" } : q
            )
          );
          setAssignedQuesCount((prev) => prev + 1);
          setProcessQuesCount((prev) => prev - 1);
          setSubmissionError((prev) => ({ ...prev, [question_id]: null }));
          await fetchFilterQuestions();
        } else {
          console.error(
            "Failed to submit question:",
            res.status,
            res.statusText,
            await res.text()
          );
          let errorMessage = `Failed to submit question: ${res.status} ${res.statusText}`;
          if (res.status === 403) {
            errorMessage =
              "Permission denied. Please check your account permissions or log in again.";
            navigate("/login");
          } else if (res.status === 401) {
            errorMessage = "Authentication failed. Please log in again.";
            navigate("/login");
          } else if (res.status === 422) {
            errorMessage =
              "Invalid request. Please try again or contact support.";
          }
          setSubmissionError((prev) => ({
            ...prev,
            [question_id]: errorMessage,
          }));
        }
      } catch (err) {
        console.error("Error submitting question:", err);
        setSubmissionError((prev) => ({
          ...prev,
          [question_id]: "Failed to submit question. Please try again.",
        }));
      }
    },
    [API_BASE_URL, submissionStatus, navigate, fetchFilterQuestions]
  );

  const handleSubmit = useCallback(
    async (question_id, answer) => {
      if (
        submissionStatus[question_id] === "submitted" ||
        submissionStatus[question_id] === "not submitted"
      )
        return;

      setSubmissionError((prev) => ({ ...prev, [question_id]: null }));
      try {
        const session = localStorage.getItem("session");
        if (!session) {
          console.error("No session found");
          setSubmissionError((prev) => ({
            ...prev,
            [question_id]: "No session found. Please log in again.",
          }));
          navigate("/login");
          return;
        }

        const parsedSession = JSON.parse(session);
        const token = parsedSession.token;

        if (!token) {
          console.error("No token found");
          setSubmissionError((prev) => ({
            ...prev,
            [question_id]:
              "No authentication token found. Please log in again.",
          }));
          navigate("/login");
          return;
        }

        const res = await fetch(
          `${API_BASE_URL}/submit?question_id=${question_id}&status=submitted`,
          {
            method: "PATCH",
            headers: {
              ...NGROK_HEADERS,
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ answer: answer }),
          }
        );

        if (res.ok) {
          setSubmissionStatus((prev) => ({
            ...prev,
            [question_id]: "submitted",
          }));
          setAssignedQuestions((prev) =>
            prev.map((q) =>
              q.question_id === question_id
                ? { ...q, status: "submitted", is_submitted: true }
                : q
            )
          );
          setMatchedArray((prev) =>
            prev.map((q) =>
              q.question_id === question_id
                ? { ...q, status: "submitted", is_submitted: true }
                : q
            )
          );
          setAssignedQuesCount((prev) => prev + 1);
          setProcessQuesCount((prev) => prev - 1);
          setSubmissionError((prev) => ({ ...prev, [question_id]: null }));
          await fetchFilterQuestions();
        } else {
          console.error(
            "Failed to submit question:",
            res.status,
            res.statusText,
            await res.text()
          );
          let errorMessage = `Failed to submit question: ${res.status} ${res.statusText}`;
          if (res.status === 403) {
            errorMessage =
              "Permission denied. Please check your account permissions or log in again.";
            navigate("/login");
          } else if (res.status === 401) {
            errorMessage = "Authentication failed. Please log in again.";
            navigate("/login");
          } else if (res.status === 422) {
            errorMessage =
              "Invalid request. Please try again or contact support.";
          }
          setSubmissionError((prev) => ({
            ...prev,
            [question_id]: errorMessage,
          }));
        }
      } catch (err) {
        console.error("Error submitting question:", err);
        setSubmissionError((prev) => ({
          ...prev,
          [question_id]: "Failed to submit question. Please try again.",
        }));
      }
    },
    [API_BASE_URL, submissionStatus, navigate, fetchFilterQuestions]
  );

  const handleAnswerUpdate = useCallback((question_id, newAnswer) => {
    setAssignedQuestions((prev) =>
      prev.map((q) =>
        q.question_id === question_id ? { ...q, answer: newAnswer } : q
      )
    );
    setMatchedArray((prev) =>
      prev.map((q) =>
        q.question_id === question_id ? { ...q, answer: newAnswer } : q
      )
    );
  }, []);

  const fetchResponseVersions = useCallback(
    async (question_id) => {
      setLoadingVersions((prev) => ({ ...prev, [question_id]: true }));
      try {
        const session = localStorage.getItem("session");
        if (!session) {
          console.error("No session found");
          return;
        }

        const parsedSession = JSON.parse(session);
        const token = parsedSession.token;

        if (!token) {
          console.error("No token found");
          return;
        }

        const res = await fetch(
          `${API_BASE_URL}/answers/${question_id}/versions`,
          {
            method: "GET",
            headers: {
              ...NGROK_HEADERS,
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          setResponseVersions((prev) => ({
            ...prev,
            [question_id]: data.versions || [],
          }));
        } else {
          console.error(
            "Failed to fetch response versions:",
            res.status,
            res.statusText
          );
        }
      } catch (err) {
        console.error("Error fetching response versions:", err);
      } finally {
        setLoadingVersions((prev) => ({ ...prev, [question_id]: false }));
      }
    },
    [API_BASE_URL]
  );
  const handleVersionSelect = useCallback((question_id, selectedVersion) => {
    setAssignedQuestions((prev) =>
      prev.map((q) =>
        q.question_id === question_id
          ? { ...q, answer: selectedVersion.answer || "" }
          : q
      )
    );
    setMatchedArray((prev) =>
      prev.map((q) =>
        q.question_id === question_id
          ? { ...q, answer: selectedVersion.answer || "" }
          : q
      )
    );
    setShowVersionDropdown((prev) => ({ ...prev, [question_id]: false }));
  }, []);

  const toggleVersionDropdown = useCallback(
    (question_id) => {
      const isCurrentlyOpen = showVersionDropdown[question_id];
      setShowVersionDropdown((prev) => ({
        ...prev,
        [question_id]: !prev[question_id],
      }));

      if (!isCurrentlyOpen && !responseVersions[question_id]) {
        fetchResponseVersions(question_id);
      }
    },
    [showVersionDropdown, responseVersions, fetchResponseVersions]
  );

  useEffect(() => {
    if (
      assignedQuestions.length > 0 &&
      (userRole === "reviewer" || selfAssignMode)
    ) {
      assignedQuestions.forEach((question) => {
        checkExistingVersions(question.question_id);
      });
    }
  }, [assignedQuestions, userRole, selfAssignMode, checkExistingVersions]);

  const handleUserSelect = useCallback(
    async (qIdx, usersToAssign) => {
      if (!pdfDetails?.questions?.[qIdx] || !usersToAssign.length) return;

      const session = localStorage.getItem("session");
      if (!session) {
        console.error("No session found");
        setAssignStatus((prev) => {
          const updated = [...prev];
          updated[qIdx] = "Assignment failed: No session";
          return updated;
        });
        return;
      }

      const token = JSON.parse(session).token;
      const question = pdfDetails.questions[qIdx];

      try {
        setAssignDropdown(null);

        const res = await fetch(`${API_BASE_URL}/assign-reviewer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({
            user_id: usersToAssign.map((u) => u.user_id),
            ques_ids: [question.id],
            file_id: pdfDetails.id,
            status: "assign",
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Server responded with ${res.status}: ${errorText}`);
        }

        if (selectedPdf) {
          fetchFilterData(selectedPdf.id);
        }
        const newUsernames = usersToAssign.map((u) => u.username);
        setAssignStatus((prev) => {
          const updated = [...prev];
          const existing =
            typeof updated[qIdx] === "string" ? updated[qIdx] : "";
          const match = existing.match(/Assigned to (.*)/);
          const existingUsers = match
            ? match[1].split(",").map((u) => u.trim())
            : [];
          const allUsers = Array.from(
            new Set([...existingUsers, ...newUsernames])
          );
          updated[qIdx] = `Assigned to ${allUsers.join(", ")}`;
          return updated;
        });

        setSelectedReviewers((prev) => ({
          ...prev,
          [qIdx]: usersToAssign,
        }));

        if (selectedPdf?.id) {
          localStorage.setItem(
            `assignStatus_${selectedPdf.id}`,
            JSON.stringify(assignStatus)
          );
          localStorage.setItem(
            `selectedReviewers_${selectedPdf.id}`,
            JSON.stringify({
              ...selectedReviewers,
              [qIdx]: usersToAssign,
            })
          );
        }

        fetch(`${API_BASE_URL}/send-assignment-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({
            user_id: usersToAssign.map((u) => u.user_id),
            ques_ids: [question.id],
          }),
        }).catch((err) => {
          console.error("Notification failed (non-critical):", err);
        });
      } catch (err) {
        console.error("Assignment failed:", err);
        setAssignStatus((prev) => ({
          ...prev,
          [qIdx]: `Error: ${err.message}`,
        }));
      }
    },
    [pdfDetails, API_BASE_URL, selectedPdf, assignStatus, selectedReviewers]
  );

  useEffect(() => {
    const fetchAssignedReviewers = async () => {
      if (!selectedPdf?.id || !pdfDetails?.questions) return;

      try {
        const session = localStorage.getItem("session");
        const token = session ? JSON.parse(session).token : null;

        const res = await fetch(
          `${API_BASE_URL}/assigned-reviewers/${selectedPdf.id}`,
          {
            headers: {
              ...NGROK_HEADERS,
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          updateReviewersState(data, pdfDetails.questions);
        }
      } catch (err) {
        console.error("Failed to fetch reviewers:", err);
      }
    };

    fetchAssignedReviewers();
  }, [selectedPdf, pdfDetails]);

  const handleDeletePdf = useCallback(
    async (rfpId) => {
      setIsConfirmOpen(true);
      setRfpToDelete(rfpId);
    },
    [setRfpToDelete]
  );

  const handleAiAnalysisPdf = useCallback(async (rfpId) => {
    setAiAnalysisLoading(true);
    setCurrentAnalyzingPdfId(rfpId);
    try {
      const session = localStorage.getItem("session");
      if (!session) {
        console.error("No session found");
        setToasterNotification({
          message: "Error: No session found.",
          type: "error",
        });
        setAiAnalysisLoading(false);
        return;
      }
      const parsedSession = JSON.parse(session);
      const token = parsedSession.token;

      if (!token) {
        console.error("No token found");
        setToasterNotification({
          message: "Error: No token found.",
          type: "error",
        });
        setAiAnalysisLoading(false);
        return;
      }

      const headers = {
        accept: "application/json",
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const response = await fetch(
        `${API_BASE_URL}/admin/analyze-answers?rfp_id=${rfpId}`,
        {
          method: "POST",
          headers,
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAiAnalysisResults((prev) => ({ ...prev, [rfpId]: data }));
        localStorage.setItem(
          `aiAnalysisResults_${rfpId}`,
          JSON.stringify(data)
        );
        setToasterNotification({
          message: "AI analysis completed successfully.",
          type: "success",
        });
        setAiAnalysisLoading(false);
      } else {
        const errorData = await response.json();
        console.error(
          "Failed to start AI analysis:",
          response.status,
          response.statusText,
          errorData
        );
        setToasterNotification({
          message: `Some questions do not have any submitted answers yet.`,
          type: "error",
        });
        setAiAnalysisLoading(false);
      }
    } catch (err) {
      console.error("Error starting AI analysis:", err);
      setToasterNotification({
        message: "An unexpected error occurred while starting AI analysis.",
        type: "error",
      });
      setAiAnalysisLoading(false);
    }
  }, []);

  const handleGenerateDoc = useCallback(async (rfpId) => {
    try {
      const session = localStorage.getItem("session");
      if (!session) {
        console.error("No session found");
        setToasterNotification({
          message: "Error: No session found.",
          type: "error",
        });
        setAiAnalysisLoading(false);
        return;
      }
      const parsedSession = JSON.parse(session);
      const token = parsedSession.token;

      if (!token) {
        console.error("No token found");
        setToasterNotification({
          message: "Error: No token found.",
          type: "error",
        });
        setAiAnalysisLoading(false);
        return;
      }

      const headers = {
        accept: "application/json",
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const response = await fetch(
        `${API_BASE_URL}/generate-rfp-doc/?rfp_id=${rfpId}`,
        {
          method: "POST",
          headers,
        }
      );

      if (response.ok) {
        const data = await response.json();

        setToasterNotification({
          message: "Doc Generated successfully.",
          type: "success",
        });
        setAiAnalysisLoading(false);
      } else {
        const errorData = await response.json();
        console.error(
          "Failed to start AI analysis:",
          response.status,
          response.statusText,
          errorData
        );
        setToasterNotification({
          message: `Some questions do not have any submitted answers yet.`,
          type: "error",
        });
        setAiAnalysisLoading(false);
      }
    } catch (err) {
      console.error("Error starting AI analysis:", err);
      setToasterNotification({
        message: "An unexpected error occurred while starting AI analysis.",
        type: "error",
      });
      setAiAnalysisLoading(false);
    }
  }, []);

  const confirmDelete = useCallback(async () => {
    setIsConfirmOpen(false);
    if (rfpToDelete) {
      try {
        const session = localStorage.getItem("session");
        if (!session) {
          console.error("No session found");
          setDeleteMessage("Error: No session found.");
          return;
        }
        const parsedSession = JSON.parse(session);
        const token = parsedSession.token;

        if (!token) {
          console.error("No token found");
          setDeleteMessage("Error: No token found.");
          return;
        }

        const headers = {
          accept: "application/json",
          "ngrok-skip-browser-warning": "true",
          Authorization: `Bearer ${token}`,
        };

        const response = await fetch(`${API_BASE_URL}/rfp/${rfpToDelete}`, {
          method: "DELETE",
          headers,
        });

        if (response.ok) {
          if (typeof setPdfList === "function") {
            setPdfList((prev) => prev.filter((pdf) => pdf.id !== rfpToDelete));
          } else {
            console.error("setPdfList is not a function");
            setDeleteMessage("Error: Unable to update document list.");
            return;
          }
          if (selectedPdf && selectedPdf.id === rfpToDelete) {
            setSelectedPdf(null);
            setPdfDetails(null);
          }
          setDeleteMessage(
            "RFP document and all related data deleted successfully."
          );
          setTimeout(() => setDeleteMessage(""), 3000);
        } else {
          const errorData = await response.json();
          console.error(
            "Failed to delete PDF:",
            response.status,
            response.statusText,
            errorData
          );
          setDeleteMessage(
            `Error: Failed to delete PDF (Status: ${response.status} - ${response.statusText})`
          );
        }
      } catch (err) {
        console.error("Error deleting PDF:", err);
        setDeleteMessage(
          "Error: An unexpected error occurred while deleting the PDF."
        );
      }
    }
    setRfpToDelete(null);
  }, [selectedPdf, setPdfList, setSelectedPdf, setPdfDetails, rfpToDelete]);

  const cancelDelete = useCallback(() => {
    setIsConfirmOpen(false);
    setRfpToDelete(null);
  }, []);

  useEffect(() => {
    setSelectedPdf(null);
  }, [pageType]);

  const handleEditSave = useCallback(
    async (question_id, newAnswer) => {
      try {
        const session = localStorage.getItem("session");
        if (!session) {
          console.error("No session found");

          return;
        }

        const parsedSession = JSON.parse(session);
        const token = parsedSession.token;

        if (!token) {
          console.error("No token found");

          return;
        }

        const res = await fetch(`${API_BASE_URL}/admin/edit-answer`, {
          method: "PATCH",
          headers: {
            ...NGROK_HEADERS,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question_id: question_id, answer: newAnswer }),
        });

        if (res.ok) {
          setSubmittedQuestions((prev) =>
            prev.map((q) =>
              q.question_id === question_id ? { ...q, answer: newAnswer } : q
            )
          );
          setIsEditModalOpen(false);
          setQuestionToEdit(null);
        } else {
          console.error(
            "Failed to update answer from dialog:",
            res.status,
            res.statusText,
            await res.text()
          );
        }
      } catch (err) {
        console.error("Error saving answer from dialog:", err);
      }
    },
    [API_BASE_URL]
  );

  const handleSendReview = useCallback(
    async (question) => {
      try {
        setLoadingReassign((prev) => ({
          ...prev,
          [question.question_id]: true,
        }));

        const session = localStorage.getItem("session");
        if (!session) {
          console.error("No session found");
          return;
        }

        const parsedSession = JSON.parse(session);
        const token = parsedSession.token;

        if (!token) {
          console.error("No token found");
          return;
        }

        const res = await fetch(`${API_BASE_URL}/reassign`, {
          method: "POST",
          headers: {
            ...NGROK_HEADERS,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: question.user_id,
            ques_id: question.question_id,
            file_id: question.file_id,
          }),
        });

        if (res.ok) {
          setToasterNotification({
            message: "Question has been sent back for further review.",
            type: "success",
          });
        } else {
          console.error(
            "Failed:",
            res.status,
            res.statusText,
            await res.text()
          );
        }
      } catch (err) {
        setToasterNotification({
          message: "Failed to send back for further review. Please try again.",
          type: "error",
        });
        console.error("Error:", err);
      } finally {
        setLoadingReassign((prev) => ({
          ...prev,
          [question.question_id]: false,
        }));
      }
    },
    [API_BASE_URL]
  );

  if (initialLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div
          className={`p-8 rounded-xl shadow-2xl text-center transition-colors ${
            isDarkMode
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-gray-200"
          }`}
        >
          <div className="mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto"></div>
          </div>
          <h2
            className={`text-2xl font-bold mb-2 transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            📄 RFP Response Generator
          </h2>
          <p
            className={`mb-4 transition-colors ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Loading your dashboard...
          </p>
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  const handleButtonClick = (questionId) => {
    setShowInput((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handlePromptSubmit = async (data) => {
    setLoadingsend((prev) => ({ ...prev, [data.question_id]: true }));

    const session = localStorage.getItem("session");
    if (!session) {
      console.error("No session found");
      return;
    }

    const parsedSession = JSON.parse(session);
    const token = parsedSession.token;
    if (!token) {
      console.error("No token found");
      return;
    }

    const payload = {
      ques_id: data.question_id,
      chat_message: inputValue,
      user_id: data.user_id,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/questions/chat_input`, {
        method: "POST",
        headers: {
          ...NGROK_HEADERS,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const chatResponse = await res.json();

      if (chatResponse?.new_answer_version?.answer) {
        const newAnswer = chatResponse.new_answer_version.answer;
        setLoadingsend((prev) => ({ ...prev, [data.question_id]: false }));
        setShowInput((prev) => ({
          ...prev,
          [data.question_id]: false,
        }));
        setInputValue("");
        setAssignedQuestions((prev) =>
          prev.map((q) =>
            q.question_id === data.question_id ? { ...q, answer: newAnswer } : q
          )
        );

        setMatchedArray((prev) =>
          prev.map((q) =>
            q.question_id === data.question_id ? { ...q, answer: newAnswer } : q
          )
        );

        setResponseVersions((prev) => ({
          ...prev,
          [data.question_id]: [newAnswer, ...(prev[data.question_id] || [])],
        }));

        setSubmissionStatus((prev) => ({
          ...prev,
          [data.question_id]: "saved",
        }));

        setSubmissionError((prev) => ({
          ...prev,
          [data.question_id]: null,
        }));
      } else {
        await checkExistingVersions(data.question_id);
      }
    } catch (error) {
      console.error("Error submitting chat prompt:", error);
      setSubmissionError((prev) => ({
        ...prev,
        [data.question_id]: "Failed to submit. Please try again.",
      }));
    }
  };

  if (userRole === "reviewer" || selfAssignMode) {
    return (
      <div
        className={`min-h-screen p-4 transition-colors ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          {selfAssignMode && (
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1
                  className={`text-3xl font-bold mb-2 flex items-center gap-3 transition-colors ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  <span className="text-4xl">👤</span>
                  My Questions - Assigned to me to review and approve
                </h1>
                <p
                  className={`transition-colors ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Assign questions to yourself as a reviewer
                </p>
              </div>
            </div>
          )}

          {isLoadingQuestions ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span
                className={`ml-3 transition-colors ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Loading question status...
              </span>
            </div>
          ) : errorQuestions ? (
            <div
              className={`p-3 rounded-lg text-sm bg-red-100 text-red-700 border border-red-200 ${
                isDarkMode ? "bg-red-900/30 text-red-300 border-red-700" : ""
              }`}
            >
              {errorQuestions}
            </div>
          ) : (
            <div>
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
                      Submitted: {assignedQuesCount}
                    </option>
                    <option value="not submitted">
                      Not Submitted: {unassignedQuesCount}
                    </option>
                    <option value="process">Process: {processQuesCount}</option>
                    <option value="all">
                      Total Questions: {totalQuestionsCount}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          )}
          <div className="p-6 rounded-xl shadow-xl mb-6 transition-colors bg-gray-800 border border-gray-600">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
              <h2
                className={`text-xl font-semibold transition-colors ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Questions for Current Project
              </h2>
              {filterStatus === "all" ? (
                <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs">
                  {selectedPdf
                    ? matchedArray.filter(
                        (q) => q.rfp_id === selectedPdf.rfp_id
                      ).length
                    : totalQuestionsCount}{" "}
                  questions
                </span>
              ) : filterStatus === "submitted" ? (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Submitted:{" "}
                  <span className="font-bold text-sm">
                    {selectedPdf
                      ? matchedArray.filter(
                          (q) =>
                            q.rfp_id === selectedPdf.rfp_id && q.is_submitted
                        ).length
                      : assignedQuesCount}
                  </span>
                </span>
              ) : filterStatus === "not submitted" ? (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                  Not for me:{" "}
                  <span className="font-bold text-sm">
                    {selectedPdf
                      ? matchedArray.filter(
                          (q) =>
                            q.rfp_id === selectedPdf.rfp_id &&
                            q.submit_status === "not submitted"
                        ).length
                      : unassignedQuesCount}
                  </span>
                </span>
              ) : filterStatus === "process" ? (
                <span
                  className={`bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${
                    filterStatus === "process" ? "ring-2 ring-gray-500" : ""
                  }`}
                  onClick={() => handleFilterClick("process")}
                >
                  Pending:{" "}
                  <span className="font-bold text-sm">
                    {selectedPdf
                      ? matchedArray.filter(
                          (q) =>
                            q.rfp_id === selectedPdf.rfp_id &&
                            q.submit_status === "process"
                        ).length
                      : processQuesCount}
                  </span>
                </span>
              ) : null}
            </div>

            {pdfLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
                <span
                  className={`ml-3 transition-colors ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Loading documents...
                </span>
              </div>
            ) : matchedArray && matchedArray.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-5">
                  {matchedArray
                    .filter(
                      (pdf, index, self) =>
                        self.findIndex((p) => p.rfp_id === pdf.rfp_id) === index
                    )
                    .map((pdf, idx) => (
                      <div
                        key={pdf.rfp_id}
                        className={`rounded-lg p-4 cursor-pointer transition-all hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 group ${
                          isDarkMode
                            ? "bg-gray-700 border border-gray-600 hover:bg-gray-650"
                            : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                        } ${
                          selectedPdf && selectedPdf.rfp_id === pdf.rfp_id
                            ? `ring-2 ring-purple-500 border-purple-500 ${
                                isDarkMode ? "bg-gray-650" : "bg-gray-100"
                              }`
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedPdf(pdf);
                          setTimeout(() => {
                            documentAnalysisRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }, 100);
                        }}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3 transition-colors">
                            <span className="text-purple-400 text-xl">📄</span>
                          </div>
                          <h3
                            className={`font-semibold mb-2 truncate w-full text-sm transition-colors ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                            title={pdf.filename}
                          >
                            {pdf.filename}
                          </h3>
                          <p
                            className={`text-xs mb-3 transition-colors ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {pdf.assigned_at &&
                              new Date(pdf.assigned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
                {selectedPdf !== null && (
                  <div className="space-y-3">
                    {matchedArray
                      .filter((question) =>
                        selectedPdf
                          ? question.rfp_id === selectedPdf.rfp_id
                          : true
                      )
                      .filter((question) => {
                        if (filterStatus === "all") return true;
                        if (filterStatus === "submitted")
                          return question.is_submitted;
                        if (filterStatus === "not submitted")
                          return question.submit_status === "not submitted";
                        if (filterStatus === "process")
                          return question.submit_status === "process";
                        return true;
                      })
                      .map((question, idx) => (
                        <div
                          key={question.question_id}
                          className={`rounded-lg overflow-hidden transition-colors ${
                            isDarkMode
                              ? question.is_submitted
                                ? "bg-green-900/20 border border-green-700/50"
                                : "bg-gray-700 border border-gray-600"
                              : question.is_submitted
                              ? "bg-green-100/50 border border-green-300"
                              : "bg-gray-50 border border-gray-200"
                          }`}
                        >
                          <div
                            className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                              isDarkMode
                                ? "hover:bg-gray-650"
                                : "hover:bg-gray-100"
                            }`}
                            onClick={() => {
                              setExpandedQuestion(
                                expandedQuestion === idx ? null : idx
                              );
                              if (question.is_submitted && question.answer_id) {
                                handleAnswerResponse(question.question_id);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <span className="text-purple-400">
                                Q {question.question_text.split(" ")[0]}
                              </span>
                              <span
                                className={`font-medium text-sm leading-relaxed transition-colors ${
                                  isDarkMode ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {question.question_text.substring(
                                  question.question_text.indexOf(" ") + 1
                                )}
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
                                    isDarkMode
                                      ? "text-gray-300"
                                      : "text-gray-700"
                                  }`}
                                >
                                  Your Response:
                                </label>
                                <textarea
                                  className={`w-full p-3 rounded-lg transition-colors resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 ${
                                    isDarkMode
                                      ? "bg-gray-800 border border-gray-600 text-white placeholder-gray-400"
                                      : "bg-white border border-gray-300 text-gray-900 placeholder-gray-500"
                                  } ${
                                    !editingAnswer[question.question_id]
                                      ? "cursor-not-allowed opacity-75"
                                      : "cursor-text"
                                  }`}
                                  placeholder="Type your detailed answer here..."
                                  rows="8"
                                  value={question.answer || ""}
                                  onChange={(e) =>
                                    handleAnswerUpdate(
                                      question.question_id,
                                      e.target.value
                                    )
                                  }
                                  disabled={
                                    !editingAnswer[question.question_id]
                                  }
                                />
                              </div>
                              {showInput[question.question_id] && (
                                <div className="flex items-center gap-2 mt-2 py-2">
                                  <input
                                    type="text"
                                    value={inputValue || ""}
                                    onChange={(e) => handleInputChange(e)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handlePromptSubmit(question);
                                      }
                                    }}
                                    className="border border-gray-300 px-3 py-2 rounded-md w-full"
                                    placeholder="Type Your Prompt..."
                                  />
                                  <button
                                    onClick={() => handlePromptSubmit(question)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md flex items-center justify-center"
                                  >
                                    {loadingsend[question.question_id] ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                      <Send size={16} />
                                    )}
                                  </button>
                                </div>
                              )}
                              {submissionError[question.question_id] && (
                                <div className="mb-4 text-red-500 text-sm">
                                  {submissionError[question.question_id]}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  {submissionStatus[question.question_id] &&
                                    !editingAnswer[question.question_id] && (
                                      <div
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                          submissionStatus[
                                            question.question_id
                                          ] === "submitted"
                                            ? "bg-gray-400 cursor-not-allowed opacity-50"
                                            : submissionStatus[
                                                question.question_id
                                              ] === "saved"
                                            ? "bg-gray-400 cursor-not-allowed opacity-50"
                                            : "bg-blue-600 hover:bg-blue-700 text-white"
                                        }`}
                                      >
                                        {submissionStatus[
                                          question.question_id
                                        ] === "submitted"
                                          ? "✅ Answer Submitted"
                                          : submissionStatus[
                                              question.question_id
                                            ] === "saved"
                                          ? "💾 Answer Saved"
                                          : "❌ Submitted as Not for Me"}
                                      </div>
                                    )}
                                  {submissionStatus[question.question_id] ===
                                    "submitted" && (
                                    <button
                                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                        editingAnswer[question.question_id]
                                          ? "bg-orange-600 hover:bg-orange-700 text-white"
                                          : "bg-orange-600 hover:bg-orange-700 text-white"
                                      }`}
                                      onClick={() => {
                                        setEditingAnswer((prev) => ({
                                          ...prev,
                                          [question.question_id]: true,
                                        }));
                                      }}
                                      type="button"
                                      title="Continue editing your answer"
                                    >
                                      <span>✏️</span>
                                      Continue Editing
                                    </button>
                                  )}

                                  {editingAnswer[question.question_id] &&
                                    submissionStatus[question.question_id] ===
                                      "submitted" && (
                                      <button
                                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => {
                                          handleUpdateSubmit(
                                            question.question_id,
                                            question.answer
                                          );
                                          setEditingAnswer((prev) => ({
                                            ...prev,
                                            [question.question_id]: false,
                                          }));
                                        }}
                                        type="button"
                                        title="Submit your answer"
                                      >
                                        <span>✅</span>
                                        Submit
                                      </button>
                                    )}
                                  {submissionStatus[question.question_id] ===
                                    "submitted" && (
                                    <>
                                      <button
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                        onClick={() =>
                                          handleAnalyzeQuestion(question)
                                        }
                                        type="button"
                                        disabled={
                                          aiAnalysisLoading &&
                                          currentAnalyzingId ===
                                            question.question_id
                                        }
                                      >
                                        {aiAnalysisLoading &&
                                        currentAnalyzingId ===
                                          question.question_id ? (
                                          <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                            Analyzing...
                                          </div>
                                        ) : (
                                          "AI Analysis"
                                        )}
                                      </button>
                                      {analysisResult[question.question_id] && (
                                        <div className="mb-3 p-3 bg-gray-100 rounded-lg shadow-sm border text-sm">
                                          <div>
                                            <strong>Score:</strong>{" "}
                                            {
                                              analysisResult[
                                                question.question_id
                                              ].score
                                            }
                                          </div>
                                          <div>
                                            <strong>Question:</strong>{" "}
                                            {
                                              analysisResult[
                                                question.question_id
                                              ].question_text
                                            }
                                          </div>
                                          <div>
                                            <strong>Answer:</strong>{" "}
                                            {
                                              analysisResult[
                                                question.question_id
                                              ].answer
                                            }
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {(!submissionStatus[question.question_id] ||
                                    submissionStatus[question.question_id] ===
                                      "saved") &&
                                    generatedAnswer[question.question_id] && (
                                      <button
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                          submissionStatus[
                                            question.question_id
                                          ] === "submitted"
                                            ? "bg-gray-400 cursor-not-allowed opacity-50"
                                            : editingAnswer[
                                                question.question_id
                                              ]
                                            ? "bg-green-600 hover:bg-green-700 text-white"
                                            : "bg-orange-600 hover:bg-orange-700 text-white"
                                        }`}
                                        onClick={() =>
                                          submissionStatus[
                                            question.question_id
                                          ] !== "submitted" &&
                                          submissionStatus[
                                            question.question_id
                                          ] !== "not submitted" &&
                                          handleEditAnswer(question.question_id)
                                        }
                                        disabled={
                                          submissionStatus[
                                            question.question_id
                                          ] === "submitted" ||
                                          submissionStatus[
                                            question.question_id
                                          ] === "not submitted"
                                        }
                                        type="button"
                                        title={
                                          submissionStatus[
                                            question.question_id
                                          ] === "submitted" ||
                                          submissionStatus[
                                            question.question_id
                                          ] === "not submitted"
                                            ? "Cannot edit submitted answers"
                                            : "Edit generated answer"
                                        }
                                      >
                                        <span>
                                          {editingAnswer[question.question_id]
                                            ? "💾"
                                            : "✏️"}
                                        </span>
                                        {editingAnswer[question.question_id]
                                          ? "Save"
                                          : "Edit Answer"}
                                      </button>
                                    )}
                                  {!submissionStatus[question.question_id] && (
                                    <button
                                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                        generatingAnswer[question.question_id]
                                          ? "bg-gray-400 cursor-not-allowed opacity-50"
                                          : "bg-purple-600 hover:bg-purple-700 text-white"
                                      }`}
                                      onClick={() =>
                                        !submissionStatus[
                                          question.question_id
                                        ] &&
                                        handleGenerateAnswer(
                                          question.question_id
                                        )
                                      }
                                      disabled={
                                        !!submissionStatus[
                                          question.question_id
                                        ] ||
                                        generatingAnswer[question.question_id]
                                      }
                                      type="button"
                                    >
                                      {generatingAnswer[
                                        question.question_id
                                      ] ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                          Generating...
                                        </>
                                      ) : (
                                        <>
                                          <span>🤖</span>
                                          Generate
                                        </>
                                      )}
                                    </button>
                                  )}

                                  {(!submissionStatus[question.question_id] ||
                                    submissionStatus[question.question_id] ===
                                      "saved") &&
                                    generatedAnswer[question.question_id] && (
                                      <button
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                          submissionStatus[
                                            question.question_id
                                          ] === "submitted"
                                            ? "bg-gray-400 cursor-not-allowed opacity-50"
                                            : "bg-green-600 hover:bg-green-700 text-white"
                                        }`}
                                        type="button"
                                        title={
                                          submissionStatus[
                                            question.question_id
                                          ] === "submitted"
                                            ? "Question already submitted"
                                            : "Submit your answer"
                                        }
                                        onClick={() =>
                                          handleButtonClick(
                                            question.question_id
                                          )
                                        }
                                      >
                                        <span>✏️</span>
                                        Chat Prompt
                                      </button>
                                    )}
                                  {(userRole === "reviewer" ||
                                    selfAssignMode) &&
                                    generatedAnswer[question.question_id] &&
                                    (!submissionStatus[question.question_id] ||
                                      submissionStatus[question.question_id] ===
                                        "saved") && (
                                      <div className="relative">
                                        <div className="flex items-center gap-2">
                                          <button
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                              loadingVersions[
                                                question.question_id
                                              ]
                                                ? "bg-gray-400 cursor-not-allowed opacity-50"
                                                : "bg-blue-600 hover:bg-blue-700 text-white"
                                            }`}
                                            onClick={() =>
                                              toggleVersionDropdown(
                                                question.question_id
                                              )
                                            }
                                            disabled={
                                              loadingVersions[
                                                question.question_id
                                              ]
                                            }
                                            type="button"
                                          >
                                            {loadingVersions[
                                              question.question_id
                                            ] ? (
                                              <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Loading...
                                              </>
                                            ) : (
                                              <>
                                                <span>📝</span>
                                                Versions
                                                {responseVersions[
                                                  question.question_id
                                                ] &&
                                                  responseVersions[
                                                    question.question_id
                                                  ].length > 0 && (
                                                    <span className="ml-1 bg-white text-blue-600 px-1.5 py-0.5 rounded-full text-xs">
                                                      {
                                                        responseVersions[
                                                          question.question_id
                                                        ].length
                                                      }
                                                    </span>
                                                  )}
                                                <span className="ml-2">
                                                  {showVersionDropdown[
                                                    question.question_id
                                                  ]
                                                    ? "▲"
                                                    : "▼"}
                                                </span>
                                              </>
                                            )}
                                          </button>
                                          {(!submissionStatus[
                                            question.question_id
                                          ] ||
                                            submissionStatus[
                                              question.question_id
                                            ] === "saved") &&
                                            generatedAnswer[
                                              question.question_id
                                            ] &&
                                            question.answer &&
                                            question.answer.trim() !== "" && (
                                              <button
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                                  submissionStatus[
                                                    question.question_id
                                                  ] === "submitted"
                                                    ? "bg-gray-400 cursor-not-allowed opacity-50"
                                                    : "bg-green-600 hover:bg-green-700 text-white"
                                                }`}
                                                onClick={() =>
                                                  submissionStatus[
                                                    question.question_id
                                                  ] !== "submitted" &&
                                                  submissionStatus[
                                                    question.question_id
                                                  ] !== "not submitted" &&
                                                  handleSubmit(
                                                    question.question_id
                                                  )
                                                }
                                                disabled={
                                                  submissionStatus[
                                                    question.question_id
                                                  ] === "submitted" ||
                                                  submissionStatus[
                                                    question.question_id
                                                  ] === "not submitted"
                                                }
                                                type="button"
                                                title={
                                                  submissionStatus[
                                                    question.question_id
                                                  ] === "submitted"
                                                    ? "Question already submitted"
                                                    : "Submit your answer"
                                                }
                                              >
                                                <span>✅</span>
                                                Submit
                                              </button>
                                            )}
                                        </div>
                                      </div>
                                    )}
                                  {(!submissionStatus[question.question_id] ||
                                    submissionStatus[question.question_id] ===
                                      "saved") &&
                                    !generatedAnswer[question.question_id] && (
                                      <button
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white`}
                                        onClick={() =>
                                          handleNotForMe(question.question_id)
                                        }
                                        disabled={
                                          submissionStatus[
                                            question.question_id
                                          ] === "submitted" ||
                                          submissionStatus[
                                            question.question_id
                                          ] === "not submitted"
                                        }
                                        type="button"
                                        title="Mark as Not for Me"
                                      >
                                        <span>❌</span>
                                        Not for Me
                                      </button>
                                    )}
                                </div>
                                {showVersionDropdown[question.question_id] &&
                                  responseVersions[question.question_id] &&
                                  responseVersions[question.question_id]
                                    .length > 0 && (
                                    <div
                                      className={`mt-2 w-full rounded-lg shadow-lg border transition-all duration-300 ${
                                        isDarkMode
                                          ? "bg-gray-800 border-gray-600"
                                          : "bg-white border-gray-200"
                                      }`}
                                    >
                                      <div
                                        className={`p-2 border-b ${
                                          isDarkMode
                                            ? "border-gray-600"
                                            : "border-gray-200"
                                        }`}
                                      >
                                        <span
                                          className={`text-sm font-medium ${
                                            isDarkMode
                                              ? "text-gray-300"
                                              : "text-gray-700"
                                          }`}
                                        >
                                          Generated Responses (
                                          {
                                            responseVersions[
                                              question.question_id
                                            ].length
                                          }
                                          )
                                        </span>
                                      </div>
                                      <div className="max-h-60 overflow-y-auto">
                                        {responseVersions[
                                          question.question_id
                                        ].map((version, versionIdx) => (
                                          <div
                                            key={version.id}
                                            className={`p-3 cursor-pointer transition-colors border-b last:border-b-0 ${
                                              isDarkMode
                                                ? "hover:bg-gray-700 border-gray-600"
                                                : "hover:bg-gray-50 border-gray-200"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <span
                                                className={`text-xs font-medium ${
                                                  isDarkMode
                                                    ? "text-gray-400"
                                                    : "text-gray-500"
                                                }`}
                                              >
                                                Version {versionIdx + 1} (ID:{" "}
                                                {version.id})
                                              </span>
                                              <div className="flex items-center gap-2">
                                                {version.generated_at && (
                                                  <span
                                                    className={`text-xs ${
                                                      isDarkMode
                                                        ? "text-gray-500"
                                                        : "text-gray-400"
                                                    }`}
                                                  >
                                                    {new Date(
                                                      version.generated_at
                                                    ).toLocaleString()}
                                                  </span>
                                                )}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(
                                                      version.answer || ""
                                                    );
                                                  }}
                                                  className={`text-xs px-2 py-1 rounded ${
                                                    isDarkMode
                                                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                  }`}
                                                >
                                                  Copy
                                                </button>
                                              </div>
                                            </div>

                                            <p
                                              className={`text-sm ${
                                                isDarkMode
                                                  ? "text-gray-300"
                                                  : "text-gray-600"
                                              }`}
                                            >
                                              {version.answer ||
                                                "No content available"}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    {matchedArray.filter((question) =>
                      selectedPdf
                        ? question.rfp_id === selectedPdf.rfp_id
                        : true
                    ).length === 0 && (
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
                          {selectedPdf
                            ? "No questions assigned for this document"
                            : "No questions assigned yet"}
                        </p>
                        <p
                          className={`text-sm mt-1 transition-colors ${
                            isDarkMode ? "text-gray-500" : "text-gray-500"
                          }`}
                        >
                          {selectedPdf
                            ? "Select another document or check back later"
                            : "Check back later for new assignments"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
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
                    📄
                  </span>
                </div>
                <p
                  className={`text-lg transition-colors ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  No documents uploaded yet
                </p>
                <p
                  className={`text-sm mt-1 transition-colors ${
                    isDarkMode ? "text-gray-500" : "text-gray-500"
                  }`}
                >
                  Upload your first RFP document to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`p-4 transition-colors ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-1">
            {pageType === "home" ? (
              <h1
                className={`text-3xl font-bold mb-2 flex items-center gap-3 transition-colors ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                <span className="text-4xl">📄</span>
                RFP Response Generator
              </h1>
            ) : (
              <h1
                className={`text-3xl font-bold mb-2 flex items-center gap-3 transition-colors ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                <span className="text-4xl">✅</span>
                Edit and Approve Responses
              </h1>
            )}
            <p
              className={`transition-colors ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Manage and analyze your RFP documents with AI-powered insights
            </p>
          </div>

          {location.pathname === "/submitted-questions" ? (
            <>
              <div
                className={`p-6 rounded-xl shadow-xl mb-6 transition-colors ${
                  isDarkMode
                    ? "bg-gray-800 border border-gray-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                  <h2
                    className={`text-xl font-semibold transition-colors ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Document Library
                  </h2>
                </div>
                {pdfLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
                    <span
                      className={`ml-3 transition-colors ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Loading documents...
                    </span>
                  </div>
                ) : pdfList && pdfList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {pdfList.map((pdf, idx) => (
                      <div
                        key={pdf.id}
                        className={`rounded-lg p-4 cursor-pointer transition-all hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 group ${
                          isDarkMode
                            ? "bg-gray-700 border border-gray-600 hover:bg-gray-650"
                            : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                        } ${
                          selectedPdf && selectedPdf.id === pdf.id
                            ? `ring-2 ring-purple-500 border-purple-500 ${
                                isDarkMode ? "bg-gray-650" : "bg-gray-100"
                              }`
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedPdf(pdf);

                          setTimeout(() => {
                            documentAnalysisRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }, 100);
                        }}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-500/30 transition-colors">
                            <span className="text-purple-400 text-xl">📄</span>
                          </div>
                          <h3
                            className={`font-semibold mb-2 truncate w-full text-sm transition-colors ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                            title={pdf.filename}
                          >
                            {pdf.filename}
                          </h3>
                          <p
                            className={`text-xs mb-3 transition-colors ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {pdf.uploaded_at &&
                              new Date(pdf.uploaded_at).toLocaleDateString()}
                          </p>
                          {aiAnalysisResults[pdf.id] && (
                            <div className="mb-3 p-2 bg-blue-100 text-blue-800 rounded-lg text-xs">
                              <p>
                                Overall Score:{" "}
                                <strong>
                                  {aiAnalysisResults[pdf.id].overall_score}
                                </strong>
                              </p>
                              <p>
                                Questions Analyzed:{" "}
                                <strong>
                                  {
                                    aiAnalysisResults[pdf.id]
                                      .total_answers_analyzed
                                  }{" "}
                                  / {aiAnalysisResults[pdf.id].total_questions}
                                </strong>
                              </p>
                              {aiAnalysisResults[pdf.id].section_scores &&
                                aiAnalysisResults[pdf.id].section_scores
                                  .length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-blue-200">
                                    <p className="font-semibold mb-1">
                                      Section Scores:
                                    </p>
                                    {aiAnalysisResults[
                                      pdf.id
                                    ].section_scores.map((section, sIdx) => (
                                      <p key={sIdx} className="ml-2">
                                        - {section.section}:{" "}
                                        <strong>{section.score}</strong>
                                      </p>
                                    ))}
                                  </div>
                                )}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <span className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                              Check Responses
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAiAnalysisPdf(pdf.id);
                              }}
                              className={`bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                aiAnalysisLoading &&
                                currentAnalyzingPdfId === pdf.id
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              disabled={
                                aiAnalysisLoading &&
                                currentAnalyzingPdfId === pdf.id
                              }
                            >
                              {aiAnalysisLoading &&
                              currentAnalyzingPdfId === pdf.id ? (
                                <div className="flex items-center">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                  Analyzing...
                                </div>
                              ) : (
                                "AI analysis"
                              )}
                            </button>
                          </div>

                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateDoc(pdf.id);
                              }}
                              className={`bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                aiAnalysisLoading &&
                                currentAnalyzingPdfId === pdf.id
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              disabled={
                                aiAnalysisLoading &&
                                currentAnalyzingPdfId === pdf.id
                              }
                            >
                              {aiAnalysisLoading &&
                              currentAnalyzingPdfId === pdf.id ? (
                                <div className="flex items-center">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                  Generating...
                                </div>
                              ) : (
                                "Generate Doc"
                              )}
                            </button>
                          </div>
                        </div>
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
                        📄
                      </span>
                    </div>
                    <p
                      className={`text-lg transition-colors ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      No documents uploaded yet
                    </p>
                    <p
                      className={`text-sm mt-1 transition-colors ${
                        isDarkMode ? "text-gray-500" : "text-gray-500"
                      }`}
                    >
                      Upload your first RFP document to get started
                    </p>
                  </div>
                )}
              </div>

              {selectedPdf && (
                <div
                  className={`p-6 rounded-xl shadow-xl transition-colors ${
                    isDarkMode
                      ? "bg-gray-800 border border-gray-700"
                      : "bg-white border-gray-200"
                  }`}
                >
                  {detailsLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
                      <span
                        className={`ml-3 transition-colors ${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Loading document details...
                      </span>
                    </div>
                  ) : pdfDetails ? (
                    <>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                        <h2
                          className={`text-xl font-semibold transition-colors ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Edit and Approve Responses
                        </h2>
                        <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs">
                          {
                            submittedQuestions.filter(
                              (question) =>
                                selectedPdf &&
                                question.document_name === selectedPdf.filename
                            ).length
                          }{" "}
                          questions
                        </span>
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

                      {submittedQuestionsLoading ? (
                        <div className="flex justify-center items-center py-12">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
                          <span
                            className={`ml-3 transition-colors ${
                              isDarkMode ? "text-gray-300" : "text-gray-600"
                            }`}
                          >
                            Loading submitted questions...
                          </span>
                        </div>
                      ) : submittedQuestionsError ? (
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
                              ⚠️
                            </span>
                          </div>
                          <p
                            className={`text-lg transition-colors ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            {submittedQuestionsError}
                          </p>
                          <button
                            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            onClick={() => navigate("/")}
                          >
                            Go to Dashboard
                          </button>
                        </div>
                      ) : submittedQuestions.length > 0 ? (
                        <div className="space-y-3">
                          {submittedQuestions
                            .filter(
                              (question) =>
                                selectedPdf &&
                                question.document_name === selectedPdf.filename
                            )
                            .map((question, idx) => (
                              <div
                                key={question.question_id}
                                className={`rounded-lg overflow-hidden transition-colors ${
                                  isDarkMode
                                    ? "bg-gray-700 border border-gray-600"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div
                                  className={`flex items-center justify-between p-4 cursor-pointer ${
                                    isDarkMode
                                      ? "hover:bg-gray-650"
                                      : "hover:bg-gray-100"
                                  }`}
                                  onClick={() =>
                                    setExpandedQuestion(
                                      expandedQuestion === idx ? null : idx
                                    )
                                  }
                                >
                                  <div className="flex items-start gap-3 flex-1">
                                    <span className="text-purple-400">
                                      Q {question.question_text.split(" ")[0]}
                                    </span>
                                    <span
                                      className={`font-medium text-sm leading-relaxed transition-colors ${
                                        isDarkMode
                                          ? "text-white"
                                          : "text-gray-900"
                                      }`}
                                    >
                                      {question.question_text.substring(
                                        question.question_text.indexOf(" ") + 1
                                      )}
                                    </span>
                                  </div>

                                  <button
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm flex items-center gap-2
    ${
      isDarkMode
        ? "bg-purple-600 text-white hover:bg-purple-500"
        : "bg-purple-100 text-purple-700 hover:bg-purple-200"
    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSendReview(question);
                                    }}
                                    disabled={
                                      loadingReassign[question.question_id]
                                    }
                                  >
                                    {loadingReassign[question.question_id] ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Reassigning...
                                      </>
                                    ) : (
                                      <>Reassign</>
                                    )}
                                  </button>

                                  <span
                                    className="text-purple-400 ml-4 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsEditModalOpen(true);
                                      setQuestionToEdit(question);
                                    }}
                                  >
                                    ✏️
                                  </span>
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
                                    <>
                                      <div className="mb-4">
                                        <label
                                          className={`block text-sm font-semibold mb-2 transition-colors ${
                                            isDarkMode
                                              ? "text-gray-300"
                                              : "text-gray-700"
                                          }`}
                                        >
                                          Submitted Answer:
                                        </label>
                                        <div
                                          className={`w-full p-3 rounded-lg transition-colors ${
                                            isDarkMode
                                              ? "bg-gray-800 border border-gray-600"
                                              : "bg-white border border-gray-300"
                                          }`}
                                        >
                                          <p
                                            className={`whitespace-pre-line leading-relaxed ${
                                              isDarkMode
                                                ? "text-white"
                                                : "text-gray-900"
                                            }`}
                                          >
                                            {question.answer ||
                                              "No answer provided for question"}
                                          </p>
                                        </div>
                                      </div>
                                      {question.submitted_at && (
                                        <p
                                          className={`text-sm transition-colors ${
                                            isDarkMode
                                              ? "text-gray-400"
                                              : "text-gray-500"
                                          }`}
                                        >
                                          Submitted on{" "}
                                          {new Date(
                                            question.submitted_at
                                          ).toLocaleString()}
                                        </p>
                                      )}
                                    </>
                                  </div>
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
                              📝
                            </span>
                          </div>
                          <p
                            className={`text-lg transition-colors ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            No questions available
                          </p>
                          <p
                            className={`text-sm mt-1 transition-colors ${
                              isDarkMode ? "text-gray-500" : "text-gray-500"
                            }`}
                          >
                            Check back later for reviewer submissions
                          </p>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </>
          ) : (
            <>
              <div
                className={`p-6 rounded-xl shadow-xl mb-6 transition-colors ${
                  isDarkMode
                    ? "bg-gray-800 border border-gray-600"
                    : "bg-white border-gray-200"
                }`}
              >
                {deleteMessage && (
                  <div
                    className={`mb-4 p-3 rounded-lg text-sm ${
                      deleteMessage.includes("Error")
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    } ${
                      isDarkMode
                        ? "border border-gray-600"
                        : "border border-gray-200"
                    }`}
                  >
                    {deleteMessage}
                  </div>
                )}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                  <h2
                    className={`text-xl font-semibold transition-colors ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Responses in Process
                  </h2>
                </div>
                {pdfLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
                    <span
                      className={`ml-3 transition-colors ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Loading documents...
                    </span>
                  </div>
                ) : pdfList && pdfList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {pdfList.map((pdf, idx) => (
                      <div
                        key={pdf.id}
                        className={`rounded-lg p-4 cursor-pointer transition-all hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 group ${
                          isDarkMode
                            ? "bg-gray-700 border border-gray-600 hover:bg-gray-650"
                            : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                        } ${
                          selectedPdf && selectedPdf.id === pdf.id
                            ? `ring-2 ring-purple-500 border-purple-500 ${
                                isDarkMode ? "bg-gray-650" : "bg-gray-100"
                              }`
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedPdf(pdf);

                          setTimeout(() => {
                            documentAnalysisRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }, 100);
                        }}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-500/30 transition-colors">
                            <span className="text-purple-400 text-xl">📄</span>
                          </div>
                          <h3
                            className={`font-semibold mb-2 truncate w-full text-sm transition-colors ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                            title={pdf.filename}
                          >
                            {pdf.project_name}
                          </h3>
                          <p
                            className={`text-xs mb-3 transition-colors ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {pdf.uploaded_at &&
                              new Date(pdf.uploaded_at).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2">
                            <span className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                              View Details
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePdf(pdf.id);
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
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
                        📄
                      </span>
                    </div>
                    <p
                      className={`text-lg transition-colors ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      No documents uploaded yet
                    </p>
                    <p
                      className={`text-sm mt-1 transition-colors ${
                        isDarkMode ? "text-gray-500" : "text-gray-500"
                      }`}
                    >
                      Upload your first RFP document to get started
                    </p>
                  </div>
                )}
              </div>
              {selectedPdf && (
                <div
                  ref={documentAnalysisRef}
                  className={`rounded-xl shadow-xl transition-colors ${
                    isDarkMode
                      ? "bg-gray-800 border border-gray-700"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  {detailsLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
                      <span
                        className={`ml-3 transition-colors ${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Loading document details...
                      </span>
                    </div>
                  ) : pdfDetails ? (
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                        <h2
                          className={`text-xl font-semibold transition-colors ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {selectedPdf.project_name}
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

                      <div className="mb-6">
                        <div
                          className={`cursor-pointer flex items-center justify-between p-4 rounded-lg transition-colors ${
                            isDarkMode
                              ? "bg-gray-700 hover:bg-gray-650"
                              : "bg-gray-50 hover:bg-gray-100"
                          }`}
                          onClick={() => setExpandedSummary((prev) => !prev)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-purple-400 text-lg">📋</span>
                            <h3
                              className={`text-lg font-semibold transition-colors ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              RFP Summary and Key Requirements
                            </h3>
                          </div>
                          <span className="text-purple-400 text-lg">
                            {expandedSummary ? "▲" : "▼"}
                          </span>
                        </div>
                        {expandedSummary && pdfDetails.summary && (
                          <div
                            className={`mt-4 p-4 rounded-lg transition-colors ${
                              isDarkMode
                                ? "bg-gray-750 border border-gray-600"
                                : "bg-gray-100 border border-gray-200"
                            }`}
                          >
                            <div
                              className={`prose ${
                                isDarkMode
                                  ? "prose-invert text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                                {pdfDetails.summary.summary_text}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>

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
                            value={status}
                            onChange={(e) => fetchDetails(e.target.value)}
                            className={`flex-grow px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isDarkMode
                                ? "bg-gray-700 text-gray-300 border border-gray-600 focus:ring-purple-500 focus:border-purple-500"
                                : "bg-white text-gray-700 border border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                            }`}
                          >
                            <option value="assigned">
                              Assigned: {assignedCount}
                            </option>
                            <option value="unassigned">
                              Unassigned: {unassignedCount}
                            </option>
                            <option value="total question">
                              Total Questions: {totalQuestions}
                            </option>
                          </select>
                        </div>
                      </div>

                      {pdfDetails?.questions_by_section?.length > 0 && (
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-purple-400 text-lg">❓</span>
                            <h3
                              className={`text-lg font-semibold transition-colors ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              Questions & Responses
                            </h3>
                            <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs">
                              {pdfDetails.questions_by_section.reduce(
                                (total, section) =>
                                  total + section.questions.length,
                                0
                              )}{" "}
                              questions
                            </span>
                          </div>
                          {pdfDetails.questions_by_section.map(
                            (section, sectionIdx) => (
                              <div key={sectionIdx} className="mb-6">
                                <h4
                                  className={`text-md font-semibold mb-3 transition-colors ${
                                    isDarkMode
                                      ? "text-gray-200"
                                      : "text-gray-800"
                                  }`}
                                >
                                  {section.section}
                                </h4>
                                <div className="space-y-3">
                                  {section.questions.map((question, qIdx) => {
                                    const globalIdx =
                                      pdfDetails.questions_by_section
                                        .slice(0, sectionIdx)
                                        .reduce(
                                          (acc, s) => acc + s.questions.length,
                                          0
                                        ) + qIdx;

                                    return (
                                      <div
                                        key={question.id}
                                        className={`rounded-lg overflow-hidden transition-colors ${
                                          assignStatus[globalIdx]
                                            ? "bg-green-900/20 border border-green-700/50"
                                            : isDarkMode
                                            ? "bg-gray-700 border border-gray-600"
                                            : "bg-gray-50 border border-gray-200"
                                        }`}
                                      >
                                        <div
                                          className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                                            isDarkMode
                                              ? "hover:bg-gray-650"
                                              : "hover:bg-gray-100"
                                          }`}
                                          onClick={() =>
                                            setExpandedQuestion(
                                              expandedQuestion === globalIdx
                                                ? null
                                                : globalIdx
                                            )
                                          }
                                        >
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
                                            {expandedQuestion === globalIdx
                                              ? "▲"
                                              : "▼"}
                                          </span>
                                        </div>
                                        {expandedQuestion === globalIdx && (
                                          <div
                                            className={`p-4 border-t transition-colors ${
                                              isDarkMode
                                                ? "bg-gray-750 border-gray-600"
                                                : "bg-gray-100 border-gray-200"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                <button
                                                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                                  onClick={() =>
                                                    handleAssign(globalIdx)
                                                  }
                                                  type="button"
                                                >
                                                  <span>👤</span>
                                                  Assign
                                                </button>
                                                {assignStatus[globalIdx] && (
                                                  <span className="text-purple-400 text-sm bg-purple-500/20 px-3 py-1 rounded-full">
                                                    {assignStatus[globalIdx]}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            {assignDropdown === globalIdx && (
                                              <div className="mt-3">
                                                <div
                                                  className={`p-3 rounded-lg border transition-colors ${
                                                    isDarkMode
                                                      ? "bg-gray-800 border-gray-600"
                                                      : "bg-white border-gray-300"
                                                  }`}
                                                >
                                                  <div className="mb-2">
                                                    <span
                                                      className={`text-sm font-medium transition-colors ${
                                                        isDarkMode
                                                          ? "text-gray-300"
                                                          : "text-gray-700"
                                                      }`}
                                                    >
                                                      Select reviewers:
                                                    </span>
                                                  </div>
                                                  <div className="max-h-40 overflow-y-auto space-y-2">
                                                    {users
                                                      .filter((user) => {
                                                        const isVerifiedUser =
                                                          user.is_verified ===
                                                          true;
                                                        const isValidRole =
                                                          user.role &&
                                                          (user.role.toLowerCase() ===
                                                            "reviewer" ||
                                                            user.role.toLowerCase() ===
                                                              "admin");

                                                        return (
                                                          isVerifiedUser &&
                                                          isValidRole
                                                        );
                                                      })

                                                      .map((user, i) => {
                                                        const assignedUsers =
                                                          assignStatus[
                                                            globalIdx
                                                          ]
                                                            ? assignStatus[
                                                                globalIdx
                                                              ]
                                                                .replace(
                                                                  "Assigned to ",
                                                                  ""
                                                                )
                                                                .split(",")
                                                                .map((u) =>
                                                                  u.trim()
                                                                )
                                                            : [];
                                                        const isChecked = (
                                                          selectedReviewers[
                                                            globalIdx
                                                          ] || []
                                                        ).some(
                                                          (u) =>
                                                            u.user_id ===
                                                            user.user_id
                                                        );
                                                        const isLoading =
                                                          unassignLoading[
                                                            `${globalIdx}-${user.user_id}`
                                                          ];

                                                        return (
                                                          <label
                                                            key={i}
                                                            className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                                                              isDarkMode
                                                                ? "hover:bg-gray-700"
                                                                : "hover:bg-gray-50"
                                                            }`}
                                                          >
                                                            <div className="relative">
                                                              <input
                                                                type="checkbox"
                                                                className={`w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 ${
                                                                  isLoading
                                                                    ? "opacity-50 cursor-not-allowed"
                                                                    : ""
                                                                }`}
                                                                checked={(
                                                                  selectedReviewers[
                                                                    globalIdx
                                                                  ] || []
                                                                ).some(
                                                                  (u) =>
                                                                    u.user_id ===
                                                                    user.user_id
                                                                )}
                                                                onChange={(
                                                                  e
                                                                ) => {
                                                                  if (isLoading)
                                                                    return;

                                                                  const isChecked =
                                                                    e.target
                                                                      .checked;
                                                                  const currentReviewers =
                                                                    selectedReviewers[
                                                                      globalIdx
                                                                    ] || [];

                                                                  if (
                                                                    isChecked
                                                                  ) {
                                                                    setSelectedReviewers(
                                                                      (
                                                                        prev
                                                                      ) => ({
                                                                        ...prev,
                                                                        [globalIdx]:
                                                                          [
                                                                            ...currentReviewers,
                                                                            user,
                                                                          ],
                                                                      })
                                                                    );
                                                                  } else {
                                                                    setSelectedReviewers(
                                                                      (
                                                                        prev
                                                                      ) => ({
                                                                        ...prev,
                                                                        [globalIdx]:
                                                                          currentReviewers.filter(
                                                                            (
                                                                              u
                                                                            ) =>
                                                                              u.user_id !==
                                                                              user.user_id
                                                                          ),
                                                                      })
                                                                    );

                                                                    handleUnassign(
                                                                      globalIdx,
                                                                      user
                                                                    ).catch(
                                                                      (err) => {
                                                                        console.error(
                                                                          "Unassignment failed:",
                                                                          err
                                                                        );
                                                                      }
                                                                    );
                                                                  }
                                                                }}
                                                                disabled={
                                                                  isLoading
                                                                }
                                                              />
                                                              {isLoading && (
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                                                                </div>
                                                              )}
                                                            </div>
                                                            <span
                                                              className={`text-sm ${
                                                                isDarkMode
                                                                  ? "text-white"
                                                                  : "text-gray-900"
                                                              }`}
                                                            >
                                                              {user.username}
                                                              {user.email && (
                                                                <span
                                                                  className={`ml-1 ${
                                                                    isDarkMode
                                                                      ? "text-gray-400"
                                                                      : "text-gray-500"
                                                                  }`}
                                                                >
                                                                  ({user.email})
                                                                </span>
                                                              )}
                                                              {user.role && (
                                                                <span
                                                                  className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                    user.role.toLowerCase() ===
                                                                    "reviewer"
                                                                      ? "bg-green-100 text-green-800 border border-green-200"
                                                                      : "bg-gray-100 text-gray-800 border border-gray-200"
                                                                  } ${
                                                                    isDarkMode &&
                                                                    user.role.toLowerCase() ===
                                                                      "reviewer"
                                                                      ? "bg-green-900/30 text-green-300 border-green-700"
                                                                      : isDarkMode
                                                                      ? "bg-gray-700 text-gray-300 border-gray-600"
                                                                      : ""
                                                                  }`}
                                                                >
                                                                  {user.role}
                                                                </span>
                                                              )}
                                                            </span>
                                                          </label>
                                                        );
                                                      })}
                                                  </div>
                                                  {assignmentError[
                                                    globalIdx
                                                  ] && (
                                                    <div className="mt-2 text-red-500 text-sm">
                                                      {
                                                        assignmentError[
                                                          globalIdx
                                                        ]
                                                      }
                                                    </div>
                                                  )}
                                                  <div className="mt-3 pt-2 border-t border-gray-300">
                                                    <button
                                                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                                                      onClick={() => {
                                                        const usersToAssign =
                                                          selectedReviewers[
                                                            globalIdx
                                                          ] || [];
                                                        if (
                                                          usersToAssign.length >
                                                          0
                                                        ) {
                                                          handleUserSelect(
                                                            globalIdx,
                                                            usersToAssign
                                                          );
                                                        } else {
                                                          setAssignDropdown(
                                                            null
                                                          );
                                                        }
                                                      }}
                                                      type="button"
                                                    >
                                                      Done
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
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
                          ⚠️
                        </span>
                      </div>
                      <p
                        className={`text-lg transition-colors ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Failed to load document details
                      </p>
                      <p
                        className={`text-sm mt-1 transition-colors ${
                          isDarkMode ? "text-gray-500" : "text-gray-500"
                        }`}
                      >
                        Please try selecting the document again
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        message="Are you sure you want to delete this document? This action cannot be undone."
      />
      <EditQuestionDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditSave}
        question={questionToEdit}
      />
      {toasterNotification && (
        <ToasterNotification
          message={toasterNotification.message}
          type={toasterNotification.type}
          onClose={() => setToasterNotification(null)}
        />
      )}
    </>
  );
}
