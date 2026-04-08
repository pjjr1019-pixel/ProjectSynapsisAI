# Chat Memory Strategy

1. Extract candidate memories from user/assistant turn text.
2. Classify into controlled categories.
3. Score importance to prioritize durable context.
4. Deduplicate using token similarity and refresh existing memory when similar.
5. Retrieve by keyword for each new turn.
6. Pass only top memory candidates into context assembly.
