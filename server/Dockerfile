FROM alpine:latest

# Install dependencies
RUN apk add --no-cache curl bash

# Set working directory
WORKDIR /opt/cfx-server

# Download and install FiveM server
RUN curl -L https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/latest/fx.tar.xz | tar -xJ

# Create necessary directories
RUN mkdir -p cache logs resources

# Copy server configuration
COPY server.cfg .

# Expose ports
EXPOSE 30120 30121 30122

# Health check endpoint will be provided by ai_health resource
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:30120/health || exit 1

# Start the server
CMD ["./fx.sh", "+exec", "server.cfg"]