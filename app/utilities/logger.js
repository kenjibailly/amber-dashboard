class Logger {
  constructor(stat) {
    this.stat = stat;
  }

  log(...args) {
    process.stdout.write(`${this.stat}: `);
    this._writeMessage(...args); // print message
    process.stdout.write(`\n`);
  }

  info(...args) {
    process.stdout.write("\x1b[34m"); // set color to blue
    process.stdout.write(`${this.stat}: `);
    this._writeMessage(...args); // print message
    process.stdout.write("\x1b[0m\n"); // reset color
  }

  success(...args) {
    process.stdout.write("\x1b[32m"); // set color to green
    process.stdout.write(`${this.stat}: `);
    this._writeMessage(...args); // print message
    process.stdout.write("\x1b[0m\n"); // reset color
  }

  error(...args) {
    process.stdout.write("\x1b[31m"); // set color to red
    process.stdout.write(`${this.stat}: `);
    this._writeMessage(...args); // print error message
    process.stdout.write("\x1b[0m\n"); // reset color
  }

  warn(...args) {
    process.stdout.write("\x1b[33m"); // set color to yellow
    process.stdout.write(`${this.stat}: `);
    this._writeMessage(...args); // print message
    process.stdout.write("\x1b[0m\n"); // reset color
  }

  async _writeMessage(...args) {
    for (const arg of args) {
      if (arg instanceof Error) {
        process.stdout.write(`${arg.message}\n${arg.stack} `);
      } else if (arg instanceof Map) {
        // Convert Map to an array of entries for logging
        process.stdout.write(
          `\n${JSON.stringify(Array.from(arg.entries()), null, 2)} \n`
        );
      } else if (typeof arg === "object" && typeof arg.then === "function") {
        // Handle promises by awaiting their result
        try {
          const result = await arg; // Await the promise resolution
          process.stdout.write(
            `\nResolved Promise: ${JSON.stringify(result, null, 2)} \n`
          );
        } catch (error) {
          process.stdout.write(`\nRejected Promise: ${error} \n`);
        }
      } else if (typeof arg === "object") {
        process.stdout.write(`\n${JSON.stringify(arg, null, 2)} \n`);
      } else {
        process.stdout.write(`${arg} `);
      }
    }
  }
}

module.exports = Logger;
