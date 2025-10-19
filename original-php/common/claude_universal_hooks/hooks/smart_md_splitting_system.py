# 📄 スマートMD分割システム

## 📋 概要
完全実行計画.mdが膨大になった場合の**知的分割・段階提示**システム。技術知識を適切に分散し、文字数制限を完全回避。

## 🛠️ 実装仕様

### **知的MD分割エンジン**
```python
class SmartMDSplittingSystem:
    """膨大なMD文書の知的分割・段階提示システム"""
    
    def __init__(self):
        self.content_analyzer = ContentAnalyzer()
        self.knowledge_distributor = KnowledgeDistributor()
        self.dependency_mapper = DependencyMapper()
        self.progressive_presenter = ProgressivePresenter()
        
        # 分割基準設定
        self.splitting_thresholds = {
            'max_characters_per_section': 15000,  # 15KB per section
            'max_hooks_per_section': 20,          # 20 hooks per section
            'max_questions_per_section': 30,      # 30 questions per section
            'optimal_reading_time': 10             # 10 minutes per section
        }
    
    def split_massive_md_intelligently(self, complete_md_content, project_context):
        """膨大なMD文書の知的分割"""
        
        splitting_result = {
            'original_size': len(complete_md_content),
            'split_strategy': {},
            'generated_sections': [],
            'navigation_system': {},
            'knowledge_distribution': {}
        }
        
        try:
            # Step 1: コンテンツ分析
            content_analysis = self._analyze_md_content(complete_md_content)
            splitting_result['content_analysis'] = content_analysis
            
            # Step 2: 分割戦略決定
            split_strategy = self._determine_split_strategy(content_analysis)
            splitting_result['split_strategy'] = split_strategy
            
            # Step 3: 知的分割実行
            sections = self._execute_intelligent_split(complete_md_content, split_strategy)
            splitting_result['generated_sections'] = sections
            
            # Step 4: ナビゲーションシステム構築
            navigation = self._build_navigation_system(sections)
            splitting_result['navigation_system'] = navigation
            
            # Step 5: 知識分散最適化
            knowledge_dist = self._optimize_knowledge_distribution(sections)
            splitting_result['knowledge_distribution'] = knowledge_dist
            
            print(f"📄 MD分割完了: {len(sections)}セクションに分割")
            
        except Exception as e:
            splitting_result['error'] = str(e)
            print(f"❌ MD分割エラー: {e}")
        
        return splitting_result
    
    def _analyze_md_content(self, md_content):
        """MD内容詳細分析"""
        
        analysis = {
            'total_size': len(md_content),
            'sections_detected': {},
            'hooks_distribution': {},
            'questions_distribution': {},
            'technical_knowledge_areas': {},
            'complexity_assessment': {}
        }
        
        # セクション検出
        sections = self._detect_sections(md_content)
        analysis['sections_detected'] = {
            'count': len(sections),
            'average_size': sum(len(s['content']) for s in sections) // len(sections) if sections else 0,
            'size_variance': self._calculate_size_variance(sections)
        }
        
        # Hooks分析
        hooks_info = self._analyze_hooks_content(md_content)
        analysis['hooks_distribution'] = hooks_info
        
        # 質問分析
        questions_info = self._analyze_questions_content(md_content)
        analysis['questions_distribution'] = questions_info
        
        # 技術知識エリア分析
        tech_areas = self._identify_technical_knowledge_areas(md_content)
        analysis['technical_knowledge_areas'] = tech_areas
        
        # 複雑度評価
        complexity = self._assess_content_complexity(md_content)
        analysis['complexity_assessment'] = complexity
        
        return analysis
    
    def _determine_split_strategy(self, content_analysis):
        """分割戦略決定"""
        
        total_size = content_analysis['total_size']
        hooks_count = content_analysis['hooks_distribution']['total_hooks']
        questions_count = content_analysis['questions_distribution']['total_questions']
        
        # 分割必要性判定
        needs_splitting = (
            total_size > 50000 or           # 50KB超
            hooks_count > 50 or             # 50hooks超
            questions_count > 100           # 100質問超
        )
        
        if not needs_splitting:
            return {'strategy': 'no_split', 'reason': 'content_within_limits'}
        
        # 分割戦略選択
        if hooks_count > 100:
            strategy = 'hooks_based_splitting'
        elif questions_count > 200:
            strategy = 'questions_based_splitting'
        elif total_size > 100000:
            strategy = 'size_based_splitting'
        else:
            strategy = 'hybrid_splitting'
        
        # 分割パラメータ計算
        split_params = self._calculate_split_parameters(content_analysis, strategy)
        
        return {
            'strategy': strategy,
            'needs_splitting': needs_splitting,
            'estimated_sections': split_params['section_count'],
            'split_parameters': split_params
        }
    
    def _execute_intelligent_split(self, md_content, split_strategy):
        """知的分割実行"""
        
        strategy_type = split_strategy['strategy']
        
        if strategy_type == 'no_split':
            return [{'section_id': 'complete', 'content': md_content, 'type': 'complete'}]
        
        sections = []
        
        if strategy_type == 'hooks_based_splitting':
            sections = self._split_by_hooks(md_content, split_strategy['split_parameters'])
        elif strategy_type == 'questions_based_splitting':
            sections = self._split_by_questions(md_content, split_strategy['split_parameters'])
        elif strategy_type == 'size_based_splitting':
            sections = self._split_by_size(md_content, split_strategy['split_parameters'])
        elif strategy_type == 'hybrid_splitting':
            sections = self._hybrid_split(md_content, split_strategy['split_parameters'])
        
        # 各セクションに技術知識を適切に分散
        enriched_sections = self._enrich_sections_with_knowledge(sections)
        
        return enriched_sections
    
    def _split_by_hooks(self, md_content, params):
        """Hooks基準分割"""
        
        sections = []
        hooks_per_section = params.get('hooks_per_section', 20)
        
        # Hooksセクション抽出
        hooks_sections = self._extract_hooks_sections(md_content)
        
        current_section = {
            'section_id': 'hooks_section_1',
            'type': 'hooks_focused',
            'content': '',
            'hooks_included': [],
            'knowledge_areas': []
        }
        
        hooks_count = 0
        section_counter = 1
        
        for hook_info in hooks_sections:
            if hooks_count >= hooks_per_section:
                # 現在のセクション完了
                current_section['content'] = self._build_section_content(current_section)
                sections.append(current_section)
                
                # 新セクション開始
                section_counter += 1
                current_section = {
                    'section_id': f'hooks_section_{section_counter}',
                    'type': 'hooks_focused',
                    'content': '',
                    'hooks_included': [],
                    'knowledge_areas': []
                }
                hooks_count = 0
            
            current_section['hooks_included'].append(hook_info)
            current_section['knowledge_areas'].extend(hook_info.get('knowledge_areas', []))
            hooks_count += 1
        
        # 最後のセクション追加
        if current_section['hooks_included']:
            current_section['content'] = self._build_section_content(current_section)
            sections.append(current_section)
        
        # 非Hooksコンテンツの追加
        non_hooks_content = self._extract_non_hooks_content(md_content)
        if non_hooks_content:
            sections.append({
                'section_id': 'supplementary_content',
                'type': 'supplementary',
                'content': non_hooks_content,
                'hooks_included': [],
                'knowledge_areas': ['general_instructions', 'project_overview']
            })
        
        return sections
    
    def _build_section_content(self, section_info):
        """セクション内容構築"""
        
        section_type = section_info['type']
        hooks_included = section_info['hooks_included']
        knowledge_areas = section_info['knowledge_areas']
        
        content = f"""# 🎯 {section_info['section_id'].replace('_', ' ').title()}

## 📋 このセクションの概要
- **含まれるHooks数**: {len(hooks_included)}個
- **対象知識エリア**: {', '.join(set(knowledge_areas))}
- **推定実行時間**: {len(hooks_included) * 3}分

---

## 🪝 このセクションのHooks

"""
        
        for i, hook in enumerate(hooks_included, 1):
            content += f"""
### **Hook {i}: {hook.get('name', 'Unknown')}**

**カテゴリ**: {hook.get('category', 'General')}
**優先度**: {hook.get('priority', 'Medium')}
**Phase**: {hook.get('phase', 'N/A')}

#### **実装内容**
{hook.get('implementation', 'Implementation details...')}

#### **確認質問**
"""
            for q_num, question in enumerate(hook.get('questions', []), 1):
                content += f"{q_num}. {question}\n"
            
            content += f"""
#### **技術仕様**
{hook.get('technical_specs', 'Technical specifications...')}

---
"""
        
        content += f"""
## ✅ セクション完了チェックリスト

"""
        for i, hook in enumerate(hooks_included, 1):
            content += f"- [ ] Hook {i} ({hook.get('name', 'Unknown')}) 実装完了\n"
        
        content += f"""
- [ ] 全質問への回答完了
- [ ] 動作確認テスト完了
- [ ] 次セクションへの準備完了

## 🔗 ナビゲーション

- **前のセクション**: {self._get_previous_section_link(section_info['section_id'])}
- **次のセクション**: {self._get_next_section_link(section_info['section_id'])}
- **全体目次**: [プロジェクト全体概要に戻る](#プロジェクト全体概要)

---

**このセクション完了後、次のセクションに進んでください。**
"""
        
        return content
    
    def _enrich_sections_with_knowledge(self, sections):
        """セクション技術知識エンリッチメント"""
        
        enriched_sections = []
        
        for section in sections:
            # 各セクションに必要な技術知識を自動追加
            tech_knowledge = self._generate_section_specific_knowledge(section)
            
            enriched_section = section.copy()
            enriched_section['technical_knowledge'] = tech_knowledge
            enriched_section['content'] = self._embed_knowledge_in_content(
                section['content'], tech_knowledge
            )
            
            enriched_sections.append(enriched_section)
        
        return enriched_sections
    
    def _generate_section_specific_knowledge(self, section):
        """セクション固有技術知識生成"""
        
        hooks_included = section.get('hooks_included', [])
        knowledge_areas = section.get('knowledge_areas', [])
        
        tech_knowledge = {
            'css_knowledge': [],
            'javascript_knowledge': [],
            'php_knowledge': [],
            'security_knowledge': [],
            'performance_knowledge': [],
            'ai_integration_knowledge': []
        }
        
        # Hooks内容から必要な技術知識を抽出
        for hook in hooks_included:
            hook_category = hook.get('category', '').lower()
            
            if 'css' in hook_category:
                tech_knowledge['css_knowledge'].extend([
                    '```css\n/* BEM命名規則の例 */\n.block__element--modifier { }\n```',
                    'CSS外部化時は既存デザインの保持が重要',
                    'レスポンシブデザインのブレイクポイント: 768px, 1024px, 1200px'
                ])
            
            elif 'javascript' in hook_category or 'js' in hook_category:
                tech_knowledge['javascript_knowledge'].extend([
                    '```javascript\n// イベントハンドラの例\ndocument.getElementById("btn").addEventListener("click", handleClick);\n```',
                    'DOM操作はページロード完了後に実行',
                    'エラーハンドリングにはtry-catch文を使用'
                ])
            
            elif 'php' in hook_category:
                tech_knowledge['php_knowledge'].extend([
                    '```php\n<?php\n// セキュアなフォーム処理\nif ($_POST && csrf_token_valid()) {\n    // 処理\n}\n?>\n```',
                    'ユーザー入力は必ずサニタイズ',
                    'データベース接続にはPDOを推奨'
                ])
            
            elif 'security' in hook_category:
                tech_knowledge['security_knowledge'].extend([
                    'CSRFトークンの生成: $_SESSION["token"] = bin2hex(random_bytes(32))',
                    'XSS防止: htmlspecialchars($input, ENT_QUOTES, "UTF-8")',
                    'SQLインジェクション防止: プリペアドステートメント使用'
                ])
            
            elif 'ai' in hook_category:
                tech_knowledge['ai_integration_knowledge'].extend([
                    'DEEPSEEK API設定: api_key, model_version, max_tokens',
                    'Ollama起動: ollama run llama2',
                    'AI応答の品質チェックと例外処理が必要'
                ])
        
        # 空の配列を削除
        tech_knowledge = {k: v for k, v in tech_knowledge.items() if v}
        
        return tech_knowledge
    
    def _embed_knowledge_in_content(self, content, tech_knowledge):
        """コンテンツ内技術知識埋め込み"""
        
        if not tech_knowledge:
            return content
        
        knowledge_section = "\n## 🧠 このセクションで必要な技術知識\n\n"
        
        for knowledge_type, knowledge_items in tech_knowledge.items():
            if knowledge_items:
                knowledge_title = knowledge_type.replace('_', ' ').title().replace(' Knowledge', '')
                knowledge_section += f"### **{knowledge_title}**\n\n"
                
                for item in knowledge_items:
                    knowledge_section += f"{item}\n\n"
        
        # コンテンツの適切な位置に技術知識を挿入
        insert_position = content.find("## 🪝 このセクションのHooks")
        if insert_position != -1:
            return content[:insert_position] + knowledge_section + "\n---\n\n" + content[insert_position:]
        else:
            return content + "\n" + knowledge_section
    
    def _build_navigation_system(self, sections):
        """ナビゲーションシステム構築"""
        
        navigation = {
            'total_sections': len(sections),
            'section_map': {},
            'master_index': {},
            'progress_tracking': {}
        }
        
        # セクションマップ構築
        for i, section in enumerate(sections):
            section_id = section['section_id']
            navigation['section_map'][section_id] = {
                'index': i + 1,
                'title': section_id.replace('_', ' ').title(),
                'type': section['type'],
                'hooks_count': len(section.get('hooks_included', [])),
                'estimated_time': len(section.get('hooks_included', [])) * 3,
                'previous': sections[i-1]['section_id'] if i > 0 else None,
                'next': sections[i+1]['section_id'] if i < len(sections)-1 else None
            }
        
        # マスターインデックス生成
        master_index_content = self._generate_master_index(sections, navigation)
        navigation['master_index'] = master_index_content
        
        # 進捗追跡システム
        navigation['progress_tracking'] = {
            'completion_checklist': self._generate_completion_checklist(sections),
            'milestone_markers': self._generate_milestone_markers(sections),
            'estimated_total_time': sum(len(s.get('hooks_included', [])) * 3 for s in sections)
        }
        
        return navigation
    
    def _generate_master_index(self, sections, navigation):
        """マスターインデックス生成"""
        
        master_index = f"""# 📚 プロジェクト実行計画 - マスターインデックス

## 🎯 全体概要
- **総セクション数**: {len(sections)}個
- **総Hooks数**: {sum(len(s.get('hooks_included', [])) for s in sections)}個
- **予想総実行時間**: {sum(len(s.get('hooks_included', [])) * 3 for s in sections)}分

## 📋 セクション一覧

"""
        
        for section_id, section_info in navigation['section_map'].items():
            master_index += f"""
### **セクション {section_info['index']}: {section_info['title']}**
- **タイプ**: {section_info['type']}
- **Hooks数**: {section_info['hooks_count']}個
- **予想時間**: {section_info['estimated_time']}分
- **進行**: [ ] 未完了

"""
        
        master_index += f"""
## 🚀 実行手順

### **推奨実行順序**
1. このマスターインデックスを確認
2. セクション1から順番に実行
3. 各セクションの完了チェックリストを確認
4. 全セクション完了後、最終検証実行

### **効率的な進行方法**
- **一度に1セクション**: 複数セクション同時実行は避ける
- **完了確認必須**: 各セクション完了後、必ずチェックリスト確認
- **質問への回答**: 全質問に回答してから次へ進む
- **テスト実行**: 実装後は必ず動作確認

### **困った時の対処法**
- **エラー発生時**: そのセクション内の技術知識を再確認
- **理解困難時**: 前のセクションに戻って基礎を確認
- **進捗停滞時**: 別のセクションの並行実行を検討

---

**このファイルをブックマークし、必要時に参照してください。**
"""
        
        return master_index
    
    def generate_progressive_delivery_plan(self, splitting_result):
        """段階的配信計画生成"""
        
        sections = splitting_result['generated_sections']
        navigation = splitting_result['navigation_system']
        
        delivery_plan = {
            'delivery_strategy': 'progressive_sections',
            'sections_order': [],
            'delivery_schedule': {},
            'user_instructions': {}
        }
        
        # 配信順序決定
        for i, section in enumerate(sections):
            delivery_plan['sections_order'].append({
                'section_id': section['section_id'],
                'delivery_order': i + 1,
                'content_size': len(section['content']),
                'hooks_count': len(section.get('hooks_included', [])),
                'estimated_completion_time': len(section.get('hooks_included', [])) * 3
            })
        
        # 配信スケジュール
        delivery_plan['delivery_schedule'] = {
            'immediate_delivery': [sections[0]['section_id']] if sections else [],
            'on_request_delivery': [s['section_id'] for s in sections[1:]] if len(sections) > 1 else [],
            'batch_delivery_option': len(sections) <= 5  # 5セクション以下なら一括配信可能
        }
        
        # ユーザー向け指示
        delivery_plan['user_instructions'] = f"""
# 📖 段階的実行ガイド

## 🎯 このプロジェクトの進め方

このプロジェクトは**{len(sections)}個のセクション**に分割されており、文字数制限に対応するため段階的に提示されます。

### **実行手順**

1. **マスターインデックス確認** (このファイル)
   - 全体像の把握
   - セクション構成の理解

2. **セクション1から順次実行**
   - 「セクション2をお願いします」と要求
   - 各セクションを完了してから次へ

3. **各セクションでの作業**
   - 含まれるHooksの実装
   - 確認質問への回答
   - 動作テストの実行

4. **進捗確認**
   - セクション完了チェックリスト確認
   - 次セクションへの準備確認

### **セクション要求方法**

次のように要求してください：
- 「セクション2を表示してください」
- 「次のセクションをお願いします」
- 「Hooks Section 3を見せてください」

### **一括取得方法**

全セクションを一度に取得したい場合：
- 「全セクション一括表示をお願いします」
- 「分割なしの完全版をください」

---

**まずはセクション1から開始しましょう。「セクション1をお願いします」と要求してください。**
"""
        
        return delivery_plan
    
    def handle_section_request(self, splitting_result, requested_section):
        """セクション要求処理"""
        
        sections = splitting_result['generated_sections']
        navigation = splitting_result['navigation_system']
        
        # セクション特定
        target_section = None
        for section in sections:
            if (requested_section.lower() in section['section_id'].lower() or
                str(requested_section) in section['section_id']):
                target_section = section
                break
        
        if not target_section:
            return {
                'error': f'セクション "{requested_section}" が見つかりません',
                'available_sections': [s['section_id'] for s in sections]
            }
        
        # セクション配信
        return {
            'section_content': target_section['content'],
            'section_info': {
                'section_id': target_section['section_id'],
                'hooks_count': len(target_section.get('hooks_included', [])),
                'estimated_time': len(target_section.get('hooks_included', [])) * 3,
                'knowledge_areas': target_section.get('knowledge_areas', [])
            },
            'navigation_info': navigation['section_map'].get(target_section['section_id'], {}),
            'next_section_hint': f"完了後は「{navigation['section_map'].get(target_section['section_id'], {}).get('next', '最終確認')}」を要求してください"
        }

## 🎯 使用方法

### **大規模MDファイル分割例**
```python
# スマート分割システム初期化
splitter = SmartMDSplittingSystem()

# 膨大なMDファイル（例：200KB）
massive_md = """
# 巨大プロジェクト実行計画
[200KBの巨大なコンテンツ...]
"""

# 知的分割実行
splitting_result = splitter.split_massive_md_intelligently(
    massive_md, 
    {'project_type': 'enterprise', 'complexity': 'high'}
)

# 段階配信計画生成
delivery_plan = splitter.generate_progressive_delivery_plan(splitting_result)

# マスターインデックス表示
print(delivery_plan['user_instructions'])

# セクション要求処理例
section1 = splitter.handle_section_request(splitting_result, 'section_1')
print(section1['section_content'])
```

## ✅ スマート分割システムの特徴

- ✅ **知的分割**: Hooks数・内容・複雑度に基づく最適分割
- ✅ **技術知識分散**: 各セクションに必要な技術情報を自動配置
- ✅ **段階的配信**: 文字数制限完全回避の要求ベース配信
- ✅ **ナビゲーション**: セクション間移動の完全サポート
- ✅ **進捗管理**: 完了状況の追跡・管理機能
- ✅ **一括取得**: 必要時の全セクション統合配信