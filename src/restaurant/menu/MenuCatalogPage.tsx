import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Plus, Trash2, X } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { ResilientImage } from '../../components/ResilientImage';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatFcfa } from '../../utils/format';
import type {
  MenuCategory,
  MenuItem,
  MenuItemRecipeLine,
  StockItem,
} from '../../types';

interface DraftRecipeLine {
  stockId: string;
  stockName: string;
  unit: string;
  quantityPerUnit: number;
  unitCostXof: number;
  currentStockQty: number;
}

export function MenuCatalogPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);

  const [catForm, setCatForm] = useState({ name: '', station: 'KITCHEN' });
  const [itemForm, setItemForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    priceXof: 5000,
    costPriceXof: 2000,
  });

  const [recipeModalItem, setRecipeModalItem] = useState<MenuItem | null>(null);
  const [draftLines, setDraftLines] = useState<DraftRecipeLine[]>([]);
  const [addStockId, setAddStockId] = useState('');
  const [addQty, setAddQty] = useState<number>(0.2);
  const [savingRecipe, setSavingRecipe] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      apiFetch<{ categories: MenuCategory[]; items: MenuItem[] }>(
        '/api/restaurant/menu',
      ),
      apiFetch<{ stocks: StockItem[] }>('/api/restaurant/stocks').catch(() => ({
        stocks: [] as StockItem[],
      })),
    ])
      .then(([res, sRes]) => {
        setCategories(res.categories);
        setItems(res.items);
        setStocks(sRes.stocks);
        if (res.categories.length > 0 && !itemForm.categoryId) {
          setItemForm((f) => ({ ...f, categoryId: res.categories[0].id }));
        }
        if (sRes.stocks.length > 0 && !addStockId) {
          setAddStockId(sRes.stocks[0].id);
        }
      })
      .catch(() => {});
  }, [addStockId, itemForm.categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/restaurant/menu/categories', {
        method: 'POST',
        body: JSON.stringify(catForm),
      });
      notify(t('menu.catAdded'), 'success');
      setCatForm({ name: '', station: 'KITCHEN' });
      setShowCatForm(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/restaurant/menu/items', {
        method: 'POST',
        body: JSON.stringify(itemForm),
      });
      notify(t('menu.itemAdded'), 'success');
      setItemForm((f) => ({
        ...f,
        name: '',
        description: '',
        priceXof: 5000,
        costPriceXof: 2000,
      }));
      setShowItemForm(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    }
  };

  const toggleAvailable = async (item: MenuItem) => {
    try {
      await apiFetch(`/api/restaurant/menu/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ available: !item.available }),
      });
      notify(
        !item.available
          ? t('menu.markedAvailable', { name: item.name })
          : t('menu.markedUnavailable', { name: item.name }),
        'info',
      );
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    }
  };

  const openRecipeModal = (item: MenuItem) => {
    setRecipeModalItem(item);
    const existing: DraftRecipeLine[] = (item.recipeLines || []).map(
      (l: MenuItemRecipeLine) => ({
        stockId: l.stockId,
        stockName: l.stockName,
        unit: l.unit,
        quantityPerUnit: l.quantityPerUnit,
        unitCostXof: l.unitCostXof,
        currentStockQty: l.currentStockQty,
      }),
    );
    setDraftLines(existing);
    if (stocks.length > 0) {
      const unused = stocks.find(
        (s) => !existing.some((line) => line.stockId === s.id),
      );
      setAddStockId((unused || stocks[0]).id);
    }
    setAddQty(0.2);
  };

  const handleAddDraftLine = () => {
    const stock = stocks.find((s) => s.id === addStockId);
    if (!stock || addQty <= 0) return;
    setDraftLines((prev) => {
      const idx = prev.findIndex((l) => l.stockId === stock.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantityPerUnit: Number(addQty),
        };
        return next;
      }
      return [
        ...prev,
        {
          stockId: stock.id,
          stockName: stock.name,
          unit: stock.unit,
          quantityPerUnit: Number(addQty),
          unitCostXof: stock.unitCostXof,
          currentStockQty: stock.quantity,
        },
      ];
    });
  };

  const handleSaveRecipe = async () => {
    if (!recipeModalItem) return;
    setSavingRecipe(true);
    try {
      await apiFetch(`/api/restaurant/menu/items/${recipeModalItem.id}/recipe`, {
        method: 'PUT',
        body: JSON.stringify({
          lines: draftLines.map((l) => ({
            stockId: l.stockId,
            quantityPerUnit: l.quantityPerUnit,
          })),
        }),
      });
      notify(t('menu.recipeSavedToast'), 'success');
      setRecipeModalItem(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    } finally {
      setSavingRecipe(false);
    }
  };

  const computedFoodCost = Math.round(
    draftLines.reduce(
      (sum, l) => sum + l.quantityPerUnit * (l.unitCostXof || 0),
      0,
    ),
  );

  return (
    <RestaurantLayout
      title={t('pages.menuTitle')}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCatForm((v) => !v)}
            className="px-3 py-2 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] hover:bg-[var(--rm-surface-hover)] text-xs font-semibold text-[var(--rm-ink)] cursor-pointer transition-colors"
          >
            {t('pages.newCategory')}
          </button>
          <button
            type="button"
            onClick={() => setShowItemForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('pages.newItem')}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {showCatForm && (
          <form
            onSubmit={handleCreateCat}
            className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 flex flex-wrap gap-4 items-end"
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('menu.catNameLabel')}
              </label>
              <input
                required
                type="text"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('menu.kdsStationLabel')}
              </label>
              <select
                value={catForm.station}
                onChange={(e) =>
                  setCatForm({ ...catForm, station: e.target.value })
                }
                className="px-3 py-2 rounded-lg border border-[var(--rm-border-input)] text-sm bg-[var(--rm-surface)] text-[var(--rm-ink)]"
              >
                <option value="KITCHEN">{t('common.kitchen')}</option>
                <option value="BAR">{t('common.bar')}</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-[#182333] dark:bg-[#223044] hover:bg-[#223044] dark:hover:bg-[#2D4059] dark:border dark:border-[var(--rm-border)] text-white text-xs font-semibold cursor-pointer"
            >
              {t('common.save')}
            </button>
          </form>
        )}

        {showItemForm && (
          <form
            onSubmit={handleCreateItem}
            className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('menu.categoryLabel')}
              </label>
              <select
                value={itemForm.categoryId}
                onChange={(e) =>
                  setItemForm({ ...itemForm, categoryId: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] text-sm bg-[var(--rm-surface)] text-[var(--rm-ink)]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('menu.itemNameLabel')}
              </label>
              <input
                required
                type="text"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm({ ...itemForm, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('menu.salePriceLabel')}
              </label>
              <input
                required
                type="number"
                min={0}
                value={itemForm.priceXof}
                onChange={(e) =>
                  setItemForm({
                    ...itemForm,
                    priceXof: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('menu.costPriceLabel')}
              </label>
              <input
                type="number"
                min={0}
                value={itemForm.costPriceXof}
                onChange={(e) =>
                  setItemForm({
                    ...itemForm,
                    costPriceXof: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm tabular-nums"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
            >
              {t('menu.addToMenuBtn')}
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const recipeCount = item.recipeLines?.length ?? 0;
            return (
              <div
                key={item.id}
                className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 w-full overflow-hidden bg-[#182333]">
                    <ResilientImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      fallbackTitle={item.name}
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between text-xs text-[var(--rm-ink-muted)]">
                      <span>
                        {item.categoryName} ·{' '}
                        {item.station === 'BAR'
                          ? t('common.bar')
                          : t('common.kitchen')}
                      </span>
                      <span
                        className={`font-semibold ${
                          item.available ? 'text-[#14B8A6]' : 'text-[#E05252]'
                        }`}
                      >
                        {item.available
                          ? t('menu.availableStatus')
                          : t('menu.unavailableStatus')}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-bold text-[var(--rm-ink)]">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--rm-ink-muted)] line-clamp-2">
                      {item.description || t('menu.noDescription')}
                    </p>
                    <p className="mt-2.5 text-[11px] font-medium text-[var(--rm-ink-muted)]">
                      {recipeCount > 0 ? (
                        <span className="text-[#14B8A6] font-semibold">
                          {t('menu.recipeCountBadge', { count: recipeCount })}
                        </span>
                      ) : (
                        t('menu.recipeUnlinkedBadge')
                      )}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-3.5 border-t border-[var(--rm-border-subtle)] flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-[var(--rm-ink)] text-sm tabular-nums">
                    {formatFcfa(item.priceXof)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid={`recipe-btn-${item.id}`}
                      onClick={() => openRecipeModal(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--rm-border)] text-[var(--rm-ink)] hover:border-[#FF8738] text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#FF8738]" />
                      <span>{t('menu.recipeBtn')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAvailable(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        item.available
                          ? 'border border-[var(--rm-border)] text-[var(--rm-ink-muted)] hover:text-[#E05252]'
                          : 'bg-[#14B8A6] text-white'
                      }`}
                    >
                      {item.available
                        ? t('menu.setOutBtn')
                        : t('menu.setAvailableBtn')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {recipeModalItem && (
        <div className="fixed inset-0 z-50 bg-[#0B1220]/70 flex items-center justify-center p-4">
          <div className="bg-[var(--rm-surface)] rounded-2xl border border-[var(--rm-border)] max-w-xl w-full p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--rm-ink)]">
                  {t('menu.recipeModalTitle', { name: recipeModalItem.name })}
                </h3>
                <p className="text-xs text-[var(--rm-ink-muted)] mt-0.5">
                  {t('menu.recipeModalSubtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecipeModalItem(null)}
                className="p-1.5 rounded-lg text-[var(--rm-ink-muted)] hover:text-[var(--rm-ink)] cursor-pointer"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {stocks.length > 0 && (
              <div className="flex flex-wrap gap-2 items-end p-3.5 rounded-xl bg-[var(--rm-surface-muted)] border border-[var(--rm-border)]">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[11px] font-semibold text-[var(--rm-ink)] mb-1">
                    {t('stocks.colIngredient')}
                  </label>
                  <select
                    value={addStockId}
                    onChange={(e) => setAddStockId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-xs"
                  >
                    <option value="">
                      {t('menu.selectIngredientPlaceholder')}
                    </option>
                    {stocks.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.quantity} {st.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="block text-[11px] font-semibold text-[var(--rm-ink)] mb-1">
                    {t('menu.qtyPerPortionLabel')}
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    step="0.05"
                    value={addQty}
                    onChange={(e) => setAddQty(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-xs tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddDraftLine}
                  className="px-3.5 py-2 rounded-lg bg-[#182333] dark:bg-[#223044] hover:bg-[#FF8738] text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  {t('menu.addIngredientLineBtn')}
                </button>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-2">
              {draftLines.length === 0 ? (
                <p className="text-xs text-[var(--rm-ink-muted)] py-4 text-center">
                  {t('menu.noRecipeLinesYet')}
                </p>
              ) : (
                draftLines.map((line) => (
                  <div
                    key={line.stockId}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--rm-border-subtle)] bg-[var(--rm-surface)] text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--rm-ink)]">
                        {line.stockName}
                      </p>
                      <p className="text-[11px] text-[var(--rm-ink-muted)] tabular-nums">
                        {t('menu.currentStockUnit', {
                          qty: line.currentStockQty,
                          unit: line.unit,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={0.01}
                        step="0.05"
                        value={line.quantityPerUnit}
                        onChange={(e) => {
                          const val = Math.max(0.01, Number(e.target.value) || 0);
                          setDraftLines((prev) =>
                            prev.map((p) =>
                              p.stockId === line.stockId
                                ? { ...p, quantityPerUnit: val }
                                : p,
                            ),
                          );
                        }}
                        className="w-20 px-2 py-1 rounded border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-right tabular-nums"
                      />
                      <span className="text-[var(--rm-ink-muted)] w-10">
                        {line.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftLines((prev) =>
                            prev.filter((p) => p.stockId !== line.stockId),
                          )
                        }
                        className="p-1 text-[#E05252] hover:bg-red-50 dark:hover:bg-red-950/30 rounded cursor-pointer"
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--rm-surface-muted)] border border-[var(--rm-border)] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-[var(--rm-ink-muted)]">
                  {t('menu.estimatedFoodCost')}{' '}
                </span>
                <strong className="text-[var(--rm-ink)] tabular-nums">
                  {formatFcfa(computedFoodCost)}
                </strong>
              </div>
              <div>
                <span className="text-[var(--rm-ink-muted)]">
                  {t('menu.marginEstimate')}{' '}
                </span>
                <strong className="text-[#14B8A6] tabular-nums">
                  {formatFcfa(
                    Math.max(0, recipeModalItem.priceXof - computedFoodCost),
                  )}
                </strong>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRecipeModalItem(null)}
                className="flex-1 py-2.5 rounded-lg border border-[var(--rm-border-input)] text-[var(--rm-ink)] hover:bg-[var(--rm-surface-hover)] text-xs font-semibold cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={savingRecipe}
                onClick={() => void handleSaveRecipe()}
                className="flex-1 py-2.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                {t('menu.saveRecipeBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}
