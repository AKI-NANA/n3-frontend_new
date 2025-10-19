/**
 * テンプレートローダー - HTML分離システム
 * HTMLテンプレートファイルを動的読み込み・キャッシュ
 */

window.TemplateLoader = (function() {
    
    // テンプレートキャッシュ
    const templateCache = new Map();
    
    // 基本設定
    const config = {
        templatePath: 'templates/',
        cacheTTL: 300000, // 5分
        debugMode: true
    };
    
    /**
     * テンプレートファイルを読み込み
     */
    async function loadTemplate(templateName) {
        const cacheKey = templateName;
        
        // キャッシュチェック
        if (templateCache.has(cacheKey)) {
            const cached = templateCache.get(cacheKey);
            if (Date.now() - cached.timestamp < config.cacheTTL) {
                if (config.debugMode) {
                    console.log(`📋 テンプレート "${templateName}" をキャッシュから取得`);
                }
                return cached.content;
            }
        }
        
        try {
            const response = await fetch(`${config.templatePath}${templateName}.html`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const content = await response.text();
            
            // キャッシュに保存
            templateCache.set(cacheKey, {
                content: content,
                timestamp: Date.now()
            });
            
            if (config.debugMode) {
                console.log(`📥 テンプレート "${templateName}" を読み込み完了`);
            }
            
            return content;
            
        } catch (error) {
            console.error(`❌ テンプレート読み込みエラー "${templateName}":`, error);
            return `<div class="template-error">テンプレート "${templateName}" の読み込みに失敗しました</div>`;
        }
    }
    
    /**
     * テンプレートに変数を挿入
     */
    function renderTemplate(templateContent, variables) {
        if (!variables || typeof variables !== 'object') {
            return templateContent;
        }
        
        let rendered = templateContent;
        
        // 変数置換 {{variable_name}} 形式
        Object.keys(variables).forEach(key => {
            const placeholder = `{{${key}}}`;
            const value = variables[key] !== null && variables[key] !== undefined ? 
                String(variables[key]) : '';
            rendered = rendered.split(placeholder).join(value);
        });
        
        // 条件分岐処理 {{if condition}}...{{/if}} 形式
        rendered = processed条件分岐(rendered, variables);
        
        // ループ処理 {{each items}}...{{/each}} 形式
        rendered = processLoop(rendered, variables);
        
        return rendered;
    }
    
    /**
     * 条件分岐処理
     */
    function processed条件分岐(content, variables) {
        const ifRegex = /{{if\s+([^}]+)}}([\s\S]*?){{\/if}}/g;
        
        return content.replace(ifRegex, (match, condition, innerContent) => {
            try {
                // 安全な条件評価（限定的な変数のみ許可）
                const conditionResult = evaluateCondition(condition, variables);
                return conditionResult ? innerContent : '';
            } catch (error) {
                console.warn('条件分岐エラー:', error);
                return ''; // エラー時は非表示
            }
        });
    }
    
    /**
     * ループ処理
     */
    function processLoop(content, variables) {
        const eachRegex = /{{each\s+([^}]+)}}([\s\S]*?){{\/each}}/g;
        
        return content.replace(eachRegex, (match, arrayName, innerContent) => {
            const array = variables[arrayName];
            
            if (!Array.isArray(array)) {
                return ''; // 配列でない場合は空文字
            }
            
            return array.map((item, index) => {
                let itemContent = innerContent;
                
                // アイテムのプロパティを置換
                if (typeof item === 'object' && item !== null) {
                    Object.keys(item).forEach(key => {
                        const placeholder = `{{${key}}}`;
                        const value = item[key] !== null && item[key] !== undefined ? 
                            String(item[key]) : '';
                        itemContent = itemContent.split(placeholder).join(value);
                    });
                }
                
                // インデックス情報も提供
                itemContent = itemContent.split('{{@index}}').join(String(index));
                itemContent = itemContent.split('{{@isFirst}}').join(String(index === 0));
                itemContent = itemContent.split('{{@isLast}}').join(String(index === array.length - 1));
                
                return itemContent;
            }).join('');
        });
    }
    
    /**
     * 安全な条件評価
     */
    function evaluateCondition(condition, variables) {
        // 基本的な条件のみサポート（セキュリティ重視）
        const safeConditions = {
            'true': true,
            'false': false
        };
        
        // 変数存在チェック
        if (condition in variables) {
            const value = variables[condition];
            return Boolean(value);
        }
        
        // 基本的な比較
        const comparisonMatch = condition.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(==|!=|>|<|>=|<=)\s*(.+)$/);
        if (comparisonMatch) {
            const [, varName, operator, compareValue] = comparisonMatch;
            const varValue = variables[varName];
            
            // 数値比較
            if (!isNaN(compareValue)) {
                const numCompareValue = parseFloat(compareValue);
                const numVarValue = parseFloat(varValue);
                
                switch (operator) {
                    case '==': return numVarValue == numCompareValue;
                    case '!=': return numVarValue != numCompareValue;
                    case '>': return numVarValue > numCompareValue;
                    case '<': return numVarValue < numCompareValue;
                    case '>=': return numVarValue >= numCompareValue;
                    case '<=': return numVarValue <= numCompareValue;
                }
            }
            
            // 文字列比較
            switch (operator) {
                case '==': return String(varValue) === compareValue.replace(/['"]/g, '');
                case '!=': return String(varValue) !== compareValue.replace(/['"]/g, '');
            }
        }
        
        return false;
    }
    
    /**
     * テンプレートを読み込み＆レンダリング
     */
    async function render(templateName, variables = {}) {
        const template = await loadTemplate(templateName);
        return renderTemplate(template, variables);
    }
    
    /**
     * DOMに直接挿入
     */
    async function renderTo(elementId, templateName, variables = {}) {
        const rendered = await render(templateName, variables);
        const element = document.getElementById(elementId);
        
        if (element) {
            element.innerHTML = rendered;
            if (config.debugMode) {
                console.log(`📍 テンプレート "${templateName}" を #${elementId} に挿入`);
            }
        } else {
            console.error(`❌ 要素 #${elementId} が見つかりません`);
        }
    }
    
    /**
     * 複数テンプレートを結合
     */
    async function renderMultiple(templates) {
        const results = await Promise.all(
            templates.map(async ({ name, variables }) => {
                return await render(name, variables);
            })
        );
        
        return results.join('');
    }
    
    /**
     * キャッシュクリア
     */
    function clearCache() {
        templateCache.clear();
        console.log('🗑️ テンプレートキャッシュをクリアしました');
    }
    
    // 公開API
    return {
        render,
        renderTo,
        renderMultiple,
        clearCache,
        
        // 設定
        setDebugMode: (enabled) => { config.debugMode = enabled; },
        setTemplatePath: (path) => { config.templatePath = path; },
        setCacheTTL: (ttl) => { config.cacheTTL = ttl; }
    };
})();

// グローバルに公開
window.TL = window.TemplateLoader;

console.log('📋 TemplateLoader 初期化完了');
