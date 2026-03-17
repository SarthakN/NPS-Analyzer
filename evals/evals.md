# AI Evals for theme generation
Factual accuracy / contextual relevance
Consistency
Classification accuracy
Creativity - human

Hallucination rate
PII leakage rate

End-to-end latency

Requests per second
Queue wait time

Cost per request
Context window utilization

Error rate

Thumbs up/down ratio

ROUGE
BERT
Compression ration
Key point coverage

Model drift




AI evals for **LLM-based unsupervised classification** differ from traditional classification evals because there is **no labeled ground truth**. Instead, evaluate **cluster quality, semantic consistency, and stability**.

---

## 1. Cluster Cohesion (Semantic Consistency)

Measures whether items inside a cluster **actually belong together**.

**Method:** Sample from each cluster; ask an LLM judge: *"Do these items belong to the same topic?"*

**Eval prompt:**

```
You are evaluating clustering quality.

Cluster Label: "Billing Issues"

Items:
1. "My invoice amount is incorrect"
2. "I was charged twice"
3. "Why is my payment failing?"
4. "The UI looks outdated"

Do all items belong to the cluster label?

Return:
- PASS if most items belong
- FAIL if some items are unrelated
Explain briefly.
```

**Metric:** Cohesion Score = % PASS clusters

---

## 2. Cluster Separation

Measures whether **different clusters are actually different**.

**Eval prompt:**

```
Compare the following clusters.

Cluster A: Login Issues
- Cannot reset password
- Login OTP not working
- Account locked

Cluster B: Billing Issues
- Charged twice
- Refund not processed
- Invoice incorrect

Do these clusters represent clearly different topics?

Return YES or NO with explanation.
```

**Metric:** Cluster Separation Score

---

## 3. Label Quality Evaluation

Check if **LLM-generated cluster labels** accurately describe the cluster.

**Eval prompt:**

```
Cluster Label: "Application Status Confusion"

Items:
- I applied but didn't hear back
- What is my application status?
- My status says pending

Does the label accurately summarize the items?

Score from 1-5.
```

**Metric:** Average label accuracy score

---

## 4. Stability Testing

Check if clusters remain **consistent across runs**. Clustering can change with prompt changes, temperature changes, or dataset order changes.

**Test:** Run clustering 5 times. Measure % of items that remain in the same cluster.

**Metric:** Cluster Stability Score

---

## 5. Coverage / Orphan Rate

Check if too many items become **miscellaneous or unclustered**.

**Metric:** `Coverage = clustered_items / total_items`

Example: 920 clustered / 1000 total → 92% coverage. Low coverage indicates clustering is failing.

---

## 6. Human Alignment Evaluation

Human reviewers score clusters:

| Metric            | Score |
| ----------------- | ----- |
| Cluster coherence | 1–5   |
| Label clarity     | 1–5   |
| Topic usefulness  | 1–5   |

**Metric:** Aggregate → Human alignment score

---

## 7. Business Usefulness Score

Critical in product systems (e.g., NPS theme extraction). Check whether clusters correspond to **actionable themes**.

**Good:** Salary dissatisfaction, Work-life balance, Manager issues  
**Bad:** Misc feedback, General complaints

**Metric:** % clusters that are actionable

---

## 8. LLM Judge Pairwise Classification

Evaluate whether two items belong in the same cluster.

**Prompt:**

```
Item A: "I cannot reset my password"
Item B: "OTP login not working"

Should these belong to the same category?

Answer YES or NO.
```

Compare with cluster output. **Metric:** Pairwise accuracy

---

## Production Eval Suite (50-case example)

| Eval               | Target |
| ------------------ | ------ |
| Cluster cohesion   | >85%   |
| Cluster separation | >90%   |
| Label quality      | >4/5   |
| Stability          | >80%   |
| Coverage           | >90%   |
| Human alignment    | >4/5   |

---

## NPS Theme Extraction Use Case

**Input:** 1000 customer comments  
**Output:** Salary dissatisfaction, Manager quality, Work-life balance, Career growth

**Eval checks:** Comments match theme; clusters are distinct; themes are actionable.


