import argparse
import base64
import concurrent.futures
import hashlib
import io
import itertools
import json
import os
from pathlib import Path
import time
import urllib.request
import urllib.error

import jsonschema
from PIL import Image, ImageDraw, ImageFont


def image_content(case, font_path):
    image = Image.new("RGB", (1200, 100 + 65 * len(case["lines"])), "white")
    drawing = ImageDraw.Draw(image)
    font = ImageFont.truetype(font_path, 32)
    tuple(map(lambda item: drawing.text((30, 30 + item[0] * 65), item[1], font=font, fill="black"), enumerate(case["lines"])))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return [
        {"type": "text", "text": "Here is the image of the page"},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()}},
    ]


def passed(case, response):
    if case["kind"] == "answer":
        return response["correct"] == case["correct"] and (
            response["explanation"] == "" if case["correct"] else bool(response["explanation"].strip()))
    words = {item["word"]: item for item in response["wordList"]}
    forms_match = all(word in words and words[word]["forms"] == forms for word, forms in case["forms"].items())
    if "examples" in case:
        return forms_match and set(words) == set(case["forms"]) and all(
            words[word]["examples"] == examples for word, examples in case["examples"].items())
    return forms_match and all(len(words[word]["examples"]) == 1 for word in case["forms"] if word in words)


def evaluate(job, exports, args):
    variant, model, repetition, case = job
    export = exports[variant]
    key = "answer-" + case["language"] if case["kind"] == "answer" else "words-" + case["format"] + "-" + case["level"]
    template = export["prompts"][key]
    prompt = template.replace("{{question}}", case["question"]).replace("{{expected}}", case["expected"]) if case["kind"] == "answer" else template
    content = "The learner's answer: " + case["answer"] if case["kind"] == "answer" else image_content(case, args.font)
    schema = export["schemas"][case["kind"]]
    body = {
        "model": model,
        "messages": [{"role": "system", "content": prompt}, {"role": "user", "content": content}],
        "response_format": {"type": "json_schema", "json_schema": {"name": case["kind"], "strict": True, "schema": schema}},
        **({"reasoning_effort": "low"} if model == "gpt-6.1-sol" else {}),
    }
    request = urllib.request.Request("https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode(), headers={"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"], "Content-Type": "application/json"})
    start = time.monotonic()
    with urllib.request.urlopen(request, timeout=180) as stream:
        result = json.load(stream)
    elapsed = round((time.monotonic() - start) * 1000)
    response = json.loads(result["choices"][0]["message"]["content"])
    jsonschema.validate(response, schema)
    return {"variant": variant, "model": model, "case": case["id"], "repetition": repetition,
        "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(), "response": response,
        "passed": passed(case, response), "schema_valid": True, "latency_ms": elapsed,
        "usage": result["usage"]}


def main():
    parser = argparse.ArgumentParser(description="Paid, opt-in live comparison of exported production prompts. Never writes application data.")
    parser.add_argument("--baseline", required=True)
    parser.add_argument("--revised", required=True)
    parser.add_argument("--cases", default="docs/prompt-audit/cases.json")
    parser.add_argument("--models", nargs="+", required=True)
    parser.add_argument("--repetitions", type=int, default=3)
    parser.add_argument("--output", required=True)
    parser.add_argument("--font", default="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    args = parser.parse_args()
    if args.repetitions < 1:
        parser.error("--repetitions must be positive")
    exports = {"baseline": json.loads(Path(args.baseline).read_text()), "revised": json.loads(Path(args.revised).read_text())}
    cases = json.loads(Path(args.cases).read_text())
    if not cases:
        parser.error("the evaluation must contain at least one case")
    jobs = itertools.product(exports, args.models, range(args.repetitions), cases)
    def recorded_evaluation(job):
        try:
            return evaluate(job, exports, args)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError,
                TypeError, KeyError, IndexError, jsonschema.ValidationError) as error:
            return {"variant": job[0], "model": job[1], "repetition": job[2], "case": job[3]["id"],
                "passed": False, "error": str(error),
                "details": error.read().decode() if isinstance(error, urllib.error.HTTPError) else str(error)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(recorded_evaluation, jobs))
    Path(args.output).write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({variant: {"passed": sum(item["passed"] for item in results if item["variant"] == variant),
        "total": sum(item["variant"] == variant for item in results)} for variant in exports}))
    if any("error" in item for item in results) or not all(
            item["passed"] for item in results if item["variant"] == "revised"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
