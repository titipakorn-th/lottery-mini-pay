FROM node:18-alpine AS runner

WORKDIR /app

# Install dependencies only needed for running the app
RUN yarn global add next

# Copy built application files
COPY packages/react-app/.next ./.next
COPY packages/react-app/public ./public
COPY packages/react-app/package.json ./
COPY packages/react-app/next.config.js ./

# Install production dependencies only
RUN yarn install --production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port the app will run on
EXPOSE 3000

# Start the application
CMD ["yarn", "start"] 