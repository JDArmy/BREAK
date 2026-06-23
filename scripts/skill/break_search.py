#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BREAK 知识库搜索引擎

零外部依赖，仅使用 Python 标准库。
支持关键词搜索、ID 精确查询、多类型过滤、中英文自动检测。

用法:
    python3 break_search.py <query> [options]

示例:
    python3 break_search.py "流量清洗"
    python3 break_search.py "credential stuffing" --lang en
    python3 break_search.py R0001
    python3 break_search.py "自动化" --type risks
    python3 break_search.py "DDoS" --type risks,attackTools --limit 10
"""

import argparse
import json
import os
import re
import sys
import unicodedata


# ─── 常量 ───

# 实体 ID 正则，用于 ID 精确查询识别
ID_PATTERNS = {
    'risks': re.compile(r'^R\d{4}(?:-\d{3})?$', re.IGNORECASE),
    'avoidances': re.compile(r'^A\d{4}(?:-\d{3})?$', re.IGNORECASE),
    'attackTools': re.compile(r'^AT\d{4}(?:-\d{3})?$', re.IGNORECASE),
    'threatActors': re.compile(r'^TA\d{4}(?:-\d{3})?$', re.IGNORECASE),
    'terms': re.compile(r'^T\d{4}$', re.IGNORECASE),
    'cases': re.compile(r'^C\d{4}$', re.IGNORECASE),
    'businessScenes': re.compile(r'^BS\d{2}$', re.IGNORECASE),
    'avoidanceCategories': re.compile(r'^AC\d{2}$', re.IGNORECASE),
}

# 实体类型显示名称和 emoji
TYPE_DISPLAY = {
    'risks':               ('🔴', '风险', 'Risks'),
    'avoidances':          ('🟢', '规避手段', 'Avoidances'),
    'attackTools':         ('🔧', '攻击工具', 'Attack Tools'),
    'threatActors':        ('👤', '威胁行为者', 'Threat Actors'),
    'terms':               ('📖', '术语', 'Terms'),
    'cases':               ('📋', '案例', 'Cases'),
    'businessScenes':      ('🏢', '业务场景', 'Business Scenes'),
    'avoidanceCategories': ('📂', '规避分类', 'Avoidance Categories'),
}

# 可搜索的实体类型及其搜索字段权重（对齐前端 Fuse.js 配置）
SEARCH_CONFIGS = {
    'risks': {
        'title': 2.0, 'keywords': 1.6, 'definition': 1.5,
        'description': 1.0, 'influence': 0.6,
    },
    'avoidances': {
        'title': 2.0, 'keywords': 1.6, 'definition': 1.5,
        'description': 1.0, 'limitation': 0.6,
    },
    'attackTools': {
        'title': 2.0, 'keywords': 1.6, 'description': 1.0,
    },
    'threatActors': {
        'title': 2.0, 'keywords': 1.6, 'description': 1.0,
    },
    'terms': {
        'title': 2.0, 'keywords': 1.6, 'definition': 1.5,
        'description': 1.0, 'aliases': 1.0,
    },
    'cases': {
        'title': 2.0, 'keywords': 1.6, 'summary': 1.2,
        'description': 0.8,
    },
}


# ─── 工具函数 ───

def contains_cjk(text):
    """检测文本是否包含 CJK 字符"""
    for ch in text:
        if unicodedata.category(ch).startswith('Lo'):
            cp = ord(ch)
            if (0x4E00 <= cp <= 0x9FFF or      # CJK 统一表意文字
                0x3400 <= cp <= 0x4DBF or      # CJK 统一表意文字扩展 A
                0x2E80 <= cp <= 0x2FDF or      # CJK 部首
                0x3000 <= cp <= 0x303F or      # CJK 符号和标点
                0x3040 <= cp <= 0x30FF or      # 日文平假名/片假名
                0xF900 <= cp <= 0xFAFF):       # CJK 兼容表意文字
                return True
    return False


def detect_lang(query):
    """自动检测查询语言：包含 CJK → zh，否则 → en"""
    return 'zh' if contains_cjk(query) else 'en'


def resolve_data_dir(script_path):
    """根据脚本自身位置推算数据目录"""
    # 情况 1：在项目中 scripts/skill/break_search.py → ../../public/data/
    project_data = os.path.join(os.path.dirname(script_path), '..', '..', 'public', 'data')
    if os.path.isdir(project_data):
        return os.path.abspath(project_data)
    # 情况 2：作为 skill 包分发 break/break_search.py → break/data/
    skill_data = os.path.join(os.path.dirname(script_path), 'data')
    if os.path.isdir(skill_data):
        return os.path.abspath(skill_data)
    return None


def detect_id_type(query):
    """检测查询是否为实体 ID 格式，返回 (entity_type, normalized_id) 或 None"""
    q = query.strip()
    for entity_type, pattern in ID_PATTERNS.items():
        if pattern.match(q):
            # 规范化 ID 大小写
            return entity_type, q.upper()
    return None


def truncate(text, max_len=150):
    """截取文本到指定长度"""
    if not text:
        return ''
    text = text.replace('\n', ' ').strip()
    return text[:max_len] + '...' if len(text) > max_len else text


# ─── 搜索引擎 ───

class BreakSearchEngine:
    def __init__(self, data_dir, lang='zh'):
        self.lang = lang
        self.data_dir = data_dir
        self.data = None
        self._load_data()

    def _load_data(self):
        filename = 'break-data.json' if self.lang == 'zh' else 'break-data-en.json'
        filepath = os.path.join(self.data_dir, filename)
        if not os.path.exists(filepath):
            # 英文文件不存在时回退到中文
            if self.lang == 'en':
                filepath = os.path.join(self.data_dir, 'break-data.json')
                if os.path.exists(filepath):
                    print(f'⚠️ 英文数据文件不存在，回退到中文数据', file=sys.stderr)
                    self.lang = 'zh'
                else:
                    print(f'❌ 数据文件不存在: {filepath}', file=sys.stderr)
                    sys.exit(1)
            else:
                print(f'❌ 数据文件不存在: {filepath}', file=sys.stderr)
                sys.exit(1)
        with open(filepath, 'r', encoding='utf-8') as f:
            bundle = json.load(f)
        self.data = bundle.get('data', {})
        self.version = bundle.get('packageVersion', 'unknown')

    def lookup_id(self, entity_type, entity_id):
        """通过 ID 精确查询实体"""
        entities = self.data.get(entity_type, {})
        return entities.get(entity_id)

    def search(self, query, types=None, limit=5):
        """
        关键词搜索，返回按类型分组的结果。

        返回 dict: { entity_type: [(id, entity, score), ...] }
        """
        query_lower = query.lower()
        # 支持多词搜索：所有词都必须匹配
        terms = query_lower.split()
        if not terms:
            return {}

        search_types = types or list(SEARCH_CONFIGS.keys())
        results = {}

        for entity_type in search_types:
            if entity_type not in SEARCH_CONFIGS:
                continue
            field_weights = SEARCH_CONFIGS[entity_type]
            entities = self.data.get(entity_type, {})
            type_results = []

            for entity_id, entity in entities.items():
                score = self._score_entity(entity, terms, field_weights)
                if score > 0:
                    type_results.append((entity_id, entity, score))

            # 按得分降序排列，取前 limit 条
            type_results.sort(key=lambda x: x[2], reverse=True)
            if type_results:
                results[entity_type] = type_results[:limit]

        return results

    def _score_entity(self, entity, terms, field_weights):
        """
        计算单个实体对查询词的匹配得分。
        多词查询：所有词都必须至少在某个字段中匹配。
        """
        term_scores = []
        for term in terms:
            best_score = 0.0
            for field, weight in field_weights.items():
                value = entity.get(field)
                if value is None:
                    continue
                field_score = self._score_field(value, term, weight)
                if field_score > best_score:
                    best_score = field_score
            if best_score == 0:
                return 0  # 该词无匹配，整体不命中
            term_scores.append(best_score)
        return min(term_scores)  # 多词取最低分

    def _score_field(self, value, term, weight):
        """计算单个字段对单个词的匹配得分"""
        if isinstance(value, str):
            return self._score_text(value, term, weight)
        elif isinstance(value, list):
            best = 0.0
            for item in value:
                if isinstance(item, str):
                    s = self._score_text(item, term, weight)
                    if s > best:
                        best = s
            return best
        return 0.0

    def _score_text(self, text, term, weight):
        """计算文本对词的得分"""
        text_lower = text.lower()
        if text_lower == term:
            return weight * 1.5  # 精确匹配加成
        if term in text_lower:
            return weight
        return 0.0

    def resolve_entity_title(self, entity_type, entity_id):
        """解析实体 ID 为标题，用于关系展开"""
        entity = self.lookup_id(entity_type, entity_id)
        if entity:
            return entity.get('title', entity_id)
        return entity_id


# ─── 格式化输出 ───

def format_search_results(engine, query, results, lang):
    """格式化搜索结果为结构化文本"""
    total = sum(len(items) for items in results.values())
    lines = []
    lines.append(f'=== BREAK 知识库搜索结果 ===')
    lines.append(f'查询: "{query}"  语言: {lang}  匹配: {total} 条')
    lines.append('')

    if total == 0:
        lines.append('未找到匹配结果。')
        lines.append('')
        lines.append('建议：')
        lines.append('- 尝试使用不同的关键词')
        lines.append('- 使用更宽泛的搜索词')
        lines.append('- 通过 --type 指定搜索范围')
        return '\n'.join(lines)

    for entity_type, items in results.items():
        emoji, cn_name, en_name = TYPE_DISPLAY.get(entity_type, ('', entity_type, entity_type))
        lines.append(f'## {emoji} {cn_name} ({en_name}) — {len(items)} 条匹配')
        for entity_id, entity, score in items:
            title = entity.get('title', '')
            lines.append(f'- [{entity_id}] {title} (score: {score:.1f})')
            # 摘要：优先 definition，其次 summary，最后 description
            snippet = entity.get('definition') or entity.get('summary') or entity.get('description') or ''
            if snippet:
                lines.append(f'  {truncate(snippet, 120)}')
        lines.append('')

    return '\n'.join(lines)


def format_entity_detail(engine, entity_type, entity_id, entity):
    """格式化单个实体的详细信息"""
    lines = []
    title = entity.get('title', '')
    lines.append(f'=== [{entity_id}] {title} ===')
    lines.append(f'类型: {TYPE_DISPLAY.get(entity_type, ("", entity_type, entity_type))[1]}')
    lines.append('')

    # 基础文本字段
    text_fields = [
        ('definition', '定义'),
        ('description', '描述'),
        ('summary', '摘要'),
        ('influence', '影响'),
        ('limitation', '局限性'),
        ('usageExample', '使用场景'),
    ]
    for field, label in text_fields:
        value = entity.get(field)
        if value:
            lines.append(f'{label}: {value}')
            lines.append('')

    # 分类/复杂度/有效性
    meta_fields = [
        ('complexity', '复杂度'),
        ('category', '分类'),
        ('effectiveness', '有效性'),
        ('incidentTime', '事件时间'),
    ]
    meta_parts = []
    for field, label in meta_fields:
        value = entity.get(field)
        if value:
            meta_parts.append(f'{label}: {value}')
    if meta_parts:
        lines.append(' | '.join(meta_parts))
        lines.append('')

    # 关键词
    keywords = entity.get('keywords', [])
    if keywords:
        lines.append(f'关键词: {", ".join(keywords)}')
        lines.append('')

    # 别名（terms）
    aliases = entity.get('aliases', [])
    if aliases:
        lines.append(f'别名: {", ".join(aliases)}')
        lines.append('')

    # 关联关系展开
    relation_fields = [
        ('avoidances', '规避手段', 'avoidances'),
        ('directCauseRisks', '直接导致的风险', 'risks'),
        ('indirectSupportRisks', '间接支持的风险', 'risks'),
        ('buildAttackTools', '自建的工具', 'attackTools'),
        ('useAttackTools', '使用的工具', 'attackTools'),
        ('relatedRisks', '相关风险', 'risks'),
        ('relatedAvoidances', '相关规避手段', 'avoidances'),
        ('relatedAttackTools', '相关攻击工具', 'attackTools'),
        ('relatedThreatActors', '相关威胁行为者', 'threatActors'),
        ('relatedBusinessScenes', '相关业务场景', 'businessScenes'),
    ]
    for field, label, ref_type in relation_fields:
        value = entity.get(field)
        if not value:
            continue
        # 区分简单 ID 数组和关系对象数组
        if isinstance(value, list) and value:
            if isinstance(value[0], str):
                # 简单 ID 数组 — 展开标题
                expanded = []
                for ref_id in value:
                    title = engine.resolve_entity_title(ref_type, ref_id)
                    expanded.append(f'{ref_id}({title})')
                lines.append(f'{label}: {", ".join(expanded)}')
            elif isinstance(value[0], dict):
                # 关系对象数组（如 relatedRisks: [{key, relation, note}]）
                expanded = []
                for rel in value:
                    key = rel.get('key', '')
                    relation = rel.get('relation', '')
                    note = rel.get('note', '')
                    title = engine.resolve_entity_title(ref_type, key)
                    desc = f'{key}({title})'
                    if relation:
                        desc += f' [{relation}]'
                    if note:
                        desc += f' - {note}'
                    expanded.append(desc)
                lines.append(f'{label}:')
                for item in expanded:
                    lines.append(f'  - {item}')
            lines.append('')

    # 参考资料
    refs = entity.get('references', [])
    if refs:
        lines.append('参考资料:')
        for ref in refs:
            title = ref.get('title', '')
            link = ref.get('link', '')
            if link:
                lines.append(f'  - {title} ({link})')
            else:
                lines.append(f'  - {title}')
        lines.append('')

    # 更新时间
    updated = entity.get('updated')
    if updated:
        lines.append(f'更新时间: {updated}')

    return '\n'.join(lines)


def format_business_scene_detail(engine, entity_id, entity):
    """格式化业务场景的详细信息（特殊结构）"""
    lines = []
    title = entity.get('title', '')
    lines.append(f'=== [{entity_id}] {title} ===')
    lines.append(f'类型: 业务场景')
    lines.append('')

    desc = entity.get('description', '')
    if desc:
        lines.append(f'描述: {desc}')
        lines.append('')

    # 风险维度 → 风险场景
    dimensions = entity.get('riskDimensions', {})
    scenes = entity.get('riskScenes', {})

    if dimensions:
        lines.append('风险维度:')
        for dim_id, dim in sorted(dimensions.items()):
            dim_title = dim.get('title', dim_id)
            dim_scenes = dim.get('riskScenes', [])
            lines.append(f'  [{dim_id}] {dim_title}')
            for scene_id in dim_scenes:
                scene = scenes.get(scene_id, {})
                scene_title = scene.get('title', scene_id)
                risk_count = len(scene.get('risks', []))
                lines.append(f'    └─ [{scene_id}] {scene_title} ({risk_count} 个风险)')
        lines.append('')

    # 直属风险
    top_risks = entity.get('risks', [])
    if top_risks:
        lines.append(f'顶层风险 ({len(top_risks)} 个):')
        for rid in top_risks[:10]:
            title = engine.resolve_entity_title('risks', rid)
            lines.append(f'  - {rid}({title})')
        if len(top_risks) > 10:
            lines.append(f'  ... 还有 {len(top_risks) - 10} 个')
        lines.append('')

    updated = entity.get('updated')
    if updated:
        lines.append(f'更新时间: {updated}')

    return '\n'.join(lines)


# ─── 主程序 ───

def main():
    parser = argparse.ArgumentParser(
        description='BREAK 知识库搜索引擎',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例:
  %(prog)s "流量清洗"                     # 中文关键词搜索
  %(prog)s "credential stuffing"          # 英文关键词搜索
  %(prog)s R0001                          # ID 精确查询
  %(prog)s "自动化" --type risks          # 按类型过滤
  %(prog)s "DDoS" --type risks,attackTools --limit 10
  %(prog)s R0001 --detail                 # 强制详细模式
        ''',
    )
    parser.add_argument('query', help='搜索关键词、实体 ID 或安全问题描述')
    parser.add_argument('--lang', choices=['zh', 'en'], default=None,
                        help='语言（默认自动检测）')
    parser.add_argument('--type', dest='types', default=None,
                        help='逗号分隔的实体类型过滤（如 risks,avoidances）')
    parser.add_argument('--limit', type=int, default=5,
                        help='每类型最大返回数（默认 5）')
    parser.add_argument('--detail', action='store_true',
                        help='详细模式，显示完整字段和关联关系')
    parser.add_argument('--data-dir', default=None,
                        help='数据目录路径覆盖')
    args = parser.parse_args()

    # 解析数据目录
    data_dir = args.data_dir
    if not data_dir:
        data_dir = resolve_data_dir(os.path.abspath(__file__))
    if not data_dir or not os.path.isdir(data_dir):
        print('❌ 无法找到数据目录。请使用 --data-dir 指定。', file=sys.stderr)
        sys.exit(1)

    # 语言检测
    lang = args.lang or detect_lang(args.query)

    # 初始化搜索引擎
    engine = BreakSearchEngine(data_dir, lang)

    # 解析类型过滤
    search_types = None
    if args.types:
        search_types = [t.strip() for t in args.types.split(',')]
        invalid = [t for t in search_types if t not in SEARCH_CONFIGS]
        if invalid:
            print(f'⚠️ 未知的实体类型: {", ".join(invalid)}', file=sys.stderr)
            print(f'可用类型: {", ".join(SEARCH_CONFIGS.keys())}', file=sys.stderr)

    # 检测是否为 ID 查询
    id_result = detect_id_type(args.query)

    if id_result:
        entity_type, entity_id = id_result
        entity = engine.lookup_id(entity_type, entity_id)
        if entity:
            if entity_type == 'businessScenes':
                print(format_business_scene_detail(engine, entity_id, entity))
            else:
                print(format_entity_detail(engine, entity_type, entity_id, entity))
        else:
            print(f'❌ 未找到实体: [{entity_id}]')
            # 尝试建议：搜索类似关键词
            print(f'\n尝试搜索 "{entity_id.lstrip("RATCBS")}":')
            results = engine.search(entity_id, limit=3)
            if results:
                print(format_search_results(engine, entity_id, results, lang))
        return

    # 关键词搜索
    results = engine.search(args.query, types=search_types, limit=args.limit)
    print(format_search_results(engine, args.query, results, lang))

    # 如果是 detail 模式且有结果，展开第一个结果
    if args.detail and results:
        for entity_type, items in results.items():
            for entity_id, entity, score in items[:1]:
                print('\n' + '=' * 60)
                print(format_entity_detail(engine, entity_type, entity_id, entity))


if __name__ == '__main__':
    main()
