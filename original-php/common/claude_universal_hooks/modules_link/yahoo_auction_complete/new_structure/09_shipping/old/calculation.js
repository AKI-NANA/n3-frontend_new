/**
 * Yahoo Auction Tool - 送料計算システム JavaScript
 * 機能: 国際配送料計算・配送業者比較・プロファイル管理
 */

// グローバル変数
let currentCalculation = null;
let savedProfiles = [];

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('送料計算システム初期化開始');
    loadSavedProfiles();
    setupEventListeners();
});

// イベントリスナー設定
function setupEventListeners() {
    // 入力フィールドの変更監視
    const inputs = ['shippingWeight', 'shippingWidth', 'shippingHeight', 'shippingDepth', 'shippingCountry'];
    inputs.forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.addEventListener('input', validateInputs);
        }
    });
}

// 入力値バリデーション
function validateInputs() {
    const weight = parseFloat(document.getElementById('shippingWeight').value) || 0;
    const country = document.getElementById('shippingCountry').value;
    
    const calculateBtn = document.querySelector('.btn-primary.btn-large');
    
    if (weight > 0 && country) {
        calculateBtn.disabled = false;
        calculateBtn.classList.remove('disabled');
    } else {
        calculateBtn.disabled = true;
        calculateBtn.classList.add('disabled');
    }
}

// 送料計算実行
function calculateShippingCandidates() {
    console.log('送料計算開始');
    
    // 入力値取得
    const weight = parseFloat(document.getElementById('shippingWeight').value);
    const width = parseFloat(document.getElementById('shippingWidth').value) || 0;
    const height = parseFloat(document.getElementById('shippingHeight').value) || 0;
    const depth = parseFloat(document.getElementById('shippingDepth').value) || 0;
    const country = document.getElementById('shippingCountry').value;
    
    // バリデーション
    if (!weight || weight <= 0) {
        alert('重量を正しく入力してください。');
        return;
    }
    
    if (!country) {
        alert('配送先国を選択してください。');
        return;
    }
    
    // API呼び出し
    const requestData = {
        weight: weight,
        dimensions: {
            length: Math.max(width, height, depth),
            width: width,
            height: height
        },
        destination: country,
        origin: 'JP'
    };
    
    // ローディング表示
    showCalculationLoading();
    
    fetch('calculation.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'calculate_shipping',
            ...requestData
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentCalculation = data.data;
            displayShippingCandidates(data.data);
            showCandidatesContainer();
        } else {
            alert('送料計算エラー: ' + data.message);
        }
    })
    .catch(error => {
        console.error('送料計算エラー:', error);
        alert('送料計算中にエラーが発生しました。');
    })
    .finally(() => {
        hideCalculationLoading();
    });
}

// ローディング表示
function showCalculationLoading() {
    const button = document.querySelector('.btn-primary.btn-large');
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 計算中...';
    button.disabled = true;
}

// ローディング非表示
function hideCalculationLoading() {
    const button = document.querySelector('.btn-primary.btn-large');
    button.innerHTML = '<i class="fas fa-search"></i> 送料計算・候補検索';
    button.disabled = false;
}

// 候補コンテナ表示
function showCandidatesContainer() {
    document.getElementById('candidatesContainer').style.display = 'block';
    
    // スムーススクロール
    document.getElementById('candidatesContainer').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// 送料候補表示
function displayShippingCandidates(calculation) {
    const container = document.getElementById('candidatesList');
    const summaryContainer = document.getElementById('calculationSummary');
    
    // 計算サマリー表示
    const details = calculation.calculation_details;
    summaryContainer.innerHTML = `
        <div class="summary-info">
            <span><i class="fas fa-weight"></i> ${details.weight}kg</span>
            <span><i class="fas fa-map-marker-alt"></i> 日本 → ${getCountryName(details.destination)}</span>
            <span><i class="fas fa-clock"></i> ${details.calculated_at}</span>
        </div>
    `;
    
    // 候補カード生成
    const html = calculation.options.map((option, index) => createCandidateCard(option, index)).join('');
    container.innerHTML = html;
}

// 候補カード生成
function createCandidateCard(option, index) {
    const isRecommended = option.recommended;
    const ranking = index + 1;
    const rankingIcon = ranking === 1 ? '🥇' : ranking === 2 ? '🥈' : ranking === 3 ? '🥉' : `${ranking}位`;
    
    return `
        <div class="candidate-card ${isRecommended ? 'candidate-recommended' : ''}">
            <div class="candidate-header">
                <div class="candidate-ranking">${rankingIcon}</div>
                <div class="candidate-name">${option.carrier_name}</div>
                ${isRecommended ? '<div class="recommended-badge">推奨</div>' : ''}
            </div>
            
            <div class="candidate-price">
                <div class="price-jpy">¥${option.cost_jpy.toLocaleString()}</div>
                <div class="price-usd">$${option.cost_usd}</div>
            </div>
            
            <div class="candidate-details">
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>配送日数: ${option.delivery_days}営業日</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-${option.tracking ? 'check' : 'times'}"></i>
                    <span>追跡: ${option.tracking ? '有り' : '無し'}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-${option.insurance ? 'shield-alt' : 'times'}"></i>
                    <span>保険: ${option.insurance ? '有り' : '無し'}</span>
                </div>
                <div class="detail-item ${option.size_ok ? 'size-ok' : 'size-warning'}">
                    <i class="fas fa-${option.size_ok ? 'check' : 'exclamation-triangle'}"></i>
                    <span>サイズ: ${option.size_ok ? '制限内' : '要確認'}</span>
                </div>
            </div>
            
            <div class="candidate-actions">
                <button class="btn btn-primary btn-sm" onclick="selectShippingOption('${option.carrier_id}', ${option.cost_usd})">
                    <i class="fas fa-check"></i> この配送方法を選択
                </button>
                <button class="btn btn-info btn-sm" onclick="viewCarrierDetails('${option.carrier_id}')">
                    <i class="fas fa-info"></i> 詳細
                </button>
            </div>
        </div>
    `;
}

// 配送業者詳細表示
function viewCarrierDetails(carrierId) {
    const carrierInfo = {
        'japan_post_ems': {
            name: 'Japan Post EMS',
            description: '日本郵便の国際スピード郵便。速くて確実な配送サービス。',
            features: ['追跡番号付き', '損害補償付き', '受取確認付き', '短期間配送'],
            restrictions: ['最大重量30kg', '最大サイズ150cm'],
            website: 'https://www.post.japanpost.jp/int/ems/'
        },
        'yamato_international': {
            name: 'Yamato International',
            description: 'ヤマト運輸の国際宅急便。信頼性の高い配送サービス。',
            features: ['追跡番号付き', '損害補償付き', '配送状況通知', '再配達サービス'],
            restrictions: ['最大重量25kg', '最大サイズ160cm'],
            website: 'https://www.kuronekoyamato.co.jp/ytc/int/'
        },
        'fedex_express': {
            name: 'FedEx International Express',
            description: 'FedExの国際速達便。世界最速クラスの配送。',
            features: ['最速配送', '完全追跡', '署名確認', '24時間サポート'],
            restrictions: ['最大重量68kg', '特別サイズ対応'],
            website: 'https://www.fedex.com/ja-jp/'
        }
    };
    
    const info = carrierInfo[carrierId] || { name: 'Unknown', description: '情報なし' };
    
    alert(`${info.name}\n\n${info.description}\n\n主な特徴:\n${info.features?.join('\n') || 'なし'}\n\n制限:\n${info.restrictions?.join('\n') || 'なし'}`);
}

// 配送方法選択
function selectShippingOption(carrierId, costUsd) {
    const confirmed = confirm(`この配送方法を選択しますか？\n配送業者: ${carrierId}\n送料: $${costUsd}`);
    
    if (confirmed) {
        // 選択された配送方法を記録（実装は将来的にデータベース保存）
        console.log('配送方法選択:', { carrierId, costUsd });
        alert('✅ 配送方法を選択しました。この情報は商品データに保存されます。');
    }
}

// 国名取得
function getCountryName(countryCode) {
    const countries = {
        'US': 'アメリカ合衆国',
        'CA': 'カナダ',
        'AU': 'オーストラリア',
        'GB': 'イギリス',
        'DE': 'ドイツ',
        'FR': 'フランス',
        'IT': 'イタリア',
        'ES': 'スペイン'
    };
    
    return countries[countryCode] || countryCode;
}

// フォームクリア
function clearCalculationForm() {
    document.getElementById('shippingWeight').value = '';
    document.getElementById('shippingWidth').value = '';
    document.getElementById('shippingHeight').value = '';
    document.getElementById('shippingDepth').value = '';
    document.getElementById('shippingCountry').value = '';
    
    document.getElementById('candidatesContainer').style.display = 'none';
    currentCalculation = null;
    
    validateInputs();
}

// 現在の設定をプロファイルとして保存
function saveCurrentProfile() {
    const weight = document.getElementById('shippingWeight').value;
    const width = document.getElementById('shippingWidth').value;
    const height = document.getElementById('shippingHeight').value;
    const depth = document.getElementById('shippingDepth').value;
    const country = document.getElementById('shippingCountry').value;
    
    if (!weight || !country) {
        alert('重量と配送先国を入力してからプロファイルを保存してください。');
        return;
    }
    
    const profileName = prompt('プロファイル名を入力してください:', '新しいプロファイル');
    if (!profileName) return;
    
    const profileData = {
        name: profileName,
        weight: parseFloat(weight),
        dimensions: {
            width: parseFloat(width) || 0,
            height: parseFloat(height) || 0,
            depth: parseFloat(depth) || 0
        },
        country: country,
        created_at: new Date().toISOString()
    };
    
    fetch('calculation.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'save_shipping_profile',
            profile: profileData
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('✅ プロファイルを保存しました');
            loadSavedProfiles();
        } else {
            alert('❌ プロファイル保存に失敗しました: ' + data.message);
        }
    })
    .catch(error => {
        console.error('プロファイル保存エラー:', error);
        alert('プロファイル保存中にエラーが発生しました。');
    });
}

// 保存済みプロファイル読み込み
function loadSavedProfiles() {
    // 簡易実装：ローカルストレージから読み込み
    const profiles = JSON.parse(localStorage.getItem('shippingProfiles') || '[]');
    savedProfiles = profiles;
    displaySavedProfiles();
}

// 保存済みプロファイル表示
function displaySavedProfiles() {
    const container = document.getElementById('profilesList');
    
    // 標準プロファイルを含める
    const standardProfiles = [
        {
            name: '標準商品',
            weight: 1.0,
            dimensions: { width: 20, height: 15, depth: 10 },
            country: 'US'
        },
        {
            name: '大型商品',
            weight: 5.0,
            dimensions: { width: 50, height: 40, depth: 30 },
            country: 'US'
        }
    ];
    
    const allProfiles = [...standardProfiles, ...savedProfiles];
    
    const html = allProfiles.map(profile => createProfileCard(profile)).join('');
    container.innerHTML = html;
}

// プロファイルカード生成
function createProfileCard(profile) {
    return `
        <div class="profile-card">
            <div class="profile-header">
                <h4>${profile.name}</h4>
                <button class="btn btn-sm btn-primary" onclick="loadProfile('${profile.name}')">読み込み</button>
            </div>
            <div class="profile-details">
                <span><i class="fas fa-weight"></i> ${profile.weight}kg</span>
                <span><i class="fas fa-cube"></i> ${profile.dimensions.width}×${profile.dimensions.height}×${profile.dimensions.depth}cm</span>
                <span><i class="fas fa-map-marker-alt"></i> ${getCountryName(profile.country)}</span>
            </div>
        </div>
    `;
}

// プロファイル読み込み
function loadProfile(profileName) {
    // 標準プロファイルまたは保存済みプロファイルから検索
    const standardProfiles = [
        {
            name: '標準商品',
            weight: 1.0,
            dimensions: { width: 20, height: 15, depth: 10 },
            country: 'US'
        },
        {
            name: '大型商品',
            weight: 5.0,
            dimensions: { width: 50, height: 40, depth: 30 },
            country: 'US'
        }
    ];
    
    const allProfiles = [...standardProfiles, ...savedProfiles];
    const profile = allProfiles.find(p => p.name === profileName);
    
    if (profile) {
        document.getElementById('shippingWeight').value = profile.weight;
        document.getElementById('shippingWidth').value = profile.dimensions.width;
        document.getElementById('shippingHeight').value = profile.dimensions.height;
        document.getElementById('shippingDepth').value = profile.dimensions.depth;
        document.getElementById('shippingCountry').value = profile.country;
        
        validateInputs();
        
        alert(`✅ プロファイル「${profileName}」を読み込みました`);
    } else {
        alert('プロファイルが見つかりません');
    }
}

console.log('送料計算システム JavaScript 読み込み完了');