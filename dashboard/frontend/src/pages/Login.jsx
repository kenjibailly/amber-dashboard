import styles from "../styles/Dashboard.module.css";

export default function Login() {
  return (
    <div style={{ textAlign: "center" }}>
      {/* <h1>Login with Discord</h1> */}
      <a href="/auth/login">
        <button class={styles.button}>Login</button>
      </a>
    </div>
  );
}
