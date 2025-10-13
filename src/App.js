import { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminRegister from "./pages/AdminRegister";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import UploadPdf from "./pages/UploadPdf";
import EnhancedUploadPdf from "./pages/EnhancedUploadPdf";
import TeamUser from "./pages/TeamUser";
import ReviewerAssignedQuestions from "./pages/ReviewerAssignedQuestions";
import Library from "./pages/Library";
import Profile from "./pages/Profile";
import ChangePassword from "./pages/ChangePassword";
import TopBar from "./components/TopBar";
import SideBar from "./components/SideBar";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import VerifyEmailByOtp from "./pages/VerifyEmailByOtp";
import ResetPassword from "./pages/ResetPassword";
import SelfAssignView from "./components/ReviewerDashboard";
import { VerifyEmail } from "./pages/Verifymail";
import RegisterVerified from "./pages/Registerverified";
import DocumentList from "./pages/RFP_Report";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function Layout({ userName, userRole, onLogout, userId, children }) {
  const { isDarkMode } = useTheme();
  return (
    <div
      className={`flex min-h-screen transition-colors ${isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
    >
      <SideBar userName={userName} userRole={userRole} />
      <div className="flex-1 flex flex-col">
        <TopBar userName={userName} userRole={userRole} onLogout={onLogout} userId={userId} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex items-center justify-center h-screen text-xl font-semibold">
      404 - Page Not Found
    </div>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [checklist, setChecklist] = useState([]);
  const [responses, setResponses] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState(null);
  const [pdfList, setPdfList] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      const session = localStorage.getItem("session");
      if (session) {
        try {
          const parsedSession = JSON.parse(session);
          setIsAuthenticated(true);
          setUserName(parsedSession.email);
          setUserRole(parsedSession.role || "reviewer");
          setUserId(parsedSession.userId);
        } catch (err) {
          console.error("Error parsing session:", err);
          localStorage.removeItem("session");
          setIsAuthenticated(false);
          setUserName("");
          setUserRole("");
          setPdfList([]);
        }
      } else {
        setIsAuthenticated(false);
        setUserName("");
        setUserRole("");
        setPdfList([]);
      }
      setSessionChecked(true);
    };
    checkSession();
    window.addEventListener("storage", checkSession);
    return () => window.removeEventListener("storage", checkSession);
  }, []);

  const fetchPdfList = useCallback(async () => {
    if (!API_BASE_URL) return;
    setPdfLoading(true);
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
      setPdfList(data.filter((doc) => doc.category === "history") || []);

    } catch (err) {
      console.error("Error fetching PDF list:", err);
      setPdfList([]);
    }
    setPdfLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated && sessionChecked && userRole === "admin") {
      fetchPdfList();
    }
  }, [isAuthenticated, sessionChecked, userRole, fetchPdfList]);

  const handleFileChange = useCallback((e) => setFile(e.target.files[0]), []);

  const handleUpload = useCallback(async () => {
    if (!file) return alert("Please upload a file");
    if (!API_BASE_URL) return alert("API URL not configured");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;
      const headers = {
        "ngrok-skip-browser-warning": "true",
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      if (data && data.id && data.filename) {
        setPdfList((prev) => [
          ...prev,
          {
            id: data.id,
            filename: data.filename,
            uploaded_at: new Date().toISOString(),
          },
        ]);
      }
      setSummary(data.extracted_text?.summary || "");
      setChecklist(data.extracted_text?.checklist || []);
      setResponses(data.extracted_text?.responses || []);
    } catch (error) {
      alert("Upload failed: " + error.message);
    }
    setLoading(false);
  }, [file, setPdfList]);

  const handleEditResponse = useCallback(
    (index, value) => {
      const updated = [...responses];
      updated[index].response = value;
      setResponses(updated);
    },
    [responses]
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem("session");
    setIsAuthenticated(false);
    setUserName("");
    setUserRole("");
  }, []);

  function PrivateRoute({ children }) {
    if (!sessionChecked) {
      return null; // or loader
    }
    return isAuthenticated ? children : <Navigate to="/login" />;
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin-register" element={<AdminRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-passowrd" element={<ResetPassword />} />
          <Route path="/verify-email-otp" element={<VerifyEmailByOtp />} />
          <Route path="/register-verified" element={<RegisterVerified />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/profile" element={<PrivateRoute><Layout userName={userName} userRole={userRole} onLogout={handleLogout} userId={userId}><Profile /></Layout></PrivateRoute>} />
          <Route path="/change-password" element={<PrivateRoute><Layout userName={userName} userRole={userRole} onLogout={handleLogout} userId={userId}><ChangePassword /></Layout></PrivateRoute>} />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout
                  userName={userName}
                  userRole={userRole}
                  onLogout={handleLogout}
                  userId={userId}
                >
                  <Home
                    userName={userName}
                    file={file}
                    setFile={setFile}
                    loading={loading}
                    setLoading={setLoading}
                    summary={summary}
                    setSummary={setSummary}
                    checklist={checklist}
                    setChecklist={setChecklist}
                    responses={responses}
                    setResponses={setResponses}
                    expandedIndex={expandedIndex}
                    setExpandedIndex={setExpandedIndex}
                    handleFileChange={handleFileChange}
                    handleUpload={handleUpload}
                    handleEditResponse={handleEditResponse}
                    pdfList={pdfList}
                    setPdfList={setPdfList}
                    pdfLoading={pdfLoading}
                    pageType={"home"}
                  />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/upload"
            element={
              <PrivateRoute>
                <Layout
                  userName={userName}
                  userRole={userRole}
                  onLogout={handleLogout}
                  userId={userId}
                >
                  <EnhancedUploadPdf />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/team-user"
            element={
              <PrivateRoute>
                <Layout
                  userName={userName}
                  userRole={userRole}
                  onLogout={handleLogout}
                  userId={userId}
                >
                  <TeamUser />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/submitted-questions"
            element={
              <PrivateRoute>
                <Layout
                  userName={userName}
                  userRole={userRole}
                  onLogout={handleLogout}
                  userId={userId}
                >
                  <Home
                    file={file}
                    setFile={setFile}
                    loading={loading}
                    setLoading={setLoading}
                    summary={summary}
                    setSummary={setSummary}
                    checklist={checklist}
                    setChecklist={setChecklist}
                    responses={responses}
                    setResponses={setResponses}
                    expandedIndex={expandedIndex}
                    setExpandedIndex={setExpandedIndex}
                    handleFileChange={handleFileChange}
                    handleUpload={handleUpload}
                    handleEditResponse={handleEditResponse}
                    pdfList={pdfList}
                    setPdfList={setPdfList}
                    pdfLoading={pdfLoading}
                    pageType={"submitted"}
                  />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/self-assign"
            element={
              <PrivateRoute>
                <Layout
                  userName={userName}
                  userRole={userRole}
                  onLogout={handleLogout}
                  userId={userId}
                >
                  <SelfAssignView />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/doc-list"
            element={
              <PrivateRoute>
                <Layout
                  userName={userName}
                  userRole={userRole}
                  onLogout={handleLogout}
                  userId={userId}
                >
                  <DocumentList />
                </Layout>
              </PrivateRoute>
            }
          />


          <Route
            path="/submitted-questions/:documentId"
            element={
              <PrivateRoute>
                <Layout
                  userName={userName}
                  userRole={userRole}
                  onLogout={handleLogout}
                  userId={userId}
                >
                  <ReviewerAssignedQuestions />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/reviewer-assigned-questions"
            element={
              <PrivateRoute>
                <Layout
                  userName={userName}
                  userRole={userRole}
                  onLogout={handleLogout}
                  userId={userId}
                >
                  <ReviewerAssignedQuestions />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/library"
            element={
              <PrivateRoute>
                <Layout
                  userName={userName}
                  userRole={userRole}
                  onLogout={handleLogout}
                  userId={userId}
                >
                  <Library setPdfList={fetchPdfList} />
                </Layout>
              </PrivateRoute>
            }
          />

          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
