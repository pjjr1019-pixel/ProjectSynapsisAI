import { jsx as _jsx } from "react/jsx-runtime";
import { Input } from "../../../shared/components/Input";
export function MemorySearch({ query, onChange }) {
    return (_jsx(Input, { value: query, placeholder: "Search memory", onChange: (event) => void onChange(event.target.value) }));
}
