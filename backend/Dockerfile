FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8080 BR_ENV=production
WORKDIR /srv/br
COPY requirements-runtime.txt ./
RUN pip install --no-cache-dir -r requirements-runtime.txt     && useradd --create-home --uid 10001 br
COPY --chown=br:br app ./app
COPY --chown=br:br serve.py ./serve.py
USER br
EXPOSE 8080
CMD ["python", "serve.py"]
