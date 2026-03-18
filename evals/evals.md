# AI Evals for LLM Classification

Evaluation framework for LLM-based classification and theme generation.

---

## A. Classification Quality

### 1. Factual Accuracy / Contextual Relevance

**Method:** LLM-as-a-judge

**Prompt:**
```
Given input and classification output:
Score relevance from 1–5 based on:
- Does classification reflect input meaning?
- Is context preserved?
```

**Metric:** Aggregate average score (1–5)

---

### 2. Consistency

Run same input N times (e.g., 5).

**Measure:**
- % identical outputs
- Embedding similarity between outputs

**Metric:** `consistency_score = avg cosine similarity`

---

### 3. Classification Accuracy (proxy)

Since no labels:

- **Option A:** Human-labeled subset (~100 samples with true labels)
- **Option B:** Cluster agreement — compare LLM classification vs embedding clustering (e.g., k-means)

**Metric:** `agreement_score = % overlap`

---

### 4. Creativity (human)

Human raters score:
- Novelty
- Insightfulness
- Non-generic outputs

**Scale:** 1–5  
**Sample size:** ~50/week

---

### 5. Hallucination Rate

Check if output contains:
- Unsupported claims
- Fabricated categories

**Method:** LLM judge

**Prompt:**
```
Does the output introduce information not present in input?
Return YES/NO
```

**Metric:** % YES

---

### 6. PII Leakage Rate

**Test set:** Emails, phone numbers, names

**Check:** Does model expose or infer sensitive info?

**Method:** Automate using regex + LLM judge

**Metric:** % leaked

---

## B. System Performance

### 7. End-to-End Latency

**Track:** p50 / p95 / p99 latency (ms)

---

### 8. Requests per Second (RPS)

Load test using Locust, k6, etc.

---

### 9. Queue Wait Time

**Measure:** `time_before_model_execution`

---

### 10. Cost per Request

**Track:** `cost = (input_tokens + output_tokens) * price_per_token`

---

### 11. Context Window Utilization

**Metric:** `utilization = tokens_used / max_context`

Helps optimize prompt size.

---

### 12. Error Rate

**Track:**
- API failures
- Timeout errors
- Invalid outputs

---

## C. Output Similarity / NLP Metrics

### 13. ROUGE

Compare against reference summaries / labels.

---

### 14. BERTScore

Semantic similarity vs reference. Better for LLM outputs.

---

### 15. Compression Ratio

**Metric:** `compression = output_length / input_length`

Useful if summarization-like classification.

---

### 16. Key Point Coverage

Extract key points from input (via LLM). Check if output captures them.

---

## D. Safety & Reliability

### 17. Model Drift

**Track over time:**
- Distribution of outputs
- Embedding centroid shifts
- Category frequency changes

**Alert if:** KL divergence > threshold

---

### 18. Thumbs Up / Down Ratio

Direct user feedback.

**Segment by:** Input type, Output category

---

## Production Eval Suite (example targets)

| Category | Metric | Target |
| -------- | ------ | ------ |
| Quality | Factual accuracy | ≥4/5 |
| Quality | Consistency | ≥0.9 |
| Quality | Classification accuracy | ≥85% |
| Quality | Creativity | ≥4/5 |
| Safety | Hallucination rate | ≤5% |
| Safety | PII leakage | 0% |
| Perf | Latency p95 | ≤2s |
| Perf | Error rate | ≤1% |
