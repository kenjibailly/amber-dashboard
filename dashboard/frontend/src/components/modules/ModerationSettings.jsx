import { useState, useEffect } from "react";
import axios from "axios";
import styles from "../../styles/ModuleSettings.module.css";
import editorStyles from "../../styles/EditorStyles.module.css";

const defaultRule = { name: "", description: "" };

const defaultTimeoutSteps = [
  { step: 1, duration: 10, unit: "minutes" },
  { step: 2, duration: 1, unit: "hours" },
  { step: 3, duration: 24, unit: "hours" },
];

function rebuildPositions(rules) {
  return rules.map((r, i) => ({ ...r, position: i + 1 }));
}

function rebuildSteps(steps) {
  return steps.map((s, i) => ({ ...s, step: i + 1 }));
}

export default function ModerationSettings({ guildId, user }) {
  const [rules, setRules] = useState([]);
  const [timeoutSteps, setTimeoutSteps] = useState(defaultTimeoutSteps);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({ ...defaultRule });

  useEffect(() => {
    fetchSettings();
  }, [guildId]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(
        `/guilds/${guildId}/modules/moderation`,
        { withCredentials: true },
      );
      const settings = response.data.settings || {};

      const fetched = settings.rules || [];
      const sorted = [...fetched].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      );
      setRules(rebuildPositions(sorted));

      // Use saved steps or fall back to defaults
      if (settings.timeoutSteps?.length > 0) {
        setTimeoutSteps(settings.timeoutSteps);
      } else {
        setTimeoutSteps(defaultTimeoutSteps);
      }
    } catch (err) {
      console.error("Failed to fetch moderation settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await axios.put(
        `/guilds/${guildId}/modules/moderation/settings/${user.id}/@${user.username}`,
        { settings: { rules, timeoutSteps } },
        { withCredentials: true },
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save moderation settings:", err);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── RULES ────────────────────────────────────────────────────────────────

  const moveRule = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= rules.length) return;
    const updated = [...rules];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setRules(rebuildPositions(updated));
    if (editingIndex === index) setEditingIndex(newIndex);
  };

  const startAdd = () => {
    setEditForm({ ...defaultRule });
    setEditingIndex("new");
  };

  const startEdit = (index) => {
    setEditForm({ ...rules[index] });
    setEditingIndex(index);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditForm({ ...defaultRule });
  };

  const confirmEdit = () => {
    if (!editForm.name.trim()) return;
    if (editingIndex === "new") {
      setRules((prev) => rebuildPositions([...prev, { ...editForm }]));
    } else {
      setRules((prev) =>
        rebuildPositions(
          prev.map((r, i) =>
            i === editingIndex ? { ...editForm, position: r.position } : r,
          ),
        ),
      );
    }
    setEditingIndex(null);
    setEditForm({ ...defaultRule });
  };

  const deleteRule = (index) => {
    setRules((prev) => rebuildPositions(prev.filter((_, i) => i !== index)));
    if (editingIndex === index) cancelEdit();
  };

  // ── TIMEOUT STEPS ─────────────────────────────────────────────────────────

  const addTimeoutStep = () => {
    setTimeoutSteps((prev) =>
      rebuildSteps([
        ...prev,
        { step: prev.length + 1, duration: 1, unit: "hours" },
      ]),
    );
  };

  const updateTimeoutStep = (index, field, value) => {
    setTimeoutSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeTimeoutStep = (index) => {
    setTimeoutSteps((prev) => rebuildSteps(prev.filter((_, i) => i !== index)));
  };

  const moveTimeoutStep = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= timeoutSteps.length) return;
    const updated = [...timeoutSteps];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setTimeoutSteps(rebuildSteps(updated));
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className={styles.settingsForm}>
      {/* ── RULES ── */}
      <section className={editorStyles.section}>
        <h2>Rules</h2>
        <p style={{ marginBottom: "1.5rem", opacity: 0.7, fontSize: "0.9rem" }}>
          Add, edit or remove server rules. Use the arrows to reorder them.
        </p>

        {rules.length === 0 && editingIndex !== "new" && (
          <p
            style={{ opacity: 0.5, fontStyle: "italic", marginBottom: "1rem" }}
          >
            No rules configured yet.
          </p>
        )}

        {rules.map((rule, index) => (
          <div
            key={index}
            className={editorStyles.entryBlock}
            style={{ marginBottom: "12px" }}
          >
            {editingIndex === index ? (
              <div className={editorStyles.entryFields}>
                <div style={{ marginBottom: "10px" }}>
                  <label className={styles.label}>Rule name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Be respectful"
                    className={editorStyles.input}
                    autoFocus
                  />
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe this rule in detail..."
                    className={editorStyles.input}
                    rows={3}
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className={styles.saveButton}
                    onClick={confirmEdit}
                    disabled={!editForm.name.trim()}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className={editorStyles.removeButton}
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => moveRule(index, -1)}
                    disabled={index === 0}
                    className={styles.saveButton}
                    style={{
                      padding: "2px 8px",
                      fontSize: "0.75rem",
                      opacity: index === 0 ? 0.3 : 1,
                    }}
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRule(index, 1)}
                    disabled={index === rules.length - 1}
                    className={styles.saveButton}
                    style={{
                      padding: "2px 8px",
                      fontSize: "0.75rem",
                      opacity: index === rules.length - 1 ? 0.3 : 1,
                    }}
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>
                <div
                  className={editorStyles.input}
                  style={{ flex: 1, marginBottom: 0 }}
                >
                  <div className={editorStyles.entryType}>
                    {rule.position}. {rule.name}
                  </div>
                  {rule.description && (
                    <p
                      style={{
                        margin: "4px 0 0",
                        opacity: 0.7,
                        fontSize: "0.875rem",
                      }}
                    >
                      {rule.description}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button
                    type="button"
                    className={styles.saveButton}
                    onClick={() => startEdit(index)}
                    style={{ padding: "4px 12px", fontSize: "0.85rem" }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={editorStyles.removeButton}
                    onClick={() => deleteRule(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {editingIndex === "new" && (
          <div
            className={editorStyles.entryBlock}
            style={{ marginBottom: "12px" }}
          >
            <div className={editorStyles.entryFields}>
              <div style={{ marginBottom: "10px" }}>
                <label className={styles.label}>Rule name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Be respectful"
                  className={editorStyles.input}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label className={styles.label}>Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Describe this rule in detail..."
                  className={editorStyles.input}
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={confirmEdit}
                  disabled={!editForm.name.trim()}
                >
                  Add Rule
                </button>
                <button
                  type="button"
                  className={editorStyles.removeButton}
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {editingIndex !== "new" && (
          <button
            type="button"
            className={styles.saveButton}
            onClick={startAdd}
            style={{ marginTop: "8px" }}
          >
            + Add Rule
          </button>
        )}
      </section>

      {/* ── TIMEOUT STEPS ── */}
      <section className={editorStyles.section}>
        <h2>Timeout Durations</h2>
        <p style={{ marginBottom: "1.5rem", opacity: 0.7, fontSize: "0.9rem" }}>
          Configure how long a user is timed out per offense. Step 1 = first
          offense, step 2 = second, and so on. The last step is used for all
          further offenses beyond the configured range.
        </p>

        {timeoutSteps.map((step, index) => (
          <div
            key={index}
            className={editorStyles.entryBlock}
            style={{ marginBottom: "12px" }}
          >
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {/* Arrow buttons */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => moveTimeoutStep(index, -1)}
                  disabled={index === 0}
                  className={styles.saveButton}
                  style={{
                    padding: "2px 8px",
                    fontSize: "0.75rem",
                    opacity: index === 0 ? 0.3 : 1,
                  }}
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveTimeoutStep(index, 1)}
                  disabled={index === timeoutSteps.length - 1}
                  className={styles.saveButton}
                  style={{
                    padding: "2px 8px",
                    fontSize: "0.75rem",
                    opacity: index === timeoutSteps.length - 1 ? 0.3 : 1,
                  }}
                  title="Move down"
                >
                  ▼
                </button>
              </div>

              {/* Step label */}
              <span
                className={editorStyles.entryType}
                style={{ flexShrink: 0, minWidth: "60px" }}
              >
                {index === timeoutSteps.length - 1
                  ? `Step ${step.step}+`
                  : `Step ${step.step}`}
              </span>

              {/* Duration input */}
              <input
                type="number"
                min="1"
                value={step.duration}
                onChange={(e) =>
                  updateTimeoutStep(
                    index,
                    "duration",
                    parseInt(e.target.value) || 1,
                  )
                }
                className={editorStyles.input}
                style={{ width: "80px", marginBottom: 0 }}
              />

              {/* Unit select */}
              <select
                value={step.unit}
                onChange={(e) =>
                  updateTimeoutStep(index, "unit", e.target.value)
                }
                className={editorStyles.input}
                style={{ marginBottom: 0 }}
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>

              {/* Remove — always keep at least 1 step */}
              <button
                type="button"
                className={editorStyles.removeButton}
                onClick={() => removeTimeoutStep(index)}
                disabled={timeoutSteps.length <= 1}
                style={{
                  flexShrink: 0,
                  opacity: timeoutSteps.length <= 1 ? 0.3 : 1,
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          className={styles.saveButton}
          onClick={addTimeoutStep}
          style={{ marginTop: "8px" }}
        >
          + Add Step
        </button>
      </section>

      {/* ── SAVE ── */}
      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={styles.saveButton}
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saveSuccess && (
          <span className={styles.successMessage}>
            ✓ Settings saved successfully!
          </span>
        )}
      </div>
    </div>
  );
}
