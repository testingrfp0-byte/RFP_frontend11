import React, { useState, useEffect } from "react";

const APIDebugger = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

    const info = {
      API_BASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      hasSession: !!localStorage.getItem("session"),
      sessionData: localStorage.getItem("session") ? "Present" : "Missing",
      allEnvVars: Object.keys(process.env)
        .filter((key) => key.startsWith("REACT_APP"))
        .reduce((obj, key) => {
          obj[key] = process.env[key];
          return obj;
        }, {}),
    };

    setDebugInfo(info);

    testAPIEndpoints(API_BASE_URL);
  }, []);

  const testAPIEndpoints = async (API_BASE_URL) => {
    const results = {};

    if (!API_BASE_URL) {
      results.error = "API_BASE_URL is not defined";
      setTestResults(results);
      return;
    }

    const session = localStorage.getItem("session");
    let token = null;

    if (session) {
      try {
        const parsedSession = JSON.parse(session);
        token = parsedSession.token;
      } catch (e) {
        results.sessionError = "Invalid session JSON";
      }
    }

    const headers = {
      accept: "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const statuses = ["submitted", "not submitted", "process"];

    for (const status of statuses) {
      try {
        const url = `${API_BASE_URL}/filter-questions-by-user/${encodeURIComponent(
          status
        )}`;

        const response = await fetch(url, { headers });

        results[status] = {
          url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        };

        if (response.ok) {
          try {
            const data = await response.json();
            results[status].data = data;
          } catch (e) {
            results[status].jsonError = e.message;
          }
        } else {
          try {
            const errorText = await response.text();
            results[status].errorText = errorText;
          } catch (e) {
            results[status].readError = e.message;
          }
        }
      } catch (error) {
        results[status] = {
          error: error.message,
          type: error.name,
        };
      }
    }

    setTestResults(results);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        background: "white",
        border: "2px solid red",
        padding: "20px",
        zIndex: 9999,
        maxWidth: "400px",
        maxHeight: "80vh",
        overflow: "auto",
        fontSize: "12px",
      }}
    >
      <h3>🔧 API Debug Info</h3>

      <h4>Configuration:</h4>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>

      <h4>API Test Results:</h4>
      <pre>{JSON.stringify(testResults, null, 2)}</pre>

      <button onClick={() => window.location.reload()}>Refresh Page</button>
    </div>
  );
};

export default APIDebugger;
