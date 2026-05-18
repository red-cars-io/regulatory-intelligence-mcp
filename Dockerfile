# Specify the base Docker image. You can read more about
# the available images at https://docs.apify.com/sdk/js/docs/guides/docker-images
FROM apify/actor-node:24

# Copy just package.json and package-lock.json
# to speed up the build using Docker layer cache.
COPY --chown=myuser:myuser package*.json ./

# Install NPM packages, skip optional and development dependencies
# to keep the image small.
RUN npm --quiet set progress=false \
    && npm ci --legacy-peer-deps \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" && node --version \
    && rm -r ~/.npm

# Copy the remaining files
COPY --chown=myuser:myuser . ./

# Run the actor
CMD ["node", "src/main.js"]
