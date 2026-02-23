import styles from "../../styles/EmbedPreview.module.css";

export default function EmbedPreview({ embedData }) {
  const decimalToHex = (decimal) => {
    return "#" + (decimal || 0).toString(16).padStart(6, "0");
  };

  return (
    <div className={styles.previewContainer}>
      {/* Content (outside embed) */}
      {embedData.content && (
        <div className={styles.messageContent}>{embedData.content}</div>
      )}

      {/* Embeds */}
      {embedData.embeds.map((embed, index) => (
        <div key={index} className={styles.embed}>
          <div
            className={styles.embedSidebar}
            style={{ backgroundColor: decimalToHex(embed.color) }}
          />

          <div className={styles.embedContent}>
            {/* Author */}
            {embed.author?.name && (
              <div className={styles.embedAuthor}>
                {embed.author.icon_url && (
                  <img
                    src={embed.author.icon_url}
                    alt="Author icon"
                    className={styles.embedAuthorIcon}
                    onError={(e) => (e.target.style.display = "none")}
                  />
                )}
                {embed.author.url ? (
                  <a
                    href={embed.author.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.embedAuthorName}
                  >
                    {embed.author.name}
                  </a>
                ) : (
                  <span className={styles.embedAuthorName}>
                    {embed.author.name}
                  </span>
                )}
              </div>
            )}

            {/* Title */}
            {embed.title && (
              <div className={styles.embedTitle}>
                {embed.url ? (
                  <a href={embed.url} target="_blank" rel="noopener noreferrer">
                    {embed.title}
                  </a>
                ) : (
                  embed.title
                )}
              </div>
            )}

            {/* Description */}
            {embed.description && (
              <div className={styles.embedDescription}>{embed.description}</div>
            )}

            {/* Fields */}
            {embed.fields && embed.fields.length > 0 && (
              <div className={styles.embedFields}>
                {embed.fields.map((field, fieldIndex) => (
                  <div
                    key={fieldIndex}
                    className={`${styles.embedField} ${
                      field.inline ? styles.embedFieldInline : ""
                    }`}
                  >
                    <div className={styles.embedFieldName}>{field.name}</div>
                    <div className={styles.embedFieldValue}>{field.value}</div>
                  </div>
                ))}
              </div>
            )}
            {/* Large Image */}
            {embed.image?.url && (
              <div className={styles.embedImage}>
                <img
                  src={embed.image.url}
                  alt="Embed"
                  onError={(e) => (e.target.style.display = "none")}
                />
              </div>
            )}

            {/* Thumbnail */}
            {embed.thumbnail?.url && (
              <div className={styles.embedThumbnail}>
                <img
                  src={embed.thumbnail.url}
                  alt="Thumbnail"
                  onError={(e) => (e.target.style.display = "none")}
                />
              </div>
            )}
            {/* Footer */}
            {(embed.footer?.text || embed.timestamp) && (
              <div className={styles.embedFooter}>
                {embed.footer?.icon_url && (
                  <img
                    src={embed.footer.icon_url}
                    alt="Footer icon"
                    className={styles.embedFooterIcon}
                    onError={(e) => (e.target.style.display = "none")}
                  />
                )}
                <span>
                  {embed.footer?.text}
                  {embed.footer?.text && embed.timestamp && " • "}
                  {embed.timestamp &&
                    new Date(embed.timestamp).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Components (Buttons) */}
      {embedData.components && embedData.components.length > 0 && (
        <div className={styles.components}>
          {embedData.components.map((row, rowIndex) => (
            <div key={rowIndex} className={styles.componentRow}>
              {row.components.map((button, buttonIndex) => (
                <a
                  key={buttonIndex}
                  href={button.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkButton}
                >
                  {button.emoji && (
                    <span className={styles.buttonEmoji}>
                      {button.emoji.id ? (
                        <img
                          src={`https://cdn.discordapp.com/emojis/${button.emoji.id}.png`}
                          alt={button.emoji.name}
                        />
                      ) : (
                        button.emoji.name
                      )}
                    </span>
                  )}
                  {button.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
