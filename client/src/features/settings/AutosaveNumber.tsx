import { useState } from 'react';
import { TextField } from '@mucsi96/react-ui';
import { z } from 'zod';
import { useAction } from '../../api/mutations';

const numberSchema = z.string().trim().min(1).transform(Number).pipe(z.number().int().nonnegative());

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
  const [text, setText] = useState(String(value));
  const [touched, setTouched] = useState(false);
  const update = useAction(save);
  const parsed = numberSchema.safeParse(text);
  return (
    <TextField
      label={label}
      type="number"
      value={text}
      onChange={setText}
      description={description}
      isDisabled={update.isPending}
      validationBehavior="aria"
      isInvalid={touched && !parsed.success}
      error={touched && !parsed.success ? 'Enter a whole number greater than or equal to zero.' : undefined}
      onBlur={() => {
        setTouched(true);
        if (parsed.success && parsed.data !== value) update.mutate(parsed.data);
      }}
    />
  );
}
