-- HTS Chapters 全99章データ投入SQL
-- Supabase SQL Editorで実行

INSERT INTO hts_codes_chapters (chapter_code, title_english, title_japanese, section_number, section_title, sort_order) VALUES
-- Section I: LIVE ANIMALS; ANIMAL PRODUCTS (01-05)
('01', 'Live animals', '生きている動物', 1, 'SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS', 1),
('02', 'Meat and edible meat offal', '肉及び食用のくず肉', 1, 'SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS', 2),
('03', 'Fish and crustaceans, molluscs and other aquatic invertebrates', '魚並びに甲殻類、軟体動物及びその他の水棲無脊椎動物', 1, 'SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS', 3),
('04', 'Dairy produce; birds'' eggs; natural honey; edible products of animal origin, not elsewhere specified or included', '酪農品、鳥卵、天然はちみつ及び他の類に該当しない食用の動物性生産品', 1, 'SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS', 4),
('05', 'Products of animal origin, not elsewhere specified or included', '動物性生産品（他の類に該当しないもの）', 1, 'SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS', 5),

-- Section II: VEGETABLE PRODUCTS (06-14)
('06', 'Live trees and other plants; bulbs, roots and the like; cut flowers and ornamental foliage', '生きている樹木その他の植物及びりん茎、根その他これらに類する物品並びに切花及び装飾用の葉', 2, 'SECTION II - VEGETABLE PRODUCTS', 6),
('07', 'Edible vegetables and certain roots and tubers', '食用の野菜、根及び塊茎', 2, 'SECTION II - VEGETABLE PRODUCTS', 7),
('08', 'Edible fruit and nuts; peel of citrus fruit or melons', '食用の果実及びナット、かんきつ類の果皮並びにメロンの皮', 2, 'SECTION II - VEGETABLE PRODUCTS', 8),
('09', 'Coffee, tea, mate and spices', 'コーヒー、茶、マテ及び香辛料', 2, 'SECTION II - VEGETABLE PRODUCTS', 9),
('10', 'Cereals', '穀物', 2, 'SECTION II - VEGETABLE PRODUCTS', 10),
('11', 'Products of the milling industry; malt; starches; inulin; wheat gluten', 'ばいせん工業の生産品、麦芽、でん粉、イヌリン及び小麦グルテン', 2, 'SECTION II - VEGETABLE PRODUCTS', 11),
('12', 'Oil seeds and oleaginous fruits; miscellaneous grains, seeds and fruit; industrial or medicinal plants; straw and fodder', '採油用の種及び果実、各種の種及び果実、工業用又は医薬用の植物並びにわら及び飼料用植物', 2, 'SECTION II - VEGETABLE PRODUCTS', 12),
('13', 'Lac; gums, resins and other vegetable saps and extracts', 'ラック並びにガム、樹脂その他の植物性の液汁及びエキス', 2, 'SECTION II - VEGETABLE PRODUCTS', 13),
('14', 'Vegetable plaiting materials; vegetable products not elsewhere specified or included', '植物性の組物材料及び他の類に該当しない植物性生産品', 2, 'SECTION II - VEGETABLE PRODUCTS', 14),

-- Section III: ANIMAL OR VEGETABLE FATS AND OILS (15)
('15', 'Animal or vegetable fats and oils and their cleavage products; prepared edible fats; animal or vegetable waxes', '動物性又は植物性の油脂及びその分解生産物、調製食用脂並びに動物性又は植物性のろう', 3, 'SECTION III - ANIMAL OR VEGETABLE FATS AND OILS', 15),

-- Section IV: PREPARED FOODSTUFFS (16-24)
('16', 'Preparations of meat, of fish or of crustaceans, molluscs or other aquatic invertebrates', '肉、魚又は甲殻類、軟体動物若しくはその他の水棲無脊椎動物の調製品', 4, 'SECTION IV - PREPARED FOODSTUFFS', 16),
('17', 'Sugars and sugar confectionery', '砂糖及び砂糖菓子', 4, 'SECTION IV - PREPARED FOODSTUFFS', 17),
('18', 'Cocoa and cocoa preparations', 'ココア及びその調製品', 4, 'SECTION IV - PREPARED FOODSTUFFS', 18),
('19', 'Preparations of cereals, flour, starch or milk; pastrycooks'' products', '穀物、穀粉、でん粉又はミルクの調製品及びベーカリー製品', 4, 'SECTION IV - PREPARED FOODSTUFFS', 19),
('20', 'Preparations of vegetables, fruit, nuts or other parts of plants', '野菜、果実、ナットその他植物の部分の調製品', 4, 'SECTION IV - PREPARED FOODSTUFFS', 20),
('21', 'Miscellaneous edible preparations', '各種の調製食料品', 4, 'SECTION IV - PREPARED FOODSTUFFS', 21),
('22', 'Beverages, spirits and vinegar', '飲料、アルコール及び食酢', 4, 'SECTION IV - PREPARED FOODSTUFFS', 22),
('23', 'Residues and waste from the food industries; prepared animal fodder', '食品工業において生ずる残留物及びくず並びに調製飼料', 4, 'SECTION IV - PREPARED FOODSTUFFS', 23),
('24', 'Tobacco and manufactured tobacco substitutes', 'たばこ及び製造たばこ代用品', 4, 'SECTION IV - PREPARED FOODSTUFFS', 24),

-- Section V: MINERAL PRODUCTS (25-27)
('25', 'Salt; sulfur; earths and stone; plastering materials, lime and cement', '塩、硫黄、土石類、プラスター、石灰及びセメント', 5, 'SECTION V - MINERAL PRODUCTS', 25),
('26', 'Ores, slag and ash', '鉱石、スラグ及び灰', 5, 'SECTION V - MINERAL PRODUCTS', 26),
('27', 'Mineral fuels, mineral oils and products of their distillation; bituminous substances; mineral waxes', '鉱物性燃料及び鉱物油並びにこれらの蒸留物、歴青物質並びに鉱物性ろう', 5, 'SECTION V - MINERAL PRODUCTS', 27),

-- Section VI: PRODUCTS OF THE CHEMICAL OR ALLIED INDUSTRIES (28-38)
('28', 'Inorganic chemicals; organic or inorganic compounds of precious metals, of rare-earth metals, of radioactive elements or of isotopes', '無機化学品及び貴金属、希土類金属、放射性元素又は同位元素の無機又は有機の化合物', 6, 'SECTION VI - PRODUCTS OF THE CHEMICAL OR ALLIED INDUSTRIES', 28),
('29', 'Organic chemicals', '有機化学品', 6, 'SECTION VI - PRODUCTS OF THE CHEMICAL OR ALLIED INDUSTRIES', 29),
('30', 'Pharmaceutical products', '医療用品', 6, 'SECTION VI - PRODUCTS OF THE CHEMICAL OR ALLIED INDUSTRIES', 30),
('31', 'Fertilizers', '肥料', 6, 'SECTION VI - PRODUCTS OF THE CHEMICAL OR ALLIED INDUSTRIES', 31),
('32', 'Tanning or dyeing extracts; tannins and their derivatives; dyes, pigments and other coloring matter; paints and varnishes; putty and other mastics; inks', 'なめしエキス、染色エキス、タンニン及びその誘導体、染料、顔料その他の着色料、ペイント、ワニス、パテその他のマスチック並びにインキ', 6, 'SECTION VI - PRODUCTS OF THE CHEMICAL OR ALLIED INDUSTRIES', 32),
('33', 'Essential oils and resinoids; perfumery, cosmetic or toilet preparations', '精油、レジノイド、調製香料及び化粧品類', 6, 'SECTION VI - PRODUCTS OF THE CHEMICAL OR ALLIED INDUSTRIES', 33),
('34', 'Soap, organic surface-active agents, washing preparations, lubricating preparations, artificial waxes, prepared waxes, polishing or scouring preparations, candles and similar articles, modeling pastes, dental waxes and dental preparations with a basis of plaster', 'せっけん、有機界面活性剤、洗剤、調製潤滑剤、人造ろう、調製ろう、磨き剤、ろうそくその他これに類する物品、モデリングペースト、歯科用ワックス及びプラスターをもととした歯科用の調製品', 6, 'SECTION VI - PRODUCTS OF THE CHEMICAL OR ALLIED INDUSTRIES', 34),
('35', 'Albuminoidal substances; modified starches; glues; enzymes', 'たんぱく系物質、変性でん粉、膠着剤及び酵素', 6, 'SECTION VI - PRODUCTS OF THE CHEMICAL OR ALLIED INDUSTRIES', 35),
('36', 'Explosives; pyrotechnic products; matches; pyrophoric alloys; certain combustible preparations', '火薬類、火工品、マッチ、発火性合金及び調製燃料', 6, 'SECTION VI - PRODUCTS OF THE CHEMICAL OR ALLIED INDUSTRIES', 36),
('37', 'Photographic or cinematographic goods', '写真用又は映画用の材料', 6, 'SECTION VI - PRODUCTS OF THE CHEMICAL OR ALLIED INDUSTRIES', 37),
('38', 'Miscellaneous chemical products', '各種の化学工業生産品', 6, 'SECTION VI - PRODUCTS OF THE CHEMICAL OR ALLIED INDUSTRIES', 38),

-- Section VII: PLASTICS AND RUBBER (39-40)
('39', 'Plastics and articles thereof', 'プラスチック及びその製品', 7, 'SECTION VII - PLASTICS AND RUBBER', 39),
('40', 'Rubber and articles thereof', 'ゴム及びその製品', 7, 'SECTION VII - PLASTICS AND RUBBER', 40),

-- Section VIII: RAW HIDES AND SKINS, LEATHER (41-43)
('41', 'Raw hides and skins (other than furskins) and leather', '原皮（毛皮を除く。）及び革', 8, 'SECTION VIII - RAW HIDES AND SKINS, LEATHER', 41),
('42', 'Articles of leather; saddlery and harness; travel goods, handbags and similar containers; articles of animal gut (other than silkworm gut)', '革製品及び動物用装着具並びに旅行用具、ハンドバッグその他これらに類する容器並びに腸の製品', 8, 'SECTION VIII - RAW HIDES AND SKINS, LEATHER', 42),
('43', 'Furskins and artificial fur; manufactures thereof', '毛皮及び人造毛皮並びにこれらの製品', 8, 'SECTION VIII - RAW HIDES AND SKINS, LEATHER', 43),

-- Section IX: WOOD AND ARTICLES OF WOOD (44-46)
('44', 'Wood and articles of wood; wood charcoal', '木材及びその製品並びに木炭', 9, 'SECTION IX - WOOD AND ARTICLES OF WOOD', 44),
('45', 'Cork and articles of cork', 'コルク及びその製品', 9, 'SECTION IX - WOOD AND ARTICLES OF WOOD', 45),
('46', 'Manufactures of straw, of esparto or of other plaiting materials; basketware and wickerwork', 'わら、エスパルトその他の組物材料の製品及びかご細工物並びに枝条細工物', 9, 'SECTION IX - WOOD AND ARTICLES OF WOOD', 46),

-- Section X: PULP OF WOOD, PAPER (47-49)
('47', 'Pulp of wood or of other fibrous cellulosic material; recovered (waste and scrap) paper or paperboard', '木材パルプその他の繊維素繊維を原料とするパルプ、古紙', 10, 'SECTION X - PULP OF WOOD, PAPER', 47),
('48', 'Paper and paperboard; articles of paper pulp, of paper or of paperboard', '紙及び板紙並びに製紙用パルプ、紙又は板紙の製品', 10, 'SECTION X - PULP OF WOOD, PAPER', 48),
('49', 'Printed books, newspapers, pictures and other products of the printing industry; manuscripts, typescripts and plans', '印刷した書籍、新聞、絵画その他の印刷物並びに手書き文書、タイプ文書、設計図及び図案', 10, 'SECTION X - PULP OF WOOD, PAPER', 49),

-- Section XI: TEXTILES AND TEXTILE ARTICLES (50-63)
('50', 'Silk', '絹及び絹織物', 11, 'SECTION XI - TEXTILES AND TEXTILE ARTICLES', 50),
('51', 'Wool, fine or coarse animal hair; horsehair yarn and woven fabric', '羊毛、繊獣毛、粗獣毛及び馬毛の糸並びにこれらの織物', 11, 'SECTION XI - TEXTILES AND TEXTILE ARTICLES', 51),
('52', 'Cotton', '綿及び綿織物', 11, 'SECTION XI - TEXTILES AND TEXTILE ARTICLES', 52),
('53', 'Other vegetable textile fibers; paper yarn and woven fabrics of paper yarn', 'その他の植物性紡織用繊維及びその織物並びに紙糸及びその織物', 11, 'SECTION XI - TEXTILES AND TEXTILE ARTICLES', 53),
('54', 'Man-made filaments; strip and the like of man-made textile materials', '人造繊維の長繊維並びに人造繊維の織物及びストリップその他これに類する人造繊維製品', 11, 'SECTION XI - TEXTILES AND TEXTILE ARTICLES', 54),
('55', 'Man-made staple fibers', '人造繊維の短繊維及びその織物', 11, 'SECTION XI - TEXTILES AND TEXTILE ARTICLES', 55),
('56', 'Wadding, felt and nonwovens; special yarns; twine, cordage, ropes and cables and articles thereof', 'ウォッディング、フェルト、不織布及び特殊糸並びにひも、綱、ケーブル及びこれらの製品', 11, 'SECTION XI - TEXTILES AND TEXTILE ARTICLES', 56),
('57', 'Carpets and other textile floor coverings', 'じゅうたんその他の紡織用繊維の床用敷物', 11, 'SECTION XI - TEXTILES AND TEXTILE ARTICLES', 57),
('58', 'Special woven fabrics; tufted textile fabrics; lace; tapestries; trimmings; embroidery', '特殊織物、タフテッド織物類、レース、つづれ織物、トリミング及びししゅう布', 11, 'SECTION XI - TEXTILES AND TEXTILE ARTICLES', 58),
('59', 'Impregnated, coated, covered or laminated textile fabrics; textile articles of a kind suitable for industrial use', '浸透、塗布、被覆又は積層した紡織用繊維の織物類及び工業用の紡織用繊維製品', 11, 'SECTION XI - TEXTILES AND TEXTILE ARTICLES', 59),
('60', 'Knitted or crocheted fabrics', 'メリヤス編物及びクロセ編物', 11, 'SECTION XI - TEXTILES AND TEXTILE ARTICLES', 60),
('61', 'Articles of apparel and clothing accessories, knitted or crocheted', '衣類及び衣類附属品（メリヤス編み又はクロセ編みのものに限る。）', 11, 'SECTION XI - TEXTILES AND TEXTILE ARTICLES', 61),
('62', 'Articles of apparel and clothing accessories, not knitted or crocheted', '衣類及び衣類附属品（メリヤス編み又はクロセ編みのものを除く。）', 11, 'SECTION XI - TEXTILES AND TEXTILE ARTICLES', 62),
('63', 'Other made up textile articles; sets; worn clothing and worn textile articles; rags', '紡織用繊維のその他の製品、セット、中古の衣類、紡織用繊維の中古の物品及びぼろ', 11, 'SECTION XI - TEXTILES AND TEXTILE ARTICLES', 63),

-- Section XII: FOOTWEAR, HEADGEAR (64-67)
('64', 'Footwear, gaiters and the like; parts of such articles', '履物及びゲートルその他これに類する物品並びにこれらの部分品', 12, 'SECTION XII - FOOTWEAR, HEADGEAR', 64),
('65', 'Headgear and parts thereof', '帽子及びその部分品', 12, 'SECTION XII - FOOTWEAR, HEADGEAR', 65),
('66', 'Umbrellas, sun umbrellas, walking-sticks, seat-sticks, whips, riding-crops and parts thereof', '傘、つえ、シートステッキ及びむち並びにこれらの部分品', 12, 'SECTION XII - FOOTWEAR, HEADGEAR', 66),
('67', 'Prepared feathers and down and articles made of feathers or of down; artificial flowers; articles of human hair', '羽毛及び綿毛を使用した物品並びに造花及び人髪製品', 12, 'SECTION XII - FOOTWEAR, HEADGEAR', 67),

-- Section XIII: ARTICLES OF STONE, PLASTER, CEMENT (68-70)
('68', 'Articles of stone, plaster, cement, asbestos, mica or similar materials', '石、プラスター、セメント、石綿、雲母その他これらに類する材料の製品', 13, 'SECTION XIII - ARTICLES OF STONE, PLASTER, CEMENT', 68),
('69', 'Ceramic products', '陶磁製品', 13, 'SECTION XIII - ARTICLES OF STONE, PLASTER, CEMENT', 69),
('70', 'Glass and glassware', 'ガラス及びその製品', 13, 'SECTION XIII - ARTICLES OF STONE, PLASTER, CEMENT', 70),

-- Section XIV: NATURAL OR CULTURED PEARLS, PRECIOUS STONES (71)
('71', 'Natural or cultured pearls, precious or semiprecious stones, precious metals, metals clad with precious metal, and articles thereof; imitation jewelry; coin', '天然又は養殖の真珠、貴石、半貴石、貴金属及び貴金属を張った金属並びにこれらの製品、身辺用模造細貨類並びに貨幣', 14, 'SECTION XIV - NATURAL OR CULTURED PEARLS, PRECIOUS STONES', 71),

-- Section XV: BASE METALS AND ARTICLES OF BASE METAL (72-83)
('72', 'Iron and steel', '鉄鋼', 15, 'SECTION XV - BASE METALS AND ARTICLES OF BASE METAL', 72),
('73', 'Articles of iron or steel', '鉄鋼製品', 15, 'SECTION XV - BASE METALS AND ARTICLES OF BASE METAL', 73),
('74', 'Copper and articles thereof', '銅及びその製品', 15, 'SECTION XV - BASE METALS AND ARTICLES OF BASE METAL', 74),
('75', 'Nickel and articles thereof', 'ニッケル及びその製品', 15, 'SECTION XV - BASE METALS AND ARTICLES OF BASE METAL', 75),
('76', 'Aluminum and articles thereof', 'アルミニウム及びその製品', 15, 'SECTION XV - BASE METALS AND ARTICLES OF BASE METAL', 76),
('78', 'Lead and articles thereof', '鉛及びその製品', 15, 'SECTION XV - BASE METALS AND ARTICLES OF BASE METAL', 78),
('79', 'Zinc and articles thereof', '亜鉛及びその製品', 15, 'SECTION XV - BASE METALS AND ARTICLES OF BASE METAL', 79),
('80', 'Tin and articles thereof', 'すず及びその製品', 15, 'SECTION XV - BASE METALS AND ARTICLES OF BASE METAL', 80),
('81', 'Other base metals; cermets; articles thereof', 'その他の卑金属、サーメット及びこれらの製品', 15, 'SECTION XV - BASE METALS AND ARTICLES OF BASE METAL', 81),
('82', 'Tools, implements, cutlery, spoons and forks, of base metal; parts thereof of base metal', '卑金属製の工具、道具、刃物、スプーン及びフォーク並びにこれらの部分品', 15, 'SECTION XV - BASE METALS AND ARTICLES OF BASE METAL', 82),
('83', 'Miscellaneous articles of base metal', '各種の卑金属製品', 15, 'SECTION XV - BASE METALS AND ARTICLES OF BASE METAL', 83),

-- Section XVI: MACHINERY AND MECHANICAL APPLIANCES (84-85)
('84', 'Nuclear reactors, boilers, machinery and mechanical appliances; parts thereof', '原子炉、ボイラー及び機械類並びにこれらの部分品', 16, 'SECTION XVI - MACHINERY AND MECHANICAL APPLIANCES', 84),
('85', 'Electrical machinery and equipment and parts thereof; sound recorders and reproducers, television image and sound recorders and reproducers, and parts and accessories of such articles', '電気機器及びその部分品並びに録音機、音声再生機並びにテレビジョンの映像及び音声の記録用又は再生用の機器並びにこれらの部分品及び附属品', 16, 'SECTION XVI - MACHINERY AND MECHANICAL APPLIANCES', 85),

-- Section XVII: VEHICLES, AIRCRAFT, VESSELS (86-89)
('86', 'Railway or tramway locomotives, rolling-stock and parts thereof; railway or tramway track fixtures and fittings and parts thereof; mechanical (including electro-mechanical) traffic signaling equipment of all kinds', '鉄道用又は軌道用の機関車及び車両並びにこれらの部分品、鉄道用又は軌道用の装備品及びその部分品並びに機械式交通信号用機器（電気機械式のものを含む。）', 17, 'SECTION XVII - VEHICLES, AIRCRAFT, VESSELS', 86),
('87', 'Vehicles other than railway or tramway rolling-stock, and parts and accessories thereof', '鉄道用及び軌道用以外の車両並びにその部分品及び附属品', 17, 'SECTION XVII - VEHICLES, AIRCRAFT, VESSELS', 87),
('88', 'Aircraft, spacecraft, and parts thereof', '航空機及び宇宙飛行体並びにこれらの部分品', 17, 'SECTION XVII - VEHICLES, AIRCRAFT, VESSELS', 88),
('89', 'Ships, boats and floating structures', '船舶及び浮き構造物', 17, 'SECTION XVII - VEHICLES, AIRCRAFT, VESSELS', 89),

-- Section XVIII: OPTICAL, PHOTOGRAPHIC, CINEMATOGRAPHIC (90-92)
('90', 'Optical, photographic, cinematographic, measuring, checking, precision, medical or surgical instruments and apparatus; parts and accessories thereof', '光学機器、写真用機器、映画用機器、測定機器、検査機器、精密機器及び医療用機器並びにこれらの部分品及び附属品', 18, 'SECTION XVIII - OPTICAL, PHOTOGRAPHIC, CINEMATOGRAPHIC', 90),
('91', 'Clocks and watches and parts thereof', '時計及びその部分品', 18, 'SECTION XVIII - OPTICAL, PHOTOGRAPHIC, CINEMATOGRAPHIC', 91),
('92', 'Musical instruments; parts and accessories of such articles', '楽器並びにその部分品及び附属品', 18, 'SECTION XVIII - OPTICAL, PHOTOGRAPHIC, CINEMATOGRAPHIC', 92),

-- Section XIX: ARMS AND AMMUNITION (93)
('93', 'Arms and ammunition; parts and accessories thereof', '武器及び銃砲弾並びにこれらの部分品及び附属品', 19, 'SECTION XIX - ARMS AND AMMUNITION', 93),

-- Section XX: MISCELLANEOUS MANUFACTURED ARTICLES (94-96)
('94', 'Furniture; bedding, mattresses, mattress supports, cushions and similar stuffed furnishings; lamps and lighting fittings, not elsewhere specified or included; illuminated signs, illuminated nameplates and the like; prefabricated buildings', '家具、寝具、マットレス、マットレスサポート、クッションその他これらに類する詰物をした物品並びにランプその他の照明器具（他の類に該当するものを除く。）及びイルミネーションサイン、発光ネームプレートその他これらに類する物品並びにプレハブ建築物', 20, 'SECTION XX - MISCELLANEOUS MANUFACTURED ARTICLES', 94),
('95', 'Toys, games and sports requisites; parts and accessories thereof', 'がん具、遊戯用具及び運動用具並びにこれらの部分品及び附属品', 20, 'SECTION XX - MISCELLANEOUS MANUFACTURED ARTICLES', 95),
('96', 'Miscellaneous manufactured articles', '雑品', 20, 'SECTION XX - MISCELLANEOUS MANUFACTURED ARTICLES', 96),

-- Section XXI: WORKS OF ART, COLLECTORS' PIECES AND ANTIQUES (97)
('97', 'Works of art, collectors'' pieces and antiques', '美術品、収集品及びこっとう品', 21, 'SECTION XXI - WORKS OF ART, COLLECTORS'' PIECES AND ANTIQUES', 97),

-- Special Chapters
('98', 'Special classification provisions', '特殊分類物品', 22, 'SPECIAL PROVISIONS', 98),
('99', 'Special import provisions', '特殊輸入物品', 22, 'SPECIAL PROVISIONS', 99)

ON CONFLICT (chapter_code) DO UPDATE SET
  title_english = EXCLUDED.title_english,
  title_japanese = EXCLUDED.title_japanese,
  section_number = EXCLUDED.section_number,
  section_title = EXCLUDED.section_title,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
