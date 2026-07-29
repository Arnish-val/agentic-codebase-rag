FROM python:3.11-slim

# Create isolated non-root user
RUN useradd -m -u 1000 sandboxuser

WORKDIR /sandbox

# Pre-install standard utility libraries
RUN pip install --no-cache-dir requests numpy pandas

USER sandboxuser
CMD ["python3"]
