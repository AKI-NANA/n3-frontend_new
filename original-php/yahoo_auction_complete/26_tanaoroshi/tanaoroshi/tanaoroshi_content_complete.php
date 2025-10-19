                            </td>
                            <td><input type="text" class="excel-cell" value="Wireless Gaming Mouse RGB LED 7 Buttons" /></td>
                            <td><input type="text" class="excel-cell" value="MS-WR70-001" /></td>
                            <td>
                                <select class="excel-select">
                                    <option value="stock" selected><?php echo safe_output('有在庫'); ?></option>
                                    <option value="dropship"><?php echo safe_output('無在庫'); ?></option>
                                    <option value="set"><?php echo safe_output('セット品'); ?></option>
                                    <option value="hybrid"><?php echo safe_output('ハイブリッド'); ?></option>
                                </select>
                            </td>
                            <td>
                                <select class="excel-select">
                                    <option value="new" selected><?php echo safe_output('新品'); ?></option>
                                    <option value="used"><?php echo safe_output('中古'); ?></option>
                                </select>
                            </td>
                            <td><input type="number" class="excel-cell" value="21.84" style="text-align: right;" step="0.01" /></td>
                            <td><input type="number" class="excel-cell" value="48" style="text-align: center;" /></td>
                            <td><input type="number" class="excel-cell" value="12.33" style="text-align: right;" step="0.01" /></td>
                            <td style="text-align: center; font-weight: 600; color: var(--color-success);">$9.51</td>
                            <td>
                                <div style="display: flex; gap: 2px;">
                                    <span style="padding: 1px 3px; background: #0064d2; color: white; border-radius: 2px; font-size: 0.6rem;">E</span>
                                    <span style="padding: 1px 3px; background: #96bf48; color: white; border-radius: 2px; font-size: 0.6rem;">S</span>
                                </div>
                            </td>
                            <td><input type="text" class="excel-cell" value="Electronics" /></td>
                            <td>
                                <div style="display: flex; gap: 2px;">
                                    <button class="excel-btn excel-btn--small" onclick="showProductDetail(1)" title="<?php echo safe_output('詳細'); ?>">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="excel-btn excel-btn--small" onclick="deleteProduct(1)" title="<?php echo safe_output('削除'); ?>" style="color: var(--color-danger);">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        <tr data-id="2">
                            <td><input type="checkbox" class="excel-checkbox product-checkbox" data-id="2" /></td>
                            <td>
                                <img src="https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=50&h=40&fit=crop" alt="<?php echo safe_output('商品画像'); ?>" style="width: 40px; height: 32px; object-fit: cover; border-radius: 4px;">
                            </td>
                            <td><input type="text" class="excel-cell" value="Gaming PC Accessories Bundle (3 Items)" /></td>
                            <td><input type="text" class="excel-cell" value="SET-PC01-003" /></td>
                            <td>
                                <select class="excel-select">
                                    <option value="stock"><?php echo safe_output('有在庫'); ?></option>
                                    <option value="dropship"><?php echo safe_output('無在庫'); ?></option>
                                    <option value="set" selected><?php echo safe_output('セット品'); ?></option>
                                    <option value="hybrid"><?php echo safe_output('ハイブリッド'); ?></option>
                                </select>
                            </td>
                            <td>
                                <select class="excel-select">
                                    <option value="new" selected><?php echo safe_output('新品'); ?></option>
                                    <option value="used"><?php echo safe_output('中古'); ?></option>
                                </select>
                            </td>
                            <td><input type="number" class="excel-cell" value="59.26" style="text-align: right;" step="0.01" /></td>
                            <td style="text-align: center; color: var(--text-secondary);">15<?php echo safe_output('セット'); ?></td>
                            <td><input type="number" class="excel-cell" value="37.96" style="text-align: right;" step="0.01" /></td>
                            <td style="text-align: center; font-weight: 600; color: var(--color-success);">$21.30</td>
                            <td>
                                <div style="display: flex; gap: 2px;">
                                    <span style="padding: 1px 3px; background: #0064d2; color: white; border-radius: 2px; font-size: 0.6rem;">E</span>
                                </div>
                            </td>
                            <td><input type="text" class="excel-cell" value="Bundle" /></td>
                            <td>
                                <div style="display: flex; gap: 2px;">
                                    <button class="excel-btn excel-btn--small excel-btn--warning" onclick="showProductDetail(2)" title="<?php echo safe_output('セット編集'); ?>">
                                        <i class="fas fa-layer-group"></i>
                                    </button>
                                    <button class="excel-btn excel-btn--small" onclick="showProductDetail(2)" title="<?php echo safe_output('詳細'); ?>">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="excel-pagination">
                <div class="excel-pagination__info">
                    <?php echo safe_output('商品: 1-25 / 1,284件表示'); ?>
                </div>
                <div class="excel-pagination__controls">
                    <button class="excel-btn excel-btn--small" disabled>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="excel-btn excel-btn--small" style="background: var(--excel-primary); color: white;">1</button>
                    <button class="excel-btn excel-btn--small">2</button>
                    <button class="excel-btn excel-btn--small">3</button>
                    <button class="excel-btn excel-btn--small">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
        
    </div>

<!-- N3準拠共通スクリプト -->
<script src="common/js/n3_core.js"></script>

<!-- N3準拠 - 外部JavaScript読み込み -->
<script src="common/js/pages/tanaoroshi_content_complete.js?v=<?php echo time(); ?>"></script>
</body>
</html>