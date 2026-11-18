import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { ResilientImage } from '../../components/ResilientImage';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatFcfa } from '../../utils/format';
import type { MenuCategory, MenuItem } from '../../types';

export function MenuCatalogPage() {
  const { notify } = useToast();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
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

  const load = useCallback(() => {
    apiFetch<{ categories: MenuCategory[]; items: MenuItem[] }>(
      '/api/restaurant/menu',
    )
      .then((res) => {
        setCategories(res.categories);
        setItems(res.items);
        if (res.categories.length > 0 && !itemForm.categoryId) {
          setItemForm((f) => ({ ...f, categoryId: res.categories[0].id }));
        }
      })
      .catch(() => {});
  }, [itemForm.categoryId]);

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
      notify('Catégorie ajoutée.', 'success');
      setCatForm({ name: '', station: 'KITCHEN' });
      setShowCatForm(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/restaurant/menu/items', {
        method: 'POST',
        body: JSON.stringify(itemForm),
      });
      notify('Article ajouté au catalogue.', 'success');
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
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const toggleAvailable = async (item: MenuItem) => {
    try {
      await apiFetch(`/api/restaurant/menu/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ available: !item.available }),
      });
      notify(
        `${item.name} marqué ${!item.available ? 'disponible' : 'en rupture'}.`,
        'info',
      );
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  return (
    <RestaurantLayout
      title="Menu & Catalogue"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCatForm((v) => !v)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-[#182333] cursor-pointer"
          >
            + Catégorie
          </button>
          <button
            type="button"
            onClick={() => setShowItemForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel article</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {showCatForm && (
          <form
            onSubmit={handleCreateCat}
            className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap gap-4 items-end"
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold mb-1">
                Nom de la catégorie
              </label>
              <input
                required
                type="text"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Poste KDS
              </label>
              <select
                value={catForm.station}
                onChange={(e) =>
                  setCatForm({ ...catForm, station: e.target.value })
                }
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="KITCHEN">Cuisine</option>
                <option value="BAR">Bar</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-[#182333] text-white text-xs font-semibold cursor-pointer"
            >
              Enregistrer
            </button>
          </form>
        )}

        {showItemForm && (
          <form
            onSubmit={handleCreateItem}
            className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
          >
            <div>
              <label className="block text-xs font-semibold mb-1">
                Catégorie
              </label>
              <select
                value={itemForm.categoryId}
                onChange={(e) =>
                  setItemForm({ ...itemForm, categoryId: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Nom du plat / boisson
              </label>
              <input
                required
                type="text"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm({ ...itemForm, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Prix vente (FCFA)
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
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Coût matière (FCFA)
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
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer"
            >
              Ajouter au menu
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between"
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
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span>
                      {item.categoryName} ·{' '}
                      {item.station === 'BAR' ? 'Bar' : 'Cuisine'}
                    </span>
                    <span
                      className={`font-semibold ${
                        item.available ? 'text-[#14B8A6]' : 'text-[#E05252]'
                      }`}
                    >
                      {item.available ? 'Disponible' : 'Indisponible'}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-base font-bold text-[#182333]">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-xs text-[#64748B] line-clamp-2">
                    {item.description || 'Aucune description.'}
                  </p>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
                <span className="font-extrabold text-[#182333] text-sm tabular-nums">
                  {formatFcfa(item.priceXof)}
                </span>
                <button
                  type="button"
                  onClick={() => toggleAvailable(item)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    item.available
                      ? 'border border-slate-200 text-[#64748B] hover:text-[#E05252]'
                      : 'bg-[#14B8A6] text-white'
                  }`}
                >
                  {item.available ? 'Mettre en rupture' : 'Rendre disponible'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RestaurantLayout>
  );
}
