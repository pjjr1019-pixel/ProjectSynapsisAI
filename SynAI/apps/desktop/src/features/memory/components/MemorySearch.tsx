import { Input } from "../../../shared/components/Input";

interface MemorySearchProps {
  query: string;
  onChange: (query: string) => Promise<void>;
}

export function MemorySearch({ query, onChange }: MemorySearchProps) {
  return (
    <Input
      value={query}
      placeholder="Search memory"
      onChange={(event) => void onChange(event.target.value)}
    />
  );
}
