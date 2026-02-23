import { useNavigate } from "react-router-dom";
import { useState } from "react";
import styles from "../styles/Dashboard.module.css";
import useAuth from "../hooks/useAuth";
import Login from "../pages/Login";
import AmberLogo from "../assets/amber.png";

export default function MainNavbar() {
  const { user, guilds, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <nav className={styles.navBar}>
      <div class={styles.navLinkContainer}>
        <a class={styles.navLink} href="/">
          <img
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              marginRight: "2rem",
            }}
            src={AmberLogo}
            alt=""
          />
          Home
        </a>
        <a class={styles.navLink} href="/help">
          Help
        </a>
        <a class={styles.navLink} href="/status">
          Status
        </a>
      </div>
      <div style={{ display: "inline-flex" }}>
        <div style={{ textAlign: "center", marginLeft: "auto" }}>
          <a
            href={`https://discord.com/api/oauth2/authorize?client_id=${
              import.meta.env.VITE_DISCORD_CLIENT_ID
            }&permissions=8&scope=bot`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginRight: "10px" }}
          >
            <button class={styles.button}>Add to server</button>
          </a>
        </div>

        {user ? (
          <div style={{ textAlign: "center" }}>
            <a href="/dashboard">
              <button class={styles.button}>Dashboard</button>
            </a>
          </div>
        ) : (
          <Login />
        )}
      </div>
    </nav>
  );
}
