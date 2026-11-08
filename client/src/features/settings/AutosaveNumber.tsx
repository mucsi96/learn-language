import { useState } from 'react';
import { NumberField } from '@mucsi96/react-ui';
import { useAction } from '../../api/mutations';

export function AutosaveNumber({
  label,
  value,
  save,
  description,
}: {
  label: string;
  value: number;
  save: (value: number) => Promise<unknown>;
  description?: string;
}) {
  const [number, setNumber] = useState(value);
  const update = useAction(save);
  const valid = Number.isInteger(number) && number >= 0;
  return (
    <NumberField
      label={label}
      minValue={0}
      step={1}
      isRequired
      value={number}
      onChange={(next) => {
        setNumber(next);
        if (Number.isInteger(next) && next >= 0 && next !== value) update.mutate(next);
      }}
      description={description}
      isDisabled={update.isPending}
      validationBehavior="aria"
      error={!valid ? 'Enter a whole number greater than or equal to zero.' : undefined}
    />
  );
}
