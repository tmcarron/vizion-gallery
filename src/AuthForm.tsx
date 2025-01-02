import "./AuthForm.css";
import { useState } from "react";
import axios from "axios";

const apiBaseUrl = "http://localhost:5173/login";

const AuthForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: any) => {
    e.preventDefault();

    try {
      const response = await axios.post(apiBaseUrl, {
        email,
        password,
      });
      if (response.data.success) {
        localStorage.setItem("authToken", response.data.token);
        alert("Login successful");
        // Perform additional actions, e.g., saving tokens or redirecting
      } else {
        setErrorMessage(response.data.message);
      }
    } catch (error) {}
  };

  return (
    <div>
      <form onSubmit={handleLogin}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Log In</button>
      </form>

      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
    </div>
  );
};

export default AuthForm;
