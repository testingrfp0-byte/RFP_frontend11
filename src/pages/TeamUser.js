import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";
import ConfirmationDialog from "../components/ConfirmationDialog";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const NGROK_HEADERS = {
  accept: "application/json",
  "ngrok-skip-browser-warning": "true",
};

function generatePassword(length = 10) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function TeamUser() {
  const { isDarkMode } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [message, setMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const calledOnceRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState("reviewers"); // New state for active tab
  const [reviewerUsers, setReviewerUsers] = useState([]); // New state for reviewer users
  const [adminUsers, setAdminUsers] = useState([]); // New state for admin users

  // Fetch all users on mount
  useEffect(() => {
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

        // Filter users into reviewers and admins and add is_active property
        setReviewerUsers(data.filter(user => user.role === "reviewer").map(user => ({ ...user, is_active: user.is_active !== undefined ? user.is_active : true })));
        setAdminUsers(data.filter(user => user.role === "admin").map(user => ({ ...user, is_active: user.is_active !== undefined ? user.is_active : true })));

      } catch (err) {
        setReviewerUsers([]);
        setAdminUsers([]);
      }
    };
    if (!calledOnceRef.current) {
      fetchUsers();
      calledOnceRef.current = true;
    }
  }, []);

  const openModal = () => {
    setName("");
    setEmail("");
    setPassword(generatePassword());
    setModalMessage("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setModalMessage("");
    if (!name || !email || !password) {
      setModalMessage("Please fill all fields.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: name,
          email,
          password,
          mode:"add",
          role: activeTab === "reviewers" ? "reviewer" : "admin", // Dynamically set role
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Registration failed");
      }
      // Update the correct user list based on the role
      const newUser = { username: name, email, role: activeTab === "reviewers" ? "reviewer" : "admin", password, is_active: true };
      if (newUser.role === "reviewer") {
        setReviewerUsers((prev) => [...prev, newUser]);
      } else if (newUser.role === "admin") {
        setAdminUsers((prev) => [...prev, newUser]);
      }

      setModalMessage("User registered successfully!");
      setTimeout(() => {
        setShowModal(false);
        setModalMessage("");
      }, 1000);
    } catch (err) {
      setModalMessage(err.message);
    }
    setLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setLoading(true);
    try {
      const session = localStorage.getItem("session");
      const token = session ? JSON.parse(session).token : null;

      const headers = {
        ...NGROK_HEADERS,
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const response = await fetch(`${API_BASE_URL}/delete-reviewer_user`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ user_id: userToDelete.user_id, role: userToDelete.role }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to delete user");
      }

      // Remove the user from the appropriate list
      if (userToDelete.role === "reviewer") {
        setReviewerUsers((prev) =>
          prev.filter((user) => user.email !== userToDelete.email)
        );
      } else if (userToDelete.role === "admin") {
        setAdminUsers((prev) =>
          prev.filter((user) => user.email !== userToDelete.email)
        );
      }

      setMessage(`User ${userToDelete.email} deleted successfully!`);
      closeConfirmDialog();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayedUsers = activeTab === "reviewers" ? reviewerUsers : adminUsers;

  const filteredUsers = displayedUsers.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredUsers.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  const nPages = Math.ceil(filteredUsers.length / recordsPerPage);

  // Handle page change
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const openConfirmDialog = (user) => {
    setUserToDelete(user);
    setShowConfirmDialog(true);
  };

  const closeConfirmDialog = () => {
    setShowConfirmDialog(false);
    setUserToDelete(null);
  };

  const tabs = [
    {
      id: "reviewers",
      label: "Reviewers",
      icon: "👥",
      count: reviewerUsers.length,
    },
    {
      id: "admins",
      label: "Admins",
      icon: "👑",
      count: adminUsers.length,
    },
  ];

  return (
    <div
      className={`p-6 transition-colors ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2
            className={`text-3xl font-bold mb-2 flex items-center gap-3 transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            <span className="text-4xl">👥</span>
            Team Management
          </h2>
          <p
            className={`transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Manage your team reviewers and their access
          </p>
        </div>

        <div
          className={`rounded-xl shadow-xl transition-colors ${
            isDarkMode
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-gray-200"
          }`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                <h3
                  className={`text-xl font-semibold transition-colors ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {activeTab === "reviewers" ? "Reviewers" : "Admins"}
                </h3>
                <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs">
                  {filteredUsers.length} {activeTab}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                placeholder={`Search ${activeTab === "reviewers" ? "Reviewers" : "Admins"} by name...`}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                  }}
                  className={`w-60 p-3 rounded-lg transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500 ${
                    isDarkMode
                      ? "bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                      : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
                  }`}
                />
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  onClick={openModal}
                >
                  <span style={{filter: 'brightness(3.5)'}}>➕</span>
                  {activeTab === "reviewers" ? "Add Reviewer" : "Add Admin"}
                </button>
              </div>
            </div>

            {/* Tabs */}
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
                        ? "bg-white dark:bg-gray-800 text-purple-600 shadow-sm"
                        : isDarkMode
                        ? "text-white hover:text-gray-400"
                        : "text-gray-700 hover:text-gray-400"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
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
                  </button>
                ))}
              </div>
            </div>

            {message && (
              <div className="mb-4 p-4 rounded-lg text-sm bg-green-500/10 border border-green-500/20 text-green-400">
                {message}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className={`border-b transition-colors ${
                      isDarkMode ? "border-gray-700" : "border-gray-200"
                    }`}
                  >
                    <th
                      className={`px-4 py-3 text-left font-medium transition-colors ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Name
                    </th>
                    <th
                      className={`px-4 py-3 text-left font-medium transition-colors ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Email
                    </th>
                    <th
                      className={`px-4 py-3 text-left font-medium transition-colors ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Role
                    </th>
                    {activeTab === "reviewers" && (
                      <th
                        className={`px-4 py-3 text-left font-medium transition-colors ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Delete
                      </th>
                    )}
                    {activeTab === "admins" && (
                      <th
                        className={`px-4 py-3 text-left font-medium transition-colors ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Status
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((user, idx) => (
                    <tr
                      key={idx}
                      className={`border-b transition-colors ${
                        isDarkMode
                          ? "border-gray-700 hover:bg-gray-750"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <span className="text-purple-400 text-sm">👤</span>
                          </div>
                          <span
                            className={`font-medium transition-colors ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {user.username || user.name}
                          </span>
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 transition-colors ${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === "admin"
                              ? "bg-purple-500/20 text-purple-400"
                              : isDarkMode
                              ? "bg-gray-600/50 text-gray-300"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      {activeTab === "reviewers" && (
                        <td className="px-4 py-3">
                          <button
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            onClick={() => openConfirmDialog(user)}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                      {activeTab === "admins" && (
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400`}
                          >
                            Active
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && ( /* Also ensure no content is shown if the user is loading or an error */
                    <tr>
                      <td
                        colSpan={activeTab === "reviewers" ? 4 : 3}
                        className={`px-4 py-8 text-center transition-colors ${
                          isDarkMode ? "text-gray-500" : "text-gray-500"
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-4xl mb-2">👥</span>
                          <p>No team reviewers added yet</p>
                          <p className="text-sm mt-1">
                            Add your first team reviewer to get started
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {nPages > 1 && (
          <div className="flex justify-center mt-6">
            <nav>
              <ul className="flex items-center gap-2">
                <li>
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50"
                        : "bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-50 border border-gray-300"
                    }`}
                  >
                    Previous
                  </button>
                </li>
                {[...Array(nPages)].map((_, index) => (
                  <li key={index}>
                    <button
                      onClick={() => paginate(index + 1)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        currentPage === index + 1
                          ? "bg-purple-600 text-white"
                          : isDarkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-white"
                          : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-300"
                      }`}
                    >
                      {index + 1}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === nPages}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50"
                        : "bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-50 border border-gray-300"
                    }`}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div
              className={`rounded-xl shadow-2xl p-6 w-full max-w-md relative transition-colors ${
                isDarkMode
                  ? "bg-gray-800 border border-gray-700"
                  : "bg-white border border-gray-200"
              }`}
            >
              <button
                className={`absolute top-4 right-4 transition-colors ${
                  isDarkMode
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={closeModal}
              >
                <span className="text-xl">✕</span>
              </button>

              <div className="mb-6">
                <h3
                  className={`text-2xl font-bold mb-2 transition-colors ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {activeTab === "reviewers" ? "Add Reviewer" : "Add Admin"}
                </h3>
                <p
                  className={`transition-colors ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {activeTab === "reviewers" ? "Invite a new reviewer to your team" : "Invite a new admin to your team"}
                </p>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 transition-colors ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full p-3 rounded-lg transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500 ${
                      isDarkMode
                        ? "bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                        : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
                    }`}
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 transition-colors ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full p-3 rounded-lg transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500 ${
                      isDarkMode
                        ? "bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                        : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
                    }`}
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 transition-colors ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Temporary Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Generated password"
                      value={password}
                      readOnly
                      className={`flex-1 p-3 rounded-lg font-mono transition-colors ${
                        isDarkMode
                          ? "bg-gray-700 border border-gray-600 text-white"
                          : "bg-gray-100 border border-gray-300 text-gray-900"
                      }`}
                    />
                    <button
                      type="button"
                      className={`px-4 py-3 rounded-lg transition-colors ${
                        isDarkMode
                          ? "bg-gray-600 hover:bg-gray-500 text-white"
                          : "bg-gray-300 hover:bg-gray-400 text-gray-700"
                      }`}
                      onClick={() => setPassword(generatePassword())}
                    >
                      🔄
                    </button>
                  </div>
                  <p
                    className={`text-sm mt-1 transition-colors ${
                      isDarkMode ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    User can change this password after first login
                  </p>
                </div>

                {modalMessage && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      modalMessage.includes("successfully")
                        ? "bg-green-500/10 border border-green-500/20 text-green-400"
                        : "bg-red-500/10 border border-red-500/20 text-red-400"
                    }`}
                  >
                    {modalMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Adding reviewer...
                    </div>
                  ) : (
                    activeTab === "reviewers" ? "Add Reviewer" : "Add Admin"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        <ConfirmationDialog
          isOpen={showConfirmDialog}
          onClose={closeConfirmDialog}
          onConfirm={handleDeleteUser}
          title="Confirm Deletion"
          message={`Are you sure you want to delete ${userToDelete?.email}? This action cannot be undone.`}
        />
      </div>
    </div>
  );
}
