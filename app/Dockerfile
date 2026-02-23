FROM ubuntu:latest

# Set user and working directory
USER root
WORKDIR /home/ubuntu/amber

# Copy the bot files into the container
COPY . /home/ubuntu/amber/

# Install dependencies
RUN apt-get update -y && \
    apt-get install -y curl && \
    curl -sL https://deb.nodesource.com/setup_20.x | bash && \
    apt-get install -y nodejs

RUN apt-get install -y \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libfontconfig1

# Install nodemon globally and install project dependencies
RUN npm install -g --force nodemon && \
    npm install

# Set the default command to run your bot
CMD ["npm", "start"]

# Expose port 3000 if your bot uses it for an HTTP server
EXPOSE 3000