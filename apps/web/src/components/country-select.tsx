import { groupedCountries } from "@/lib/corridors";
import { Select } from "@/components/ui/select";
import { SelectHTMLAttributes } from "react";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function CountrySelect({
  label,
  allowEmpty,
  emptyLabel = "Select country",
  ...props
}: Props) {
  return (
    <Select label={label} {...props}>
      {allowEmpty ? <option value="">{emptyLabel}</option> : null}
      {groupedCountries().map(([region, countries]) => (
        <optgroup key={region} label={region}>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}
