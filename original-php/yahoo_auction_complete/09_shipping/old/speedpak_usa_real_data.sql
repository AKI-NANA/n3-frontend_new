-- SpeedPAK USA 実データ投入（PDFから抽出）
-- ソース: RATE GUIDE of eBay SpeedPAK Economy-JP.pdf

-- 既存のSpeedPAK推定データを削除
DELETE FROM real_shipping_rates WHERE carrier_code = 'SPEEDPAK';

-- SpeedPAK Economy USA本土48州（実データ）
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) VALUES
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 100, 100, 1227, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 200, 200, 1367, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 300, 300, 1581, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 400, 400, 1778, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 500, 500, 2060, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 600, 600, 2222, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 700, 700, 2321, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 800, 800, 2703, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 900, 900, 2820, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 1000, 1000, 3020, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 1100, 1100, 3136, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 1200, 1200, 3250, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 1300, 1300, 3366, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 1400, 1400, 3704, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 1500, 1500, 3816, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 1600, 1600, 3935, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 1700, 1700, 4046, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 1800, 1800, 4165, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 1900, 1900, 5056, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 2000, 2000, 5245, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 2500, 2500, 5582, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 3000, 3000, 6333, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 3500, 3500, 6958, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 4000, 4000, 7704, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 4500, 4500, 9135, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 5000, 5000, 11733, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 5500, 5500, 12500, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 6000, 6000, 13335, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 6500, 6500, 14160, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 7000, 7000, 15209, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 7500, 7500, 16058, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 8000, 8000, 16893, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 8500, 8500, 17562, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 9000, 9000, 18152, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 9500, 9500, 19106, 'pdf_speedpak_usa_48states'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 10000, 10000, 19639, 'pdf_speedpak_usa_48states');

-- SpeedPAK Economy USA本土48州以外（実データ）
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) VALUES
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 100, 100, 1300, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 200, 200, 1477, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 300, 300, 1806, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 400, 400, 2126, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 500, 500, 2622, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 600, 600, 2799, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 700, 700, 2898, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 800, 800, 3345, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 900, 900, 3463, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 1000, 1000, 4076, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 1100, 1100, 4192, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 1200, 1200, 4306, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 1300, 1300, 4422, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 1400, 1400, 5088, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 1500, 1500, 5200, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 1600, 1600, 5319, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 1700, 1700, 5430, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 1800, 1800, 5549, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 1900, 1900, 5606, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 2000, 2000, 5805, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 2500, 2500, 6070, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 3000, 3000, 6986, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 3500, 3500, 7859, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 4000, 4000, 8705, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 4500, 4500, 9977, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 5000, 5000, 11733, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 5500, 5500, 12500, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 6000, 6000, 13335, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 6500, 6500, 14160, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 7000, 7000, 15694, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 7500, 7500, 16404, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 8000, 8000, 17102, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 8500, 8500, 17797, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 9000, 9000, 18453, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 9500, 9500, 19148, 'pdf_speedpak_usa_outside48'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY_OUTSIDE', 'zone1', 10000, 10000, 20029, 'pdf_speedpak_usa_outside48');

-- 投入確認
DO $$
DECLARE
    total_records INTEGER;
    usa48_records INTEGER;
    usa_outside_records INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_records FROM real_shipping_rates WHERE carrier_code = 'SPEEDPAK';
    SELECT COUNT(*) INTO usa48_records FROM real_shipping_rates WHERE service_code = 'SPEEDPAK_ECONOMY';
    SELECT COUNT(*) INTO usa_outside_records FROM real_shipping_rates WHERE service_code = 'SPEEDPAK_ECONOMY_OUTSIDE';

    RAISE NOTICE '✅ SpeedPAK USA実データ投入完了';
    RAISE NOTICE '======================================';
    RAISE NOTICE 'SpeedPAK総レコード数: % 件', total_records;
    RAISE NOTICE '  USA本土48州: % 件 (0.1kg-10kg)', usa48_records;
    RAISE NOTICE '  USA本土外: % 件 (0.1kg-10kg)', usa_outside_records;
    RAISE NOTICE '';
    RAISE NOTICE '📄 データソース: PDF抽出済み';
    RAISE NOTICE '🎯 重量範囲: 0.1kg-10.0kg (0.1kg刻み)';
    RAISE NOTICE '💰 料金範囲: ¥1,227-¥20,029';
    RAISE NOTICE '';
    RAISE NOTICE '📋 サービス詳細:';
    RAISE NOTICE '  SpeedPAK Economy (本土48州): 8-12営業日';
    RAISE NOTICE '  SpeedPAK Economy (本土外): 配送期間調整';
    RAISE NOTICE '  重量制限: 25kg (本土48州), 15kg (本土外)';
    RAISE NOTICE '  寸法制限: 長さ≤66cm, 長さ+2*(幅+高)≤274cm';
END $$;