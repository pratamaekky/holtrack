import { useRef } from "react";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";

export interface SelectComboboxOption<TValue extends string> {
	label: string;
	value: TValue;
}

interface SelectComboboxProps<TValue extends string> {
	ariaLabel: string;
	onChange: (value: TValue) => void;
	options: SelectComboboxOption<TValue>[];
	placeholder: string;
	value: TValue;
}

export default function SelectCombobox<TValue extends string>({
	ariaLabel,
	onChange,
	options,
	placeholder,
	value,
}: SelectComboboxProps<TValue>) {
	const portalContainerRef = useRef<HTMLDivElement>(null);
	const selectedOption = options.find((option) => option.value === value) ?? null;

	return (
		<div ref={portalContainerRef}>
			<Combobox
				value={selectedOption}
				items={options}
				itemToStringLabel={(option) => option.label}
				isItemEqualToValue={(option, selected) => option.value === selected.value}
				onValueChange={(option) => {
					if (option) {
						onChange(option.value);
					}
				}}
			>
				<ComboboxInput
					aria-label={ariaLabel}
					className="w-full"
					placeholder={placeholder}
					readOnly
				/>
				<ComboboxContent portalContainer={portalContainerRef}>
					<ComboboxEmpty>No options.</ComboboxEmpty>
					<ComboboxList>
						{options.map((option) => (
							<ComboboxItem key={option.value} value={option}>
								{option.label}
							</ComboboxItem>
						))}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
		</div>
	);
}
