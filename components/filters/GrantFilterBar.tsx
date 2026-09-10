"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, useCallback } from "react";

export default function GrantFilterBar({ options }: { options: { grantIds: string[]; months: string[] } }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(name, value);
      else params.delete(name);
      return params.toString();
    },
    [searchParams]
  );

  const handleSelect = (name: string) => (e: ChangeEvent<HTMLSelectElement>) => {
    router.push("?" + createQueryString(name, e.target.value));
  };

  const currentGrantId = searchParams.get("grantId") || options.grantIds[0] || "";
  const currentMonth = searchParams.get("month") || options.months[0] || "";

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex gap-4 border border-slate-100">
      <div className="flex flex-col">
        <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Grant</label>
        <select
          value={currentGrantId}
          onChange={handleSelect("grantId")}
          className="border border-slate-200 rounded-md py-1.5 px-3 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {options.grantIds.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Month</label>
        <select
          value={currentMonth}
          onChange={handleSelect("month")}
          className="border border-slate-200 rounded-md py-1.5 px-3 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {options.months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
