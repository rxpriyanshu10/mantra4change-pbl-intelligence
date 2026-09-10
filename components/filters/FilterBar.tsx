"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, useCallback } from "react";

type FilterBarProps = {
  options: {
    months: string[];
    districts: string[];
    blocks: string[];
    grades: string[];
    subjects: string[];
    blocksByDistrict: Record<string, string[]>;
  };
};

export default function FilterBar({ options }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "All") {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleSelect = (name: string) => (e: ChangeEvent<HTMLSelectElement>) => {
    router.push("?" + createQueryString(name, e.target.value));
  };

  const currentMonth = searchParams.get("month") || options.months[0] || "All";
  const currentDistrict = searchParams.get("district") || "All";

  // Scope block options to the selected district to prevent invalid combinations.
  // If no district is selected ("All"), show all blocks.
  const visibleBlocks =
    currentDistrict !== "All" && options.blocksByDistrict[currentDistrict]
      ? options.blocksByDistrict[currentDistrict]
      : options.blocks;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap gap-4 border border-slate-100">
      <div className="flex flex-col">
        <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Month</label>
        <select
          value={currentMonth}
          onChange={handleSelect("month")}
          className="border border-slate-200 rounded-md py-1.5 px-3 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="All">All Months</option>
          {options.months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">District</label>
        <select
          value={searchParams.get("district") || "All"}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            const newDistrict = e.target.value;
            const params = new URLSearchParams(searchParams.toString());

            // Set or clear the district param
            if (newDistrict && newDistrict !== "All") {
              params.set("district", newDistrict);
            } else {
              params.delete("district");
            }

            // Clear block if it does not belong to the new district.
            // When newDistrict is "All", always clear block for a clean state.
            const currentBlock = params.get("block");
            if (currentBlock) {
              const blocksForNewDistrict =
                newDistrict !== "All" ? (options.blocksByDistrict[newDistrict] ?? []) : [];
              if (!blocksForNewDistrict.includes(currentBlock)) {
                params.delete("block");
              }
            }

            router.push("?" + params.toString());
          }}
          className="border border-slate-200 rounded-md py-1.5 px-3 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="All">All Districts</option>
          {options.districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>


      <div className="flex flex-col">
        <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Block</label>
        <select
          value={searchParams.get("block") || "All"}
          onChange={handleSelect("block")}
          className="border border-slate-200 rounded-md py-1.5 px-3 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="All">All Blocks</option>
          {visibleBlocks.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Grade</label>
        <select
          value={searchParams.get("grade") || "All"}
          onChange={handleSelect("grade")}
          className="border border-slate-200 rounded-md py-1.5 px-3 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="All">All Grades</option>
          {options.grades.map((g) => (
            <option key={g} value={g}>
              Class {g}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Subject</label>
        <select
          value={searchParams.get("subject") || "All"}
          onChange={handleSelect("subject")}
          className="border border-slate-200 rounded-md py-1.5 px-3 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="All">All Subjects</option>
          {options.subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
