-- HTS Chapters 全99章データ投入SQL（エスケープ処理済み）
-- PostgreSQL用：シングルクォートを''でエスケープ

-- まず既存データを削除
DELETE FROM hts_codes_chapters;

-- 全99章を一括投入
INSERT INTO hts_codes_chapters (chapter_code, title_english, title_japanese, section_number, section_title, sort_order) VALUES
-- Section I (01-05)
('01', 'Live animals', '生きている動物', 1, 'SECTION I', 1),
('02', 'Meat and edible meat offal', '肉及び食用のくず肉', 1, 'SECTION I', 2),
('03', 'Fish and crustaceans, molluscs and other aquatic invertebrates', '魚並びに甲殻類、軟体動物及びその他の水棲無脊椎動物', 1, 'SECTION I', 3),
('04', 'Dairy produce; birds'' eggs; natural honey', '酪農品、鳥卵、天然はちみつ', 1, 'SECTION I', 4),
('05', 'Products of animal origin, not elsewhere specified', '動物性生産品', 1, 'SECTION I', 5),

-- Section II (06-14)
('06', 'Live trees and other plants', '生きている樹木その他の植物', 2, 'SECTION II', 6),
('07', 'Edible vegetables and certain roots and tubers', '食用の野菜、根及び塊茎', 2, 'SECTION II', 7),
('08', 'Edible fruit and nuts', '食用の果実及びナット', 2, 'SECTION II', 8),
('09', 'Coffee, tea, mate and spices', 'コーヒー、茶、マテ及び香辛料', 2, 'SECTION II', 9),
('10', 'Cereals', '穀物', 2, 'SECTION II', 10),
('11', 'Products of the milling industry', 'ばいせん工業の生産品', 2, 'SECTION II', 11),
('12', 'Oil seeds and oleaginous fruits', '採油用の種及び果実', 2, 'SECTION II', 12),
('13', 'Lac; gums, resins', 'ラック並びにガム、樹脂', 2, 'SECTION II', 13),
('14', 'Vegetable plaiting materials', '植物性の組物材料', 2, 'SECTION II', 14),

-- Section III (15)
('15', 'Animal or vegetable fats and oils', '動物性又は植物性の油脂', 3, 'SECTION III', 15),

-- Section IV (16-24)
('16', 'Preparations of meat, fish or crustaceans', '肉、魚の調製品', 4, 'SECTION IV', 16),
('17', 'Sugars and sugar confectionery', '砂糖及び砂糖菓子', 4, 'SECTION IV', 17),
('18', 'Cocoa and cocoa preparations', 'ココア及びその調製品', 4, 'SECTION IV', 18),
('19', 'Preparations of cereals, flour, starch or milk', '穀物、穀粉、でん粉の調製品', 4, 'SECTION IV', 19),
('20', 'Preparations of vegetables, fruit, nuts', '野菜、果実、ナットの調製品', 4, 'SECTION IV', 20),
('21', 'Miscellaneous edible preparations', '各種の調製食料品', 4, 'SECTION IV', 21),
('22', 'Beverages, spirits and vinegar', '飲料、アルコール及び食酢', 4, 'SECTION IV', 22),
('23', 'Residues and waste from food industries', '食品工業の残留物', 4, 'SECTION IV', 23),
('24', 'Tobacco and manufactured tobacco substitutes', 'たばこ', 4, 'SECTION IV', 24),

-- Section V (25-27)
('25', 'Salt; sulfur; earths and stone', '塩、硫黄、土石類', 5, 'SECTION V', 25),
('26', 'Ores, slag and ash', '鉱石、スラグ及び灰', 5, 'SECTION V', 26),
('27', 'Mineral fuels, mineral oils', '鉱物性燃料及び鉱物油', 5, 'SECTION V', 27),

-- Section VI (28-38)
('28', 'Inorganic chemicals', '無機化学品', 6, 'SECTION VI', 28),
('29', 'Organic chemicals', '有機化学品', 6, 'SECTION VI', 29),
('30', 'Pharmaceutical products', '医療用品', 6, 'SECTION VI', 30),
('31', 'Fertilizers', '肥料', 6, 'SECTION VI', 31),
('32', 'Tanning or dyeing extracts', 'なめしエキス、染色エキス', 6, 'SECTION VI', 32),
('33', 'Essential oils and resinoids', '精油、レジノイド', 6, 'SECTION VI', 33),
('34', 'Soap, organic surface-active agents', 'せっけん', 6, 'SECTION VI', 34),
('35', 'Albuminoidal substances', 'たんぱく系物質', 6, 'SECTION VI', 35),
('36', 'Explosives; pyrotechnic products', '火薬類、火工品', 6, 'SECTION VI', 36),
('37', 'Photographic or cinematographic goods', '写真用材料', 6, 'SECTION VI', 37),
('38', 'Miscellaneous chemical products', '化学工業生産品', 6, 'SECTION VI', 38),

-- Section VII (39-40)
('39', 'Plastics and articles thereof', 'プラスチック', 7, 'SECTION VII', 39),
('40', 'Rubber and articles thereof', 'ゴム', 7, 'SECTION VII', 40),

-- Section VIII (41-43)
('41', 'Raw hides and skins and leather', '原皮及び革', 8, 'SECTION VIII', 41),
('42', 'Articles of leather', '革製品', 8, 'SECTION VIII', 42),
('43', 'Furskins and artificial fur', '毛皮', 8, 'SECTION VIII', 43),

-- Section IX (44-46)
('44', 'Wood and articles of wood', '木材', 9, 'SECTION IX', 44),
('45', 'Cork and articles of cork', 'コルク', 9, 'SECTION IX', 45),
('46', 'Manufactures of straw', 'わら製品', 9, 'SECTION IX', 46),

-- Section X (47-49)
('47', 'Pulp of wood or other fibrous material', '木材パルプ', 10, 'SECTION X', 47),
('48', 'Paper and paperboard', '紙及び板紙', 10, 'SECTION X', 48),
('49', 'Printed books, newspapers, pictures', '印刷した書籍', 10, 'SECTION X', 49),

-- Section XI (50-63)
('50', 'Silk', '絹', 11, 'SECTION XI', 50),
('51', 'Wool, fine or coarse animal hair', '羊毛', 11, 'SECTION XI', 51),
('52', 'Cotton', '綿', 11, 'SECTION XI', 52),
('53', 'Other vegetable textile fibers', 'その他の植物性繊維', 11, 'SECTION XI', 53),
('54', 'Man-made filaments', '人造繊維の長繊維', 11, 'SECTION XI', 54),
('55', 'Man-made staple fibers', '人造繊維の短繊維', 11, 'SECTION XI', 55),
('56', 'Wadding, felt and nonwovens', 'ウォッディング、フェルト', 11, 'SECTION XI', 56),
('57', 'Carpets and other textile floor coverings', 'じゅうたん', 11, 'SECTION XI', 57),
('58', 'Special woven fabrics', '特殊織物', 11, 'SECTION XI', 58),
('59', 'Impregnated, coated textile fabrics', '浸透、塗布した織物', 11, 'SECTION XI', 59),
('60', 'Knitted or crocheted fabrics', 'メリヤス編物', 11, 'SECTION XI', 60),
('61', 'Articles of apparel, knitted or crocheted', '衣類（編物）', 11, 'SECTION XI', 61),
('62', 'Articles of apparel, not knitted', '衣類（織物）', 11, 'SECTION XI', 62),
('63', 'Other made up textile articles', 'その他の繊維製品', 11, 'SECTION XI', 63),

-- Section XII (64-67)
('64', 'Footwear, gaiters and the like', '履物', 12, 'SECTION XII', 64),
('65', 'Headgear and parts thereof', '帽子', 12, 'SECTION XII', 65),
('66', 'Umbrellas, walking-sticks', '傘、つえ', 12, 'SECTION XII', 66),
('67', 'Prepared feathers and down', '羽毛製品', 12, 'SECTION XII', 67),

-- Section XIII (68-70)
('68', 'Articles of stone, plaster, cement', '石、プラスター製品', 13, 'SECTION XIII', 68),
('69', 'Ceramic products', '陶磁製品', 13, 'SECTION XIII', 69),
('70', 'Glass and glassware', 'ガラス', 13, 'SECTION XIII', 70),

-- Section XIV (71)
('71', 'Natural or cultured pearls, precious stones', '真珠、貴石', 14, 'SECTION XIV', 71),

-- Section XV (72-83)
('72', 'Iron and steel', '鉄鋼', 15, 'SECTION XV', 72),
('73', 'Articles of iron or steel', '鉄鋼製品', 15, 'SECTION XV', 73),
('74', 'Copper and articles thereof', '銅', 15, 'SECTION XV', 74),
('75', 'Nickel and articles thereof', 'ニッケル', 15, 'SECTION XV', 75),
('76', 'Aluminum and articles thereof', 'アルミニウム', 15, 'SECTION XV', 76),
('78', 'Lead and articles thereof', '鉛', 15, 'SECTION XV', 78),
('79', 'Zinc and articles thereof', '亜鉛', 15, 'SECTION XV', 79),
('80', 'Tin and articles thereof', 'すず', 15, 'SECTION XV', 80),
('81', 'Other base metals', 'その他の卑金属', 15, 'SECTION XV', 81),
('82', 'Tools, implements, cutlery', '工具、刃物', 15, 'SECTION XV', 82),
('83', 'Miscellaneous articles of base metal', '卑金属製品', 15, 'SECTION XV', 83),

-- Section XVI (84-85)
('84', 'Nuclear reactors, boilers, machinery', '原子炉、ボイラー、機械', 16, 'SECTION XVI', 84),
('85', 'Electrical machinery and equipment', '電気機器', 16, 'SECTION XVI', 85),

-- Section XVII (86-89)
('86', 'Railway or tramway locomotives', '鉄道用機関車', 17, 'SECTION XVII', 86),
('87', 'Vehicles other than railway', '車両', 17, 'SECTION XVII', 87),
('88', 'Aircraft, spacecraft', '航空機', 17, 'SECTION XVII', 88),
('89', 'Ships, boats and floating structures', '船舶', 17, 'SECTION XVII', 89),

-- Section XVIII (90-92)
('90', 'Optical, photographic instruments', '光学機器', 18, 'SECTION XVIII', 90),
('91', 'Clocks and watches', '時計', 18, 'SECTION XVIII', 91),
('92', 'Musical instruments', '楽器', 18, 'SECTION XVIII', 92),

-- Section XIX (93)
('93', 'Arms and ammunition', '武器', 19, 'SECTION XIX', 93),

-- Section XX (94-96)
('94', 'Furniture; bedding, mattresses', '家具、寝具', 20, 'SECTION XX', 94),
('95', 'Toys, games and sports requisites', 'がん具、遊戯用具', 20, 'SECTION XX', 95),
('96', 'Miscellaneous manufactured articles', '雑品', 20, 'SECTION XX', 96),

-- Section XXI (97)
('97', 'Works of art, collectors pieces', '美術品、収集品', 21, 'SECTION XXI', 97),

-- Special Chapters
('98', 'Special classification provisions', '特殊分類物品', 22, 'SPECIAL', 98),
('99', 'Special import provisions', '特殊輸入物品', 22, 'SPECIAL', 99);

-- 確認
SELECT COUNT(*) as total FROM hts_codes_chapters;
SELECT chapter_code, title_japanese FROM hts_codes_chapters ORDER BY sort_order LIMIT 10;
