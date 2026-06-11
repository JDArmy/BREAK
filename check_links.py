#!/usr/bin/env python3
"""检查BREAK项目中所有JSON文件的references链接是否可访问"""
import json, glob, os, urllib.request, urllib.error, ssl, time, sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

results = {"broken": [], "ok": 0, "total": 0, "skipped": 0, "redirect": []}

for f in sorted(glob.glob('src/BREAK/**/*.json', recursive=True)):
    if 'savejson' in f:
        continue
    try:
        with open(f) as fh:
            data = json.load(fh)
    except:
        continue
    for key, entity in data.items():
        if not isinstance(entity, dict):
            continue
        refs = entity.get('references', [])
        for ref in refs:
            link = ref.get('link', '')
            if not link or link.startswith('#'):
                continue
            results['total'] += 1
            idx = results['total']

            # 跳过已知有问题的模式
            if '⟦BANKCARD_' in link or '⟦' in link:
                results['skipped'] += 1
                results['broken'].append({
                    'file': f, 'entity': key, 'link': link,
                    'name': ref.get('name', ''),
                    'reason': 'Contains placeholder characters'
                })
                continue

            try:
                req = urllib.request.Request(link, headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                })
                resp = urllib.request.urlopen(req, timeout=15, context=ctx)
                if resp.status < 400:
                    results['ok'] += 1
                else:
                    results['broken'].append({
                        'file': f, 'entity': key, 'link': link,
                        'name': ref.get('name', ''),
                        'reason': f'HTTP {resp.status}'
                    })
            except urllib.error.HTTPError as e:
                results['broken'].append({
                    'file': f, 'entity': key, 'link': link,
                    'name': ref.get('name', ''),
                    'reason': f'HTTP {e.code}'
                })
            except urllib.error.URLError as e:
                results['broken'].append({
                    'file': f, 'entity': key, 'link': link,
                    'name': ref.get('name', ''),
                    'reason': f'URLError: {str(e.reason)[:60]}'
                })
            except Exception as e:
                reason = str(e)[:80]
                results['broken'].append({
                    'file': f, 'entity': key, 'link': link,
                    'name': ref.get('name', ''),
                    'reason': reason
                })

            # 每检查100个打印进度
            if idx % 50 == 0:
                print(f"Progress: {idx}/{results['total']} checked, {len(results['broken'])} broken so far...", file=sys.stderr)

            # 避免请求过快
            time.sleep(0.3)

print(f"\n=== 检查结果 ===")
print(f"总计: {results['total']}")
print(f"正常: {results['ok']}")
print(f"跳过: {results['skipped']}")
print(f"损坏: {len(results['broken'])}")

# 保存完整结果到JSON文件
with open('link_check_results.json', 'w', encoding='utf-8') as out:
    json.dump(results, out, ensure_ascii=False, indent=2)

print(f"\n详细结果已保存到 link_check_results.json")

# 打印损坏链接摘要
print(f"\n=== 损坏链接列表 ===")
for b in results['broken']:
    print(f"\n实体: {b['entity']} (文件: {os.path.basename(b['file'])})")
    print(f"  名称: {b['name']}")
    print(f"  链接: {b['link'][:120]}")
    print(f"  原因: {b['reason']}")
