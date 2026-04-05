export class ScriptRerankService {
  constructor({ rerankerProvider }) {
    this.rerankerProvider = rerankerProvider;
  }

  async warm() {
    return this.rerankerProvider.warm();
  }

  async rerank({ request, candidates }) {
    const ranked = await this.rerankerProvider.rerank({ request, candidates });
    const out = Array.isArray(ranked) ? ranked : [];
    return {
      request,
      candidates: out,
      topCandidates: out.slice(0, 6),
    };
  }
}
