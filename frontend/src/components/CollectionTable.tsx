"use client";

import { useRouter } from "next/navigation";
import { useInventory } from "@/components/InventoryProvider";
import { FooterNav, NoSelectedCategories, PageIntro } from "@/components/PageBits";
import { IconPencil, IconTick } from "@/components/NavIcons";
import { includedCategories } from "@/data/protocol";

function StepMark({ done, label }: { done: boolean; label: string }) {
  if (done) {
    return (
      <span className="step-mark" data-done="true" title={`${label} saved`}>
        <IconTick />
        <span className="sr-only">{label} saved</span>
      </span>
    );
  }
  return (
    <span className="step-mark" title={`${label} not started`}>
      –
      <span className="sr-only">{label} not started</span>
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
        body="Open a category to choose a calculation method and enter activity data, then continue to emission factors. A tick appears after you save each step. Dashes mean that step is still empty."
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
                return (
                  <tr key={category.id}>
                    <td>
                      <p className="collection-cat-id">Category {category.id}</p>
                      <p className="collection-cat-name">{category.name}</p>
                    </td>
                    <td>
                      <StepMark done={Boolean(entry?.methodDone)} label="Calculation method" />
                    </td>
                    <td>
                      <StepMark done={Boolean(entry?.activityDone)} label="Activity data" />
                    </td>
                    <td>
                      <StepMark done={Boolean(entry?.factorsDone)} label="Emission factors" />
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
