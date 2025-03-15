FROM node:22 AS build-client

WORKDIR /workspace/client

COPY client/package*.json ./
RUN npm install

COPY client .
RUN npm run build


FROM python:3.11-slim

ENV PYTHONUNBUFFERED 1

WORKDIR /app

COPY requirements.txt /app/

RUN pip install --no-cache-dir -r requirements.txt

COPY --from=build-client /workspace/client/dist/index.html /app/templates/index.html
COPY --from=build-client /workspace/client/dist /app/static
COPY server /app/

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]