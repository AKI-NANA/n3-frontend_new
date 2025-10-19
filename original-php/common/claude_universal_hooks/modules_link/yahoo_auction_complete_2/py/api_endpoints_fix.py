# 🔧 Python APIサーバー修正版
# workflow_api_server_complete.py に以下のエンドポイントを追加

@app.route('/system_status', methods=['GET'])
def system_status_endpoint():
    """PHP側から呼び出される統計情報取得エンドポイント"""
    try:
        if not workflow:
            return jsonify({
                'success': False,
                'error': 'ワークフローシステム未初期化',
                'stats': {
                    'total': 0,
                    'scraped': 0,
                    'edited': 0,
                    'listed': 0,
                    'today_scraped': 0,
                    'error': 0
                },
                'profit_stats': {
                    'total_profit': 0,
                    'avg_margin': 0,
                    'max_margin': 0
                }
            })
        
        # ワークフロー状態取得
        workflow_status = workflow.get_workflow_status()
        
        # CSV存在確認とデータ統計
        stats = {
            'total': workflow_status.get('total', 0),
            'scraped': workflow_status.get('scraped', 0),
            'edited': workflow_status.get('edited', 0),
            'listed': workflow_status.get('listed', 0),
            'today_scraped': 0,
            'error': workflow_status.get('error', 0)
        }
        
        # 今日のスクレイピング数をカウント
        if workflow.csv_path.exists():
            try:
                df = pd.read_csv(workflow.csv_path, encoding='utf-8')
                today = datetime.now().strftime('%Y-%m-%d')
                today_data = df[df['scrape_timestamp'].str.contains(today, na=False)]
                stats['today_scraped'] = len(today_data)
            except Exception as e:
                print(f"今日の統計取得エラー: {e}")
        
        # 利益統計（基本値）
        profit_stats = {
            'total_profit': stats['total'] * 10,  # 仮の計算
            'avg_margin': 15.5,
            'max_margin': 45.0
        }
        
        log_request('system_status', True)
        
        return jsonify({
            'success': True,
            'stats': stats,
            'profit_stats': profit_stats,
            'system_info': {
                'server_start_time': system_status['server_start_time'],
                'total_requests': system_status['total_requests'],
                'successful_requests': system_status['successful_requests'],
                'failed_requests': system_status['failed_requests'],
                'workflow_initialized': workflow is not None
            }
        })
        
    except Exception as e:
        log_request('system_status', False, e)
        return jsonify({
            'success': False,
            'error': str(e),
            'stats': {'total': 0, 'scraped': 0, 'edited': 0, 'listed': 0, 'today_scraped': 0, 'error': 0},
            'profit_stats': {'total_profit': 0, 'avg_margin': 0, 'max_margin': 0}
        }), 500

@app.route('/search_data', methods=['POST'])
def search_data():
    """PHP側から呼び出される検索機能"""
    try:
        if not workflow or not workflow.csv_path.exists():
            return jsonify({
                'success': False,
                'error': 'データが存在しません',
                'data': [],
                'count': 0
            })
        
        data = request.get_json() or {}
        query = data.get('query', '').strip()
        status_filter = data.get('status_filter', '')
        date_filter = data.get('date_filter', '')
        
        # CSVデータ読み込み
        df = pd.read_csv(workflow.csv_path, encoding='utf-8')
        
        # フィルタリング処理
        filtered_df = df.copy()
        
        # キーワード検索
        if query:
            mask = (
                df['title_jp'].str.contains(query, case=False, na=False) |
                df['description_jp'].str.contains(query, case=False, na=False) |
                df['product_id'].str.contains(query, case=False, na=False)
            )
            filtered_df = filtered_df[mask]
        
        # ステータスフィルタ
        if status_filter:
            filtered_df = filtered_df[filtered_df['status'] == status_filter]
        
        # 日付フィルタ
        if date_filter:
            today = datetime.now().strftime('%Y-%m-%d')
            if date_filter == 'today':
                filtered_df = filtered_df[filtered_df['scrape_timestamp'].str.contains(today, na=False)]
            elif date_filter == 'week':
                week_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
                filtered_df = filtered_df[filtered_df['scrape_timestamp'] >= week_ago]
            elif date_filter == 'month':
                month_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
                filtered_df = filtered_df[filtered_df['scrape_timestamp'] >= month_ago]
        
        # 結果を辞書形式に変換
        results = filtered_df.head(100).to_dict('records')  # 最大100件
        
        log_request('search_data', True)
        
        return jsonify({
            'success': True,
            'data': results,
            'count': len(results),
            'total_count': len(filtered_df)
        })
        
    except Exception as e:
        log_request('search_data', False, e)
        return jsonify({
            'success': False,
            'error': str(e),
            'data': [],
            'count': 0
        }), 500
