---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-runtime-settings.mjs"
source_name: "brain-runtime-settings.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 8
selected_rank: 3437
content_hash: "8b1cf5cb16426e42f22eff929a76cbe252bde7ce18c58bcab209c62c87e49249"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-build-utils.mjs"
  - "node:fs"
exports:
  - "CRAWLER_IDS"
  - "DEFAULT_CRAWLER_LEARNING_SETTINGS"
  - "DEFAULT_RUNTIME_SETTINGS"
  - "getCrawlerIds"
  - "getCrawlerSettings"
  - "readCrawlerSettings"
  - "readRuntimeSettings"
  - "summarizeCrawlerSettings"
  - "summarizeRuntimeSettings"
  - "updateCrawlerSettings"
---

# taskmanager/portable_lib/brain-runtime-settings.mjs

> Code module; imports ./brain-build-utils.mjs, node:fs; exports CRAWLER_IDS, DEFAULT_CRAWLER_LEARNING_SETTINGS, DEFAULT_RUNTIME_SETTINGS, getCrawlerIds

## Key Signals

- Source path: taskmanager/portable_lib/brain-runtime-settings.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 8
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs, node:fs
- Exports: CRAWLER_IDS, DEFAULT_CRAWLER_LEARNING_SETTINGS, DEFAULT_RUNTIME_SETTINGS, getCrawlerIds, getCrawlerSettings, readCrawlerSettings

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-runtime-settings.mjs

## Excerpt

~~~javascript
﻿import fs from "node:fs";
import { ensureDir, writeJsonStable } from "./brain-build-utils.mjs";
import {
  ensureBrainRuntimeHub,
  getBrainRuntimeHubPaths,
  migrateLegacyBrainRuntimeData,
} from "./brain-runtime-hub.mjs";

const SETTINGS_SCHEMA_VERSION = "2.0";
const CRAWLER_COUNT = 10;
const DEFAULT_LOG_ACCESS_MODE = "summaries-first";
const DEFAULT_SOURCE_SCOPE = "open-web-crawl";
const DEFAULT_PROMOTION_MODE = "full-auto-promote-broadly";
const MAX_PARALLEL_FETCH_WORKERS = 4;

const DEFAULT_SEED_URLS = [
  "https://news.ycombinator.com/",
  "https://www.reuters.com/technology/",
  "https://www.reuters.com/markets/",
  "https://apnews.com/hub/technology",
  "https://apnews.com/hub/business",
  "https://www.sec.gov/news/pressreleases",
  "https://www.federalreserve.gov/newsevents/pressreleases.htm",
  "https://www.federalreserve.gov/newsevents/speech.htm",
  "https://www.bls.gov/bls/newsrels.htm",
  "https://www.census.gov/newsroom.html",
  "https://www.ftc.gov/news-events/news/press-releases",
  "https://www.consumerfinance.gov/about-us/newsroom/",
~~~