---
name: Radix Select + react-hook-form async reset
description: A shadcn/Radix Select bound to react-hook-form via Controller can silently show the placeholder instead of the loaded value when the value arrives asynchronously (e.g. an edit form populated by form.reset() after an API fetch resolves), even though form.getValues()/field.value is provably correct in JS.
---

## Symptom
On an edit form where `useForm` starts with an empty default (e.g. `gender: ""`) and a `useEffect` calls `form.reset({...fetchedData})` once the record loads, every plain `<Input {...field} />` reflects the new value correctly, but a shadcn `<Select value={field.value} onValueChange={field.onChange}>` keeps showing its placeholder — the SelectValue never updates to the real string, even though logging `field.value` / `form.getValues()` at that exact render proves the value is correct.

## Why
Radix's `Select.Root` / `Select.Value` internals don't always resync their own controlled display when the `value` prop transitions from an initial value (e.g. `""`) to a real one purely via React prop diffing in this combination (Controller + async reset). The underlying form state is correct; only the visual trigger fails to reflect it.

## How to apply
Force the Select to remount when its bound value changes by keying it off the field value:
```tsx
<Select key={field.value || "unset"} value={field.value} onValueChange={field.onChange}>
```
This guarantees the trigger always re-derives its displayed label from a fresh mount. Apply this pattern to any shadcn `Select` inside a react-hook-form `Controller`/`FormField` on a form whose initial values are populated asynchronously after mount (edit/detail pages), not just simple create forms.
