import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../contexts/ThemeContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function EnhancedUploadPdf({ setPdfList }) {
  const { isDarkMode } = useTheme();
  const [files, setFiles] = useState([]);
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
  const [userRole, setUserRole] = useState("");
  const fileInputRef = useRef(null);
  const calledOnceRef = useRef(false);
  const pdfListLoadedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [projectName, setProjectName] = useState("");
  const dropRef = useRef(null);

  // Get user role
  useEffect(() => {
    const session = localStorage.getItem("session");
    if (session) {
      try {
        const parsedSession = JSON.parse(session);
        setUserRole(parsedSession.role || "admin");
      } catch (error) {
        console.error("Error parsing session:", error);
        setUserRole("admin");
      }
    }
  }, []);

  useEffect(() => {
    // Fetch users for assignment
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
    if (!calledOnceRef.current) {
      fetchUsers();
      calledOnceRef.current = true;
    }
  }, []);

  const fetchPdfList = async () => {
    if (!API_BASE_URL) return;
    try {
      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;
      const headers = {
        accept: "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(`${API_BASE_URL}/filedetails`, { headers });
      if (!response.ok) throw new Error("Failed to fetch PDFs");
      const data = await response.json();
      setPdfList(data || []);
      window.location.reload();
    } catch (err) {
      console.error("Error fetching PDF list:", err);
      setPdfList([]);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    setFiles((prevFiles) => {
      const updatedFiles = [...prevFiles, ...selectedFiles];
      return updatedFiles;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index) => {
    setFiles((prevFiles) => {
      const updatedFiles = prevFiles.filter((_, i) => i !== index);

      // input reset everytime after deletion
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return updatedFiles;
    });
  };
  const clearAllFiles = () => {
     setMessage("");
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {

      if (!projectName || !projectName.trim()) {
    return setMessage("Project name is required.");
  }

    if (files.length === 0)
      return setMessage("Please select at least one file.");

    setLoading(true);
    setMessage("");
    setSummary("");
    setQuestions([]);
    setAnswers([]);
    setExpandedSummary(false);
    setExpandedQuestion(null);
    setAssignDropdown(null);
    setAssignStatus([]);

    try {
      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;
      let hasDuplicates = false;
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("project_name",projectName);
         formData.append("category", "UploadCenter");
        const headers = {
          ...(token && { Authorization: `Bearer ${token}` }),
        };

        const response = await fetch(
          `${API_BASE_URL}/search-related-summary/`,
          {
            method: "POST",
            headers,
            body: formData,
          }
        );
        const data = await response.json();

        if (data && data.detail && data.detail.status === "duplicate") {
          setMessage((prev) => prev + `"${file.name}" already exists. `);
          hasDuplicates = true;
          continue;
        }

        setMessage((prev) => prev + `"${file.name}" uploaded successfully! `);

        if (file === files[files.length - 1]) {
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
            } else if (
              data.question_list &&
              Array.isArray(data.question_list)
            ) {
              questionsArray = data.question_list;
            }
          }

          setQuestions(questionsArray);
          setAnswers(questionsArray.map(() => ""));
          setAssignStatus(questionsArray.map(() => ""));
        }
      }

      // Refresh the PDF list after all uploads
   
      if (!hasDuplicates) {
        fetchPdfList();
        clearAllFiles();
      } 
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

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set dragging to false if we're leaving the drop area
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles && droppedFiles.length > 0) {
      // Check if files are supported types
      const supportedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];

      const validFiles = droppedFiles.filter((file) => {
        const fileExtension = file.name.split(".").pop().toLowerCase();
        const isSupportedType =
          supportedTypes.includes(file.type) ||
          ["pdf", "doc", "docx", "ppt", "pptx"].includes(fileExtension);
        return isSupportedType;
      });

      if (validFiles.length > 0) {
        setFiles((prevFiles) => [...prevFiles, ...validFiles]);
        setMessage("");
      } else {
        setMessage(
          "Unsupported file types. Please upload PDF, DOC, DOCX, PPT, or PPTX files."
        );
      }
    }
  }, []);

  useEffect(() => {
    const dropArea = dropRef.current;
    if (dropArea) {
      dropArea.addEventListener("dragover", handleDragOver);
      dropArea.addEventListener("dragenter", handleDragEnter);
      dropArea.addEventListener("dragleave", handleDragLeave);
      dropArea.addEventListener("drop", handleDrop);

      return () => {
        dropArea.removeEventListener("dragover", handleDragOver);
        dropArea.removeEventListener("dragenter", handleDragEnter);
        dropArea.removeEventListener("dragleave", handleDragLeave);
        dropArea.removeEventListener("drop", handleDrop);
      };
    }
  }, [handleDragOver, handleDragEnter, handleDragLeave, handleDrop]);
 
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between flex-col">
        <div>
          {/* <h2
            className={`text-3xl font-bold mb-2 flex items-center gap-3 transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            <span className="text-4xl">📤</span>
            Document Upload Center
          </h2> */}
          {/* <p
            className={`transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Upload RFP documents for analysis or learning materials for training
          </p> */}
        </div>

        <div className="w-2/2 w-full">
          <div
            ref={dropRef}
            className={`flex flex-col items-center p-8 mt-2 gap-4 justify-center border-2 border-dashed rounded-lg transition-colors ${
              isDragging
                ? "border-purple-500 bg-purple-500/10"
                : isDarkMode
                ? "border-gray-600 bg-gray-700"
                : "border-gray-300 bg-gray-50"
            }`}
          >
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-purple-400 text-2xl">📤</span>
            </div>

            <div className="flex items-center gap-4 w-full justify-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf,.doc,.docx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,.ppt,.pptx"
                onChange={handleFileChange}
                className={`${
                  loading
                    ? "pointer-events-none opacity-50 cursor-not-allowed"
                    : ""
                } w-[16rem] p-1 rounded-lg transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700 ${
                  isDarkMode
                    ? "bg-gray-700 border border-gray-600 text-white"
                    : "bg-gray-50 border border-gray-300 text-gray-900"
                } h-[48px] `}
                disabled={loading}
              />
              {/* <button
                onClick={handleUpload}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading || files.length === 0}
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
              </button> */}
            </div>
            <p
              className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              or drag and drop files here
            </p>

            {/* Selected files list */}
            {files.length > 0 && (
              <div className="w-full max-w-2xl">
                <div
                  className={`mt-4 w-full ${
                    isDarkMode ? "bg-gray-600" : "bg-gray-100"
                  } rounded-lg p-4`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span
                      className={`text-sm font-medium ${
                        isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      Selected files ({files.length})
                    </span>
                    <button
                      onClick={clearAllFiles}
                      className={`text-xs ${
                        isDarkMode
                          ? "text-red-400 hover:text-red-300"
                          : "text-red-600 hover:text-red-800"
                      } transition-colors`}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">

    <input
      type="text"
      placeholder="Enter project name"
      value={projectName}
      onChange={(e) => setProjectName(e.target.value)}
      required
  className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
    />

  
    {files.map((file, index) => (
      <div
        key={index}
        className="flex justify-between items-center py-2 px-3 text-black rounded-md bg-white dark:bg-gray-700"
      >
        <span
          className={`text-xs truncate max-w-xs ${
            isDarkMode ? "text-black" : "text-gray-700"
          }`}
          title={file.name}
        >
          {file.name}
        </span>
        <button
          onClick={() => removeFile(index)}
          className={`text-lg ${
            isDarkMode
              ? "text-red-400 hover:text-red-300"
              : "text-red-600 hover:text-red-800"
          } transition-colors`}
          aria-label="Remove file"
        >
          ×
        </button>
      </div>
    ))}
  </div>


                  {/* Start Analysis Button - Prominently positioned after file selection */}
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={handleUpload}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <span className="text-lg">⚡</span>
                          Start Analysis
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* <p
            className={`text-xs transition-colors ${
              isDarkMode ? "text-gray-500" : "text-gray-500"
            }`}
          >
            Supported formats: PDF, DOC, DOCX, PPT, PPTX
          </p> */}
        </div>
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

      <>
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

        {/* Questions Section */}
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
                        {/* Assignment Dropdown */}
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
                              {users
                                .filter(
                                  (user) =>
                                    user.role?.toLowerCase() === "reviewer"
                                )
                                .map((user, i) => (
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
      </>
    </div>
  );
}
