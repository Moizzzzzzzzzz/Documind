FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ ./api/
COPY core/ ./core/
COPY services/ ./services/
COPY main.py .

# Create the data directories fresh — never copy local dev data (which can
# contain a stale FAISS index) into the image.
RUN mkdir -p /app/data/uploads /app/data/vector_store

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
