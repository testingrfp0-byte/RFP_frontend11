import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

export const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); 

  const queryParams = new URLSearchParams(location.search);
  const otp = queryParams.get("otp");
  const email = queryParams.get("email");
  const password = queryParams.get("password");
  const role = queryParams.get("role");

  useEffect(() => {
    const verify = async () => {
      try {
       const response = await axios.get(
          "https://3348b4efb3ca.ngrok-free.app/verify-email",
          {
            params: { otp, email, role },
            headers: {
              "ngrok-skip-browser-warning": "true",
            },
             }
        );
        if (response.status === 200 ||response.status === 201) {
          setStatus("success");
            navigate("/register-verified", { state: { email, password ,role } });
        } 
      } catch (err) {
        setStatus("error");
      }
    };

    if (otp && email) {
      verify();
    } else {
      setStatus("error");
    }
  }, [otp, email]);

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      {status === "loading" && <h2>Verifying your email...</h2>}

      {status === "success" && (
        <div>
          <h2 style={{ color: "green" }}>✅ Your email has been verified!</h2>
          <button
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "blue",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
            onClick={() => navigate("/login")}
          >
            Go to Login
          </button>
        </div>
      )}

      {status === "error" && (
        <h2 style={{ color: "red" }}>
          ❌ Verification link is invalid or expired.
        </h2>
      )}
    </div>
  );
};
