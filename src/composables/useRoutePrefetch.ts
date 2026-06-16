let prefetched = false;

export function prefetchAllKnowledgeViews() {
  if (prefetched) return;
  prefetched = true;
  void import("@/views/RisksView.vue");
  void import("@/views/AvoidancesView.vue");
  void import("@/views/AttackToolsView.vue");
  void import("@/views/ThreatActorsView.vue");
  void import("@/views/TermsView.vue");
}

let relationPrefetched = false;

export function prefetchRelationView() {
  if (relationPrefetched) return;
  relationPrefetched = true;
  void import("@/views/RelationView.vue");
  void import("@/components/relation/RelationNetworkPane.vue");
  void import("@/components/relation/RelationNodeDetailDrawer.vue");
}
