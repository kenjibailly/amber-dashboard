import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import styles from "../styles/Dashboard.module.css";
import useAuth from "../hooks/useAuth";

export default function ChangeLogs() {
  const { guildId } = useParams();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalLogs: 0,
    logsPerPage: 50,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const { user, guilds, loading } = useAuth();
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    if (guildId) {
      fetchLogs(1);
    }
  }, [guildId]);

  const fetchLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const response = await axios.get(
        `/guilds/${guildId}/change_logs?page=${page}&limit=50`,
        {
          withCredentials: true,
        }
      );
      setLogs(response.data.changeLogs);
      setPagination(response.data.pagination);
      setLogsLoading(false);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setLogsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchLogs(newPage);
      // Scroll to top of table
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <Navbar user={user} guilds={guilds} selectedGuildId={guildId} />
      <div style={{ padding: "2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1>Change Logs</h1>
          {!logsLoading && pagination.totalLogs > 0 && (
            <span style={{ color: "var(--muted-text)" }}>
              {pagination.totalLogs} total log
              {pagination.totalLogs !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {logsLoading ? (
          <div>Loading logs...</div>
        ) : (
          <>
            {logs.length === 0 ? (
              <p>No change logs found.</p>
            ) : (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User ID</th>
                      <th>User Name</th>
                      <th>Module</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id}>
                        <td>
                          {new Date(log.createdAt).toLocaleString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td>{log.user.id}</td>
                        <td>{log.user.name}</td>
                        <td>
                          <span className={styles.moduleBadge}>
                            {log.moduleId}
                          </span>
                        </td>
                        <td>{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      onClick={() =>
                        handlePageChange(pagination.currentPage - 1)
                      }
                      disabled={!pagination.hasPrevPage}
                      className={styles.paginationButton}
                    >
                      ← Previous
                    </button>

                    <div className={styles.paginationInfo}>
                      <span>
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>
                      <span className={styles.paginationDetails}>
                        Showing {(pagination.currentPage - 1) * pagination.logsPerPage + 1} to{" "}
                        {Math.min(
                          pagination.currentPage * pagination.logsPerPage,
                          pagination.totalLogs
                        )}{" "}
                        of {pagination.totalLogs}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        handlePageChange(pagination.currentPage + 1)
                      }
                      disabled={!pagination.hasNextPage}
                      className={styles.paginationButton}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}