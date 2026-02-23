# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy backend & frontend code
COPY ./backend ./backend
COPY ./frontend ./frontend

# ------------------------
# Install backend dependencies
# ------------------------
WORKDIR /app/backend
RUN npm install

# ------------------------
# Install frontend dependencies & build
# ------------------------
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# ------------------------
# Install nodemon globally (optional for dev)
# ------------------------
RUN npm install -g nodemon

# Expose port used by backend
EXPOSE 8080

# Set working directory back to backend
WORKDIR /app/backend

# Start backend using nodemon in dev or node in production
# Default: node
# CMD ["node", "index.js"]
# To use nodemon for dev: replace the above line with:
CMD ["nodemon", "index.js"]
