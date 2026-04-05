# Resolver Rules: Windows JS Skill Pack

1. Search compact aliases and skill ids first.
2. Rank candidates by token overlap and title similarity.
3. Validate required parameters before execution.
4. Select executor and route through scripts/windows/tools/runner.js.
5. Enforce safety and admin confirmation checks.
6. If confidence is low, return top 3 candidates instead of executing.
7. Log query, selected skill, confidence, and outcome.
