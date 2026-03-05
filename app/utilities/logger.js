class Logger {
  constructor(stat) {
    this.stat = stat;
  }

  _timestamp() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  _print(color, level, ...args) {
    process.stdout.write(color);
    process.stdout.write(`[${this._timestamp()}] [${level}] ${this.stat}: `);
    this._writeMessage(...args);
    process.stdout.write("\x1b[0m\n");
  }

  log(...args) {
    this._print("\x1b[37m", "LOG", ...args);
  }

  info(...args) {
    this._print("\x1b[34m", "INFO", ...args);
  }

  success(...args) {
    this._print("\x1b[32m", "SUCCESS", ...args);
  }

  warn(...args) {
    this._print("\x1b[33m", "WARN", ...args);
  }

  error(...args) {
    this._print("\x1b[31m", "ERROR", ...args);
  }

  async _writeMessage(...args) {
    for (const arg of args) {
      if (arg instanceof Error) {
        process.stdout.write(`${arg.message}\n${arg.stack} `);
      } else if (arg instanceof Map) {
        process.stdout.write(
          `\n${JSON.stringify(Array.from(arg.entries()), null, 2)} `,
        );
      } else if (typeof arg === "object" && typeof arg?.then === "function") {
        try {
          const result = await arg;
          process.stdout.write(
            `\nResolved Promise: ${JSON.stringify(result, null, 2)} `,
          );
        } catch (error) {
          process.stdout.write(`\nRejected Promise: ${error} `);
        }
      } else if (typeof arg === "object") {
        process.stdout.write(`\n${JSON.stringify(arg, null, 2)} `);
      } else {
        process.stdout.write(`${arg} `);
      }
    }
  }
}

module.exports = Logger;
