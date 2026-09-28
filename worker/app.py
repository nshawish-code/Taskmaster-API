# Legacy Flask worker (Python 3.6 era)
import os
import yaml
import requests
from flask import Flask, request, jsonify, render_template_string

app = Flask(__name__)
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "http://localhost:9000/hook")

with open(os.path.join(os.path.dirname(__file__), "config.yml")) as f:
    CONFIG = yaml.safe_load(f)  # old PyYAML API: no explicit Loader

TEMPLATE = "Reminder for {{ user }}: task {{ task_id }} is due soon."


@app.route("/health")
def health():
    return jsonify(status="ok")


@app.route("/jobs", methods=["POST"])
def create_job():
    body = request.get_json(force=True)
    message = render_template_string(TEMPLATE, user=body.get("user"), task_id=body.get("task_id"))
    try:
        requests.post(WEBHOOK_URL, json={"text": message}, timeout=5)
    except requests.RequestException as exc:
        return jsonify(error=str(exc)), 502
    return jsonify(status="queued", message=message), 202


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
