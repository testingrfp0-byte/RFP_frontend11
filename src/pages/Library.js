import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../contexts/ThemeContext";
import ConfirmationDialog from "../components/ConfirmationDialog";
import EnhancedUploadPdf from "./EnhancedUploadPdf";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const NGROK_HEADERS = {
  accept: "application/json",
  "ngrok-skip-browser-warning": "true",
};

export default function Library({ setPdfList }) {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState("upload");
  const [historicRFPs, setHistoricRFPs] = useState([]);
  const [trainingMaterials, setTrainingMaterials] = useState([]);
  const [learningDocuments, setLearningDocuments] = useState([]);
  const [clean, setClean] = useState([]);

  // NEW: Track available projects and selected project
  const [availableProjects, setAvailableProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [showProjectNameError, setShowProjectNameError] = useState(false);
  const [useExistingProject, setUseExistingProject] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [userRole, setUserRole] = useState("");
  const calledOnceRef = useRef(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [rfpToDelete, setRfpToDelete] = useState(null);
  const trainingFileInputRef = useRef(null);
  const learningFileInputRef = useRef(null);
  const historicFileInputRef = useRef(null);
  const cleanFileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState({});

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
    if (!calledOnceRef.current) {
      fetchLibraryData();
      calledOnceRef.current = true;
    }
  }, []);

  // NEW: Extract unique projects from all documents
  useEffect(() => {
    const allDocuments = [
      ...historicRFPs,
      ...clean,
      ...trainingMaterials,
      ...learningDocuments,
    ];

    const projects = [
      ...new Set(
        allDocuments
          .filter((doc) => doc.project_name && doc.project_name.trim() !== "")
          .map((doc) => doc.project_name)
      ),
    ].sort();

    setAvailableProjects(projects);
  }, [historicRFPs, clean, trainingMaterials, learningDocuments]);

  const fetchLibraryData = async () => {
    setLoading(true);
    try {
      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;
      const headers = {
        ...NGROK_HEADERS,
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const historicResponse = await fetch(`${API_BASE_URL}/filedetails`, {
        headers,
      });
      if (historicResponse.ok) {
        const data = await historicResponse.json();

        setHistoricRFPs(data.filter((doc) => doc.category === "history") || []);
        setClean(data.filter((doc) => doc.category === "clean") || []);
        setTrainingMaterials(
          data.filter((doc) => doc.category === "training") || []
        );
        setLearningDocuments(
          data.filter((doc) => doc.category === "learning") || []
        );
      }
    } catch (error) {
      console.error("Error fetching library data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRFP = async (rfpId) => {
    const session = localStorage.getItem("session");
    const token = session ? JSON.parse(session).token : null;
    const headers = {
      ...NGROK_HEADERS,
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    try {
      const response = await fetch(
        `${API_BASE_URL}/rfp-documents/${rfpId}/view`,
        {
          headers: headers,
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error viewing RFP:", error);
      alert("Failed to load document. Please try again later.");
    }
  };

  const handleDeletePdf = useCallback(
    async (rfpId) => {
      setIsConfirmOpen(true);
      setRfpToDelete(rfpId);
    },
    [setRfpToDelete]
  );

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
          setDeleteMessage(
            "RFP document and all related data deleted successfully."
          );
          fetchLibraryData();
          if (activeTab === "upload") {
            setPdfList();
          }

          setTimeout(() => setDeleteMessage(""), 2000);
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
  }, [rfpToDelete, fetchLibraryData]);

  const cancelDelete = useCallback(() => {
    setIsConfirmOpen(false);
    setRfpToDelete(null);
  }, []);

  const handleDragOver = (e, category) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver((prev) => ({ ...prev, [category]: true }));
  };

  const handleDragEnter = (e, category) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver((prev) => ({ ...prev, [category]: true }));
  };

  const handleDragLeave = (e, category) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOver((prev) => ({ ...prev, [category]: false }));
  };

  const handleDrop = (e, category) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver((prev) => ({ ...prev, [category]: false }));

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files, category);
    }
  };

  // UPDATED: Get the actual project name to use
  const getProjectNameForUpload = () => {
    if (useExistingProject && selectedProject) {
      return selectedProject;
    } else if (newProjectName.trim()) {
      return newProjectName.trim();
    }
    return "";
  };

  const handleFiles = (files, category) => {
    if (!files || files.length === 0) return;

    const projectName = getProjectNameForUpload();
    if (!projectName) {
      setShowProjectNameError(true);
      return;
    }

    setShowProjectNameError(false);

    const newUploadingFiles = Array.from(files).map((file) => ({
      name: file.name,
      category,
      progress: 0,
    }));
    setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      uploadSingleFile(file, category, projectName);
    }
  };

  const handleFileUpload = (event, category) => {
    event.preventDefault();

    const projectName = getProjectNameForUpload();
    if (!projectName) {
      setShowProjectNameError(true);
      event.target.value = "";
      return;
    }

    setShowProjectNameError(false);

    const files = event.target.files;
    if (files && files.length > 0) {
      handleFiles(files, category);
    }

    event.target.value = "";
  };

  const uploadSingleFile = async (file, category, projectName) => {
    setUploadProgress((prev) => ({
      ...prev,
      [file.name]: 0,
    }));

    try {
      const formData = new FormData();
      formData.append("files", file);
      formData.append("category", category);
      formData.append("project_name", projectName);

      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;
      const headers = {
        "ngrok-skip-browser-warning": "true",
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: Math.min(prev[file.name] + 10, 90),
        }));
      }, 200);

      await new Promise((resolve) => setTimeout(resolve, 2000));
      const response = await fetch(`${API_BASE_URL}/upload-library`, {
        method: "POST",
        headers: headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      clearInterval(progressInterval);
      setUploadProgress((prev) => ({
        ...prev,
        [file.name]: 100,
      }));

      // Reset form after successful upload
      setNewProjectName("");
      setSelectedProject("");
      setUseExistingProject(false);

      // Create the new document object with the actual data from server response
      const newDocument = {
        id: result.document_id || result.id,
        filename: file.name,
        name: file.name,
        type: file.name.split(".").pop().toUpperCase(),
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploaded_at: new Date().toISOString(),
        uploadedAt: new Date().toISOString().split("T")[0],
        category: category,
        project_name: projectName,
      };

      // Immediately update the state with the new document
      if (category === "clean") {
        setClean((prev) => [newDocument, ...prev]);
      } else if (category === "training") {
        setTrainingMaterials((prev) => [newDocument, ...prev]);
      } else if (category === "learning") {
        setLearningDocuments((prev) => [newDocument, ...prev]);
      } else if (category === "center") {
        setHistoricRFPs((prev) => [newDocument, ...prev]);
      }

      // Also refresh from server to ensure data consistency
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.name !== file.name));
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
        fetchLibraryData(); // This will sync with server data
      }, 1000);
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadingFiles((prev) => prev.filter((f) => f.name !== file.name));
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
        return newProgress;
      });
    }
  };

  // Helper function to group files by project name
  const groupFilesByProject = (files) => {
    return files.reduce((acc, file) => {
      const projectName = file.project_name || "Uncategorized";
      if (!acc[projectName]) {
        acc[projectName] = [];
      }
      acc[projectName].push(file);
      return acc;
    }, {});
  };

  // Group all file types by project name
  const groupedCleanFiles = groupFilesByProject(clean);
  const groupedTrainingFiles = groupFilesByProject(trainingMaterials);
  const groupedLearningFiles = groupFilesByProject(learningDocuments);

  // Sort project names alphabetically for each category
  const sortedCleanProjects = Object.keys(groupedCleanFiles).sort();
  const sortedTrainingProjects = Object.keys(groupedTrainingFiles).sort();
  const sortedLearningProjects = Object.keys(groupedLearningFiles).sort();

  const tabs = [
    {
      id: "upload",
      label: "Upload a new RFP",
      icon: "📤",
      count: historicRFPs.length,
    },
    {
      id: "historic",
      label: "Historic RFPs",
      icon: "📋",
      count: clean.length,
    },
    {
      id: "training",
      label: "Training Materials",
      icon: "📖",
      count: trainingMaterials.length,
    },
    {
      id: "learning",
      label: "Learning Documents",
      icon: "🎓",
      count: learningDocuments.length,
    },
  ];

  const renderDocumentCard = (doc, showActions = true) => (
    <div
      key={doc.id}
      className={`rounded-lg p-3 transition-all hover:shadow-lg flex flex-col justify-between cursor-pointer
        ${
          isDarkMode
            ? "bg-gray-700 border border-gray-600 hover:bg-gray-650"
            : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
        }`}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-purple-400 text-lg">📄</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className={`font-semibold text-sm mb-1 leading-tight break-words
                ${isDarkMode ? "text-white" : "text-gray-900"}`}
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
              title={doc.filename || doc.name}
            >
              {doc.filename || doc.name}
            </h3>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span
                className={`${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {doc.type || "PDF"}
              </span>
              {doc.size && (
                <span
                  className={`${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {doc.size}
                </span>
              )}
              <span
                className={`${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {new Date(
                  doc.uploaded_at || doc.uploadedAt
                ).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        {showActions && (
          <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              onClick={() => handleViewRFP(doc.document_id || doc.id)}
            >
              View
            </button>
            {userRole !== "reviewer" && (
              <button
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePdf(doc.document_id || doc.id);
                }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Helper function to render grouped files
  const renderGroupedFiles = (groupedFiles, sortedProjects, emptyMessage) => {
    if (sortedProjects.length === 0) {
      return (
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
              📋
            </span>
          </div>
          <p
            className={`text-lg transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {emptyMessage}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {sortedProjects.map((projectName) => {
          const projectFiles = groupedFiles[projectName];
          return (
            <div key={projectName} className="space-y-4">
              {/* Project Header */}
              <div
                className={`px-4 py-3 rounded-lg border-l-4 border-purple-500 ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <h3
                  className={`text-lg font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {projectName}
                </h3>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {projectFiles.length} document
                  {projectFiles.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Files Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectFiles.map((file) => renderDocumentCard(file))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // UPDATED: Enhanced upload section with project selection
  const renderUploadSection = (category, title) => {
    if (userRole === "reviewer") return null;

    const isDisabled = uploadingFiles.some(
      (file) => file.category === category && uploadProgress[file.name] > 0
    );

    const isDragActive = dragOver[category] || false;

    return (
      <>
        <div className="space-y-4 mb-6">
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Project Name
            </label>
            <input
              type="text"
              placeholder="Enter project name"
              value={newProjectName}
              onChange={(e) => {
                setNewProjectName(e.target.value);
                if (e.target.value.trim()) setShowProjectNameError(false);
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                showProjectNameError && !newProjectName.trim()
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-purple-500"
              } ${isDarkMode ? "bg-gray-700 text-white" : "bg-white"}`}
            />
          </div>

          {showProjectNameError && (
            <p className="text-red-500 text-sm">Project name is required</p>
          )}
        </div>

        <div
          onDragOver={(e) => handleDragOver(e, category)}
          onDragEnter={(e) => handleDragEnter(e, category)}
          onDragLeave={(e) => handleDragLeave(e, category)}
          onDrop={(e) => handleDrop(e, category)}
          className={`rounded-lg p-4 mb-5 border-2 border-dashed transition-colors ${
            isDragActive
              ? "border-purple-500 bg-purple-500/10"
              : isDarkMode
              ? "border-gray-600 bg-gray-800/50"
              : "border-gray-300 bg-gray-50/50"
          } ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-purple-400 text-2xl">📤</span>
            </div>
            <h3
              className={`font-semibold mb-2 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Upload {title}
            </h3>
            <p
              className={`text-sm mb-4 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {isDragActive
                ? "Drop files here"
                : "Drag and drop files here or click to browse"}
            </p>
            <input
              type="file"
              id={`upload-${category}`}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,.ppt,.pptx"
              onChange={(e) => handleFileUpload(e, category)}
              disabled={isDisabled}
              multiple
              ref={
                category === "clean"
                  ? cleanFileInputRef
                  : category === "training"
                  ? trainingFileInputRef
                  : category === "learning"
                  ? learningFileInputRef
                  : historicFileInputRef
              }
            />
            <label
              htmlFor={`upload-${category}`}
              className={`bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer inline-block ${
                isDisabled ? "cursor-not-allowed" : ""
              }`}
            >
              Choose Files
            </label>
          </div>
        </div>
      </>
    );
  };

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
            <span className="text-4xl">📚</span>
            Upload Center and Library
          </h1>
          <p
            className={`transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Access historic RFP responses, training materials, and learning
            documents
          </p>
        </div>

        {uploadingFiles.length > 0 && (
          <div
            className={`mb-6 p-4 rounded-lg transition-colors ${
              isDarkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-gray-200"
            }`}
          >
            <h3
              className={`font-medium mb-3 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Uploading Files
            </h3>

            {uploadingFiles.map((file) => (
              <div key={file.name} className="mb-3 last:mb-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                  <span
                    className={`text-sm font-medium ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {file.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {uploadProgress[file.name]}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress[file.name]}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-6">
          <div
            className={`flex space-x-1 p-1 rounded-lg ${
              isDarkMode
                ? "bg-gray-200 dark:bg-gray-700 border border-gray-700"
                : "bg-white border border-gray-200"
            }`}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-gray-800 dark:bg-white dark:text-gray-800 text-white shadow-sm"
                    : isDarkMode
                    ? "text-gray-800 hover:text-white hover:bg-gray-800"
                    : "text-gray-800 hover:text-white hover:bg-gray-800"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id
                        ? "bg-purple-100 text-purple-600"
                        : isDarkMode
                        ? "bg-gray-600 text-gray-300"
                        : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`rounded-xl shadow-xl p-6 transition-colors ${
            isDarkMode
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-gray-200"
          }`}
        >
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
              <span
                className={`ml-3 transition-colors ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Loading library...
              </span>
            </div>
          ) : (
            <>
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
              <ConfirmationDialog
                isOpen={isConfirmOpen}
                onClose={cancelDelete}
                onConfirm={confirmDelete}
                title="Confirm Deletion"
                message="Are you sure you want to delete this document? This action cannot be undone."
              />

              {activeTab === "upload" && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                    <h2
                      className={`text-xl font-semibold transition-colors ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Upload New RFP Documents
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {<EnhancedUploadPdf setPdfList={setPdfList} />}
                    <div className="mt-6">
                      {historicRFPs.length > 0 && (
                        <div className="space-y-8">
                          {renderGroupedFiles(
                            groupFilesByProject(historicRFPs),
                            Object.keys(
                              groupFilesByProject(historicRFPs)
                            ).sort(),
                            "No RFP documents available"
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "historic" && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                    <h2
                      className={`text-xl font-semibold transition-colors ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Historic RFP Responses
                    </h2>
                  </div>
                  {renderUploadSection("clean", "Historic Materials")}

                  {renderGroupedFiles(
                    groupedCleanFiles,
                    sortedCleanProjects,
                    "No historic RFPs available"
                  )}
                </div>
              )}

              {activeTab === "training" && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                    <h2
                      className={`text-xl font-semibold transition-colors ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Background Training Materials
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {renderUploadSection("training", "Training Materials")}
                    {renderGroupedFiles(
                      groupedTrainingFiles,
                      sortedTrainingProjects,
                      "No training materials available"
                    )}
                  </div>
                </div>
              )}

              {activeTab === "learning" && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                    <h2
                      className={`text-xl font-semibold transition-colors ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Uploaded Learning Documents
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {renderUploadSection("learning", "Learning Documents")}
                    {renderGroupedFiles(
                      groupedLearningFiles,
                      sortedLearningProjects,
                      "No learning documents available"
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
