import { Field } from './Input';
import { Select } from './Select';

export type OrderingField =
  'title' | 'price' | 'order' | 'created_at' | 'updated_at';

export function OrderingSelect({
  id,
  value,
  fields,
  onChange,
}: {
  id: string;
  value: string;
  fields: readonly OrderingField[];
  onChange: (value: string) => void;
}) {
  const labels: Record<OrderingField, [string, string]> = {
    title: ['Title: A–Z', 'Title: Z–A'],
    price: ['Price: Low to high', 'Price: High to low'],
    order: ['Order: Low to high', 'Order: High to low'],
    created_at: ['Oldest first', 'Newest first'],
    updated_at: ['Least recently updated', 'Most recently updated'],
  };
  const options = [
    { value: '', label: 'Default ordering' },
    ...fields.flatMap((field) => [
      { value: field, label: labels[field][0] },
      { value: `-${field}`, label: labels[field][1] },
    ]),
  ];
  return (
    <Field label="Ordering" htmlFor={id}>
      <Select
        id={id}
        label="Ordering"
        value={value}
        onChange={onChange}
        options={options}
      />
    </Field>
  );
}
