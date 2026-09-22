"use client";

import { useRouter } from "next/navigation";
import { useInventory } from "@/components/InventoryProvider";
import { FooterNav, NoSelectedCategories, PageIntro } from "@/components/PageBits";
import { IconPencil, IconTick } from "@/components/NavIcons";
import { includedCategories, methodLabel } from "@/data/protocol";
import { itemHasCalcInput, storedMethodItems } from "@/lib/inventory-method";

function StepMark({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <span className="step-mark" data-done={done ? "true" : "false"} title={`${label}: ${detail}`}>
      {done ? <IconTick /> : <span className="step-mark-dash" aria-hidden>–</span>}
      <span className="step-mark-text">{detail}</span>
    </span>
  );
}

export function CollectionTable() {
  const router = useRouter();
  const { state, setActiveCategory } = useInventory();
  const selected = includedCategories(state.categories);

  if (selected.length === 0) return <NoSelectedCategories />;

  const openCategory = (categoryId: number) => {
    setActiveCategory(categoryId);
    router.push(`/activity?cat=${categoryId}`);
  };

  return (
    <>
      <PageIntro
        kicker="Data collection"
        title="Activity data"
        body="Open a category to choose a calculation method, enter activity data, and pick an emission factor on each item. A tick appears after you save. Dashes mean that step is still empty."
      />
      <div className="panel collection-panel">
        <div className="collection-scroll">
          <table className="collection-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Calculation method</th>
                <th>Activity data</th>
                <th>Emission factors</th>
                <th>
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {selected.map((category) => {
                const entry = state.entries[category.id];
                const methodGroups = entry
                  ? storedMethodItems(entry).filter((group) => group.items.some(itemHasCalcInput))
                  : [];
                const method =
                  methodGroups.map((group) => methodLabel(category.id, group.method)).filter(Boolean).join(" + ") ||
                  (entry?.method ? methodLabel(category.id, entry.method) : "");
                const itemCount = methodGroups.reduce((sum, group) => sum + group.items.filter(itemHasCalcInput).length, 0) ||
                  (entry?.items.length ?? 0);
                return (
                  <tr key={category.id}>
                    <td>
                      <p className="collection-cat-id">Category {category.id}</p>
                      <p className="collection-cat-name">{category.name}</p>
                    </td>
                    <td>
                      <StepMark
                        done={Boolean(entry?.methodDone)}
                        label="Calculation method"
                        detail={entry?.methodDone && method ? method : "Not started"}
                      />
                    </td>
                    <td>
                      <StepMark
                        done={Boolean(entry?.activityDone)}
                        label="Activity data"
                        detail={entry?.activityDone ? (itemCount === 1 ? "1 item saved" : `${itemCount} items saved`) : "Not started"}
                      />
                    </td>
                    <td>
                      <StepMark
                        done={Boolean(entry?.factorsDone)}
                        label="Emission factors"
                        detail={entry?.factorsDone ? "Saved" : "Not started"}
                      />
                    </td>
                    <td className="collection-edit-cell">
                      <button
                        type="button"
                        className="row-edit"
                        aria-label={`Enter data for category ${category.id}, ${category.name}`}
                        onClick={() => openCategory(category.id)}
                      >
                        <IconPencil />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <FooterNav back="/categories" next="/results" nextLabel="Calculate" />
    </>
  );
}
