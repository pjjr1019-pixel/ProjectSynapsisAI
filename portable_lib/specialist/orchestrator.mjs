import {
  EXECUTION_POLICIES,
  normalizeExecutionPolicy,
} from "./contracts.mjs";
import { getSpecialistPaths } from "./paths.mjs";
import { ScriptIndexService } from "./index-service.mjs";
import { ScriptEmbeddingService } from "./embedding-service.mjs";
import { ScriptRetrievalService } from "./retrieval-service.mjs";
import { ScriptRerankService } from "./rerank-service.mjs";
import { ScriptRouterService } from "./router-service.mjs";
import { ScriptExecutionService } from "./execution-service.mjs";
import { SpecialistLearningService } from "./learning-service.mjs";
import { CodeSpecialistService } from "./code-specialist-service.mjs";
import { SpecialistObservability, elapsedMs, nowMs } from "./observability.mjs";
import {
  createDefaultCodeSpecialistProvider,
  createDefaultEmbeddingProvider,
  createDefaultRerankerProvider,
  createDefaultRouterModelProvider,
} from "./model-providers.mjs";

export class SpecialistOrchestrator {
  constructor(options = {}) {
    const paths = options.paths || getSpecialistPaths();
    this.paths = paths;

    const embeddingProvider = options.embeddingProvider || createDefaultEmbeddingProvider();
    const rerankerProvider = options.rerankerProvider || createDefaultRerankerProvider();
    const routerModelProvider = options.routerModelProvider || createDefaultRouterModelProvider();
    const codeSpecialistProvider = options.codeSpecialistProvider || createDefaultCodeSpecialistProvider();

    this.indexService = options.indexService || new ScriptIndexService({ paths });
    this.embeddingService = options.embeddingService || new ScriptEmbeddingService({ paths, embeddingProvider });
    this.retrievalService = options.retrievalService || new ScriptRetrievalService({ embeddingService: this.embeddingService });
    this.rerankService = options.rerankService || new ScriptRerankService({ rerankerProvider });
    this.routerService = options.routerService || new ScriptRouterService({ routerModelProvider });
    this.executionService = options.executionService || new ScriptExecutionService({ paths });
    this.learningService = options.learningService || new SpecialistLearningService({ paths });
    this.codeSpecialistService = options.codeSpecialistService || new CodeSpecialistService({ paths, codeSpecialistProvider });
    this.observability = options.observability || new SpecialistObservability({ paths });

    this.executionPolicy = normalizeExecutionPolicy(options.executionPolicy || EXECUTION_POLICIES.ASK_FIRST);
    this.lastTrace = null;
  }

  async warmModels() {
    const [embed, rerank, router, code] = await Promise.all([
      this.embeddingService.warm(),
      this.rerankService.warm(),
      this.routerService.warm(),
      this.codeSpecialistService.warm(),
    ]);
    return { embed, rerank, router, code };
  }

  reindex() {
    const indexResult = this.indexService.build();
    const manifests = this.indexService.getManifests();
    return this.embeddingService.embedScripts(manifests).then((embedResult) => ({
      indexResult,
      embedResult,
    }));
  }

  setExecutionPolicy(policy) {
    this.executionPolicy = normalizeExecutionPolicy(policy);
    return this.executionPolicy;
  }

  getDiagnostics() {
    const state = this.indexService.getState();
    return {
      executionPolicy: this.executionPolicy,
      indexedScripts: state?.manifestCount || 0,
      malformedManifestCount: state?.malformedManifestCount || 0,
      lastIndexedAt: state?.lastIndexedAt || null,
      modelProviders: {
        embedding: this.embeddingService.embeddingProvider.name,
        reranker: this.rerankService.rerankerProvider.name,
        router: this.routerService.routerModelProvider.name,
        codeSpecialist: this.codeSpecialistService.codeSpecialistProvider.name,
      },
      lastTrace: this.lastTrace,
    };
  }

  async run({ request, executionPolicy, autoApproveCodeProposal = false }) {
    const start = nowMs();
    const policy = normalizeExecutionPolicy(executionPolicy || this.executionPolicy);
    const manifests = this.indexService.getManifests();
    if (!manifests.length) {
      await this.reindex();
    }

    const tRetrieve = nowMs();
    const retrieval = await this.retrievalService.retrieve({
      request,
      manifests: this.indexService.getManifests(),
      indexState: this.indexService.getState(),
      learningState: this.learningService.getState(),
      topK: 12,
    });

    const tRerank = nowMs();
    const reranked = await this.rerankService.rerank({
      request,
      candidates: retrieval.topCandidates,
    });

    const tRouter = nowMs();
    const routing = await this.routerService.route({
      request,
      topCandidates: reranked.topCandidates,
      executionPolicy: policy,
    });

    const tExecute = nowMs();
    const execution = await this.executionService.execute({
      decision: routing.decision,
      selected: routing.selected,
      executionPolicy: policy,
    });

    let codeSpecialist = null;
    if (routing.decision.fallback_to_code_specialist) {
      codeSpecialist = await this.codeSpecialistService.propose({
        request,
        candidates: reranked.topCandidates,
        approval: autoApproveCodeProposal,
      });
    }

    const pipelineLatency = {
      retrieval_ms: elapsedMs(tRetrieve),
      rerank_ms: elapsedMs(tRerank),
      router_ms: elapsedMs(tRouter),
      execution_ms: elapsedMs(tExecute),
      total_ms: elapsedMs(start),
    };

    const result = {
      request,
      execution_policy: policy,
      candidates: {
        retrieved: retrieval.topCandidates.slice(0, 8),
        reranked: reranked.topCandidates.slice(0, 8),
      },
      router_decision: routing.decision,
      execution,
      code_specialist: codeSpecialist,
      latency: pipelineLatency,
    };

    this.lastTrace = result;

    this.observability.writeEvent({
      event: "specialist_pipeline_run",
      request,
      policy,
      selected_script_id: routing.decision.selected_script_id,
      confidence: routing.decision.confidence,
      execution_mode: routing.decision.execution_mode,
      fallback_to_code_specialist: routing.decision.fallback_to_code_specialist,
      fallback_to_general_ai: routing.decision.fallback_to_general_ai,
      latency: pipelineLatency,
    });

    this.learningService.record({
      request,
      script_id: routing.decision.selected_script_id,
      accepted: execution.skipped !== true,
      success: execution.ok === true,
      rejected: execution.requires_confirmation === true,
    });

    return result;
  }
}

let singleton = null;

export function getSpecialistOrchestrator() {
  if (!singleton) {
    singleton = new SpecialistOrchestrator();
  }
  return singleton;
}
