# Docker Deployment Guide

This guide explains how to deploy the lottery application using Docker with pre-built Next.js files.

## Prerequisites

- Docker and Docker Compose installed on your server
- Built Next.js application files

## Deployment Steps

1. Build your Next.js application locally:
   ```bash
   cd packages/react-app
   yarn build
   ```

2. Transfer the following files to your server:
   - Dockerfile
   - docker-compose.yml
   - .dockerignore
   - packages/react-app/.next (directory)
   - packages/react-app/public (directory)
   - packages/react-app/package.json
   - packages/react-app/next.config.js

3. On your server, navigate to the directory containing the Dockerfile and run:
   ```bash
   docker-compose up -d
   ```

4. The application will be available at `http://your-server-ip:3000`

## Configuration

- To change the port, modify the `ports` section in the `docker-compose.yml` file.
- Environment variables can be added to the `environment` section in the `docker-compose.yml` file.

## Troubleshooting

- If the application doesn't start, check the logs:
  ```bash
  docker-compose logs
  ```

- If you need to rebuild the Docker image:
  ```bash
  docker-compose build --no-cache
  docker-compose up -d
  ``` 