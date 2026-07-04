/**
 * RelationView 的 viewModel provide/inject key
 *
 * RelationView 通过 useRelationViewModel() 创建 viewModel 后 provide 给子组件，
 * 子组件 inject 取代 props 钻取（消除 31/24/28 props 透传）。
 *
 * viewModel 是普通对象，其属性为 ref/computed/函数。<script setup> 中解构 ref 安全
 * （ref 是对象引用，响应性保留），模板内顶层 ref 自动 unwrap。
 */
import type { InjectionKey } from "vue";
import type { useRelationViewModel } from "./useRelationViewModel";

export type RelationViewModel = ReturnType<typeof useRelationViewModel>;

export const RELATION_VIEW_MODEL_KEY: InjectionKey<RelationViewModel> = Symbol("RelationViewModel");
