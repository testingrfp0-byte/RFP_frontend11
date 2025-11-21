import { useEffect, useState, useCallback, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { Document, Page } from "react-pdf";
import { renderAsync } from "docx-preview";
import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const DocumentList = () => {
  const { isDarkMode } = useTheme();

  const [pdfList, setPdfList] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [toasterNotification, setToasterNotification] = useState(null);

  const [previewFile, setPreviewFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [numPages, setNumPages] = useState(null);

  const docxContainerRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const NGROK_HEADERS = {
    accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  const fetchDocuments = useCallback(async () => {
    setPdfLoading(true);
    try {
      const session = localStorage.getItem("session");
      if (!session) return console.error("No session found");

      const parsedSession = JSON.parse(session);
      const token = parsedSession.token;
      if (!token) return console.error("No token found");

      const res = await fetch(`${API_BASE_URL}/list-rfp-docs/`, {
        method: "GET",
        headers: {
          ...NGROK_HEADERS,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Unknown error");

      setPdfList(data.docs || []);
    } catch (err) {
      setToasterNotification({
        message: "Failed to fetch documents. Please try again.",
        type: "error",
      });
      console.error("Error fetching documents:", err);
    } finally {
      setPdfLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handlePreview = async (file) => {
    setPdfLoading(true);
    try {
      const session = localStorage.getItem("session");
      if (!session) return console.error("No session found");

      const parsedSession = JSON.parse(session);
      const token = parsedSession.token;
      if (!token) return console.error("No token found");

      const response = await fetch(file.download_url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch file");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      let detectedType = blob.type;
      if (!detectedType && file.file_name.endsWith(".docx")) {
        detectedType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      }
      if (!detectedType && file.file_name.endsWith(".pdf")) {
        detectedType = "application/pdf";
      }

      setPreviewUrl(url);
      setFileType(detectedType);
      setPreviewFile(file);
      setIsModalOpen(true);

      if (detectedType?.includes("word")) {
        setTimeout(() => {
          if (docxContainerRef.current) {
            console.log(docxContainerRef.current, "after");

            docxContainerRef.current.innerHTML = "";
            renderAsync(blob, docxContainerRef.current);
          }
        }, 100);
      }
    } catch (error) {
      setToasterNotification({
        message: "Failed to load preview",
        type: "error",
      });
      console.error(error);
    } finally {
      setPdfLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setPreviewFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileType(null);
    setNumPages(null);
    if (docxContainerRef.current) {
      docxContainerRef.current.innerHTML = "";
    }
  };

  return (
    <div
      className={`p-6 m-4 rounded-xl shadow-xl mb-6 transition-colors ${
        isDarkMode
          ? "bg-gray-800 border border-gray-600"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
        <h2
          className={`text-xl font-semibold ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Proposals
        </h2>
      </div>

      {/* Loading spinner */}
      {pdfLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
          <span
            className={`ml-3 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            Loading documents...
          </span>
        </div>
      ) : pdfList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pdfList.map((pdf, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 border shadow-sm flex flex-col justify-between ${
                isDarkMode
                  ? "border-gray-600 bg-gray-900 text-white"
                  : "border-gray-200 bg-gray-50 text-gray-900"
              }`}
            >
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">📄</span>
                <p className="text-sm break-all">{pdf.file_name}</p>
              </div>
              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => handlePreview(pdf)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4 rounded transition-all"
                >
                  Preview
                </button>
                <button
                  onClick={() => window.open(pdf.download_url, "_blank")}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded transition-all"
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">
          No documents found.
        </div>
      )}

      {/* Modal */}
      {isModalOpen && previewFile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] overflow-hidden relative p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-gray-700 dark:text-gray-300 text-lg font-bold hover:text-red-600"
            >
              &times;
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-semibold">{previewFile.file_name}</h3>
            </div>

            {/* PDF Preview */}
            {fileType === "application/pdf" && previewUrl && (
              <div className="w-full h-[80vh] overflow-auto">
                <Document
                  file={previewUrl}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                >
                  {Array.from(new Array(numPages), (el, index) => (
                    <Page
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      width={800}
                    />
                  ))}
                </Document>
              </div>
            )}

            {/* DOCX Preview */}
            {fileType?.includes("word") && previewUrl && (
              <div
                ref={docxContainerRef}
                className="w-full h-[80vh] overflow-auto bg-white text-black p-2"
              />
            )}

            {/* Unsupported Preview */}
            {fileType &&
              ![
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              ].includes(fileType) && (
                <div className="text-center text-gray-600 dark:text-gray-300 py-20">
                  Cannot preview this file type
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
