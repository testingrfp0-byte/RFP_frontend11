import React, { useState, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";

export default function LearningDocumentUpload({ onUploadComplete, userRole }) {
  const { isDarkMode } = useTheme();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documentType, setDocumentType] = useState("rfp");
  const fileInputRef = useRef(null);

  const documentTypes = [
    {
      id: "rfp",
      name: "Past RFP Response",
      icon: "📋",
      description: "Previous RFP responses for reference",
    },
    {
      id: "press",
      name: "Press Release",
      icon: "📰",
      description: "Company press releases and announcements",
    },
    {
      id: "case_study",
      name: "Case Study",
      icon: "📊",
      description: "Client success stories and case studies",
    },
    {
      id: "technical",
      name: "Technical Document",
      icon: "⚙️",
      description: "Technical specifications and standards",
    },
    {
      id: "training",
      name: "Training Material",
      icon: "📚",
      description: "Training guides and educational content",
    },
    {
      id: "other",
      name: "Other",
      icon: "📄",
      description: "Other background documents",
    },
  ];

  if (userRole === "reviewer") {
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
              🔒
            </span>
          </div>
          <p
            className={`text-lg transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Upload access restricted
          </p>
          <p
            className={`text-sm mt-1 transition-colors ${
              isDarkMode ? "text-gray-500" : "text-gray-500"
            }`}
          >
            Only administrators can upload learning documents
          </p>
        </div>
      </div>
    );
  }

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files) => {
    const validFiles = files.filter((file) => {
      const validTypes = [".pdf", ".doc", ".docx", ".txt", ".md"];
      const fileExtension = "." + file.name.split(".").pop().toLowerCase();
      return (
        validTypes.includes(fileExtension) && file.size <= 50 * 1024 * 1024
      );
    });

    setSelectedFiles(validFiles);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("document_type", documentType);
        formData.append("category", "learning");

        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 5, 90));
        }, 100);

        const headers = {
          "ngrok-skip-browser-warning": "true",
          ...(token && { Authorization: `Bearer ${token}` }),
        };

        await new Promise((resolve) => setTimeout(resolve, 2000));

        clearInterval(progressInterval);
        setUploadProgress(100);

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setSelectedFiles([]);
      setUploadProgress(0);

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

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
            Upload Learning Documents
          </h2>
        </div>

        <div className="mb-6">
          <label
            className={`block text-sm font-medium mb-3 transition-colors ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Document Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {documentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setDocumentType(type.id)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  documentType === type.id
                    ? "border-purple-500 bg-purple-500/10"
                    : isDarkMode
                    ? "border-gray-600 bg-gray-700 hover:border-gray-500"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{type.icon}</span>
                  <span
                    className={`font-medium text-sm transition-colors ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {type.name}
                  </span>
                </div>
                <p
                  className={`text-xs transition-colors ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {type.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            dragActive
              ? "border-purple-500 bg-purple-500/10"
              : isDarkMode
              ? "border-gray-600 bg-gray-700/50"
              : "border-gray-300 bg-gray-50/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-purple-400 text-3xl">📤</span>
          </div>

          <h3
            className={`text-lg font-semibold mb-2 transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Drop files here or click to browse
          </h3>

          <p
            className={`text-sm mb-4 transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Supports PDF, DOC, DOCX, TXT, MD files up to 50MB each
          </p>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Choose Files
          </button>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <h4
              className={`text-sm font-medium mb-3 transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Selected Files ({selectedFiles.length})
            </h4>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    isDarkMode
                      ? "bg-gray-700 border border-gray-600"
                      : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-purple-400 text-lg">📄</span>
                    <div>
                      <p
                        className={`font-medium text-sm transition-colors ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {file.name}
                      </p>
                      <p
                        className={`text-xs transition-colors ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploading && (
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
              <span
                className={`text-sm font-medium transition-colors ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Uploading files...
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && !uploading && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleUpload}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>📤</span>
              Upload {selectedFiles.length} file
              {selectedFiles.length > 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
