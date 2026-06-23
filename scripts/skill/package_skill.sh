#!/bin/bash
# BREAK Skill 打包脚本
# 将 BREAK 知识库打包为可分发的 Claude Code / Codex skill 目录
#
# 用法:
#   ./scripts/skill/package_skill.sh [output_dir]
#
# 输出目录默认为 dist/break-skill/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="${1:-$PROJECT_ROOT/dist/break-skill}"

echo "📦 打包 BREAK Skill..."
echo "   源目录: $PROJECT_ROOT"
echo "   输出目录: $OUTPUT_DIR"

# 检查数据文件是否存在
if [ ! -f "$PROJECT_ROOT/public/data/break-data.json" ]; then
    echo "❌ 中文数据文件不存在，请先运行: npm run export:data"
    exit 1
fi

if [ ! -f "$PROJECT_ROOT/public/data/break-data-en.json" ]; then
    echo "⚠️  英文数据文件不存在，正在生成..."
    node "$PROJECT_ROOT/scripts/skill/export_en_data.mjs"
fi

# 清理并创建输出目录
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/data"

# 复制 SKILL 定义文件
cp "$PROJECT_ROOT/SKILL.md" "$OUTPUT_DIR/SKILL.md"
cp "$PROJECT_ROOT/SKILL_en.md" "$OUTPUT_DIR/SKILL_en.md"

# 复制 Python 搜索脚本
cp "$PROJECT_ROOT/scripts/skill/break_search.py" "$OUTPUT_DIR/break_search.py"

# 复制数据文件
cp "$PROJECT_ROOT/public/data/break-data.json" "$OUTPUT_DIR/data/break-data.json"
cp "$PROJECT_ROOT/public/data/break-data-en.json" "$OUTPUT_DIR/data/break-data-en.json"

# 获取版本信息
VERSION=$(node -e "console.log(require('$PROJECT_ROOT/package.json').version)")

# 输出统计
ZH_SIZE=$(wc -c < "$OUTPUT_DIR/data/break-data.json" | tr -d ' ')
EN_SIZE=$(wc -c < "$OUTPUT_DIR/data/break-data-en.json" | tr -d ' ')
TOTAL_SIZE=$(( ZH_SIZE + EN_SIZE ))

echo ""
echo "✅ BREAK Skill v${VERSION} 打包完成"
echo ""
echo "📁 目录结构:"
echo "   $OUTPUT_DIR/"
echo "   ├── SKILL.md              # Skill 定义（中文）"
echo "   ├── SKILL_en.md           # Skill 定义（英文）"
echo "   ├── break_search.py       # Python 搜索引擎"
echo "   └── data/"
echo "       ├── break-data.json   # 中文数据 ($(( ZH_SIZE / 1024 / 1024 ))MB)"
echo "       └── break-data-en.json # 英文数据 ($(( EN_SIZE / 1024 / 1024 ))MB)"
echo ""
echo "📊 总大小: $(( TOTAL_SIZE / 1024 / 1024 ))MB"
echo ""
echo "使用方法:"
echo "  将 $OUTPUT_DIR 目录复制到 Claude Code 的 skills 目录中即可使用"
echo "  例如: cp -r $OUTPUT_DIR ~/.claude/skills/break"
